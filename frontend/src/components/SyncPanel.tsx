import { useState } from 'react';
import { Button, Modal, Table, Tag, Space, Statistic, Row, Col, message } from 'antd';
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { fetchSpeckleObjects, compareSyncData, SpeckleAssemblyData, SyncDiff } from '../services/speckleSync';
import { getAuthHeaders, hasPermission } from '../services/authZmk';

interface SyncPanelProps {
    speckleStreamId: string;
    speckleToken: string;
    projectId?: number;  // ID проекта для привязки сборок
    onSyncComplete?: () => void;
}

export default function SyncPanel({ speckleStreamId, speckleToken, projectId, onSyncComplete }: SyncPanelProps) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [syncDiff, setSyncDiff] = useState<SyncDiff | null>(null);
    const [speckleData, setSpeckleData] = useState<SpeckleAssemblyData[]>([]);

    const handleSync = async () => {
        setIsModalVisible(true);
        setLoading(true);

        try {
            // 1. Получить последний коммит
            const commitRes = await fetch(
                `https://speckle.structura-most.ru/graphql`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${speckleToken}`
                    },
                    body: JSON.stringify({
                        query: `
              query {
                project(id: "${speckleStreamId}") {
                  models(limit: 1) {
                    items {
                      id
                      name
                      versions(limit: 1) {
                        items {
                          id
                          createdAt
                        }
                      }
                    }
                  }
                }
              }
            `
                    })
                }
            );

            const commitData = await commitRes.json();
            console.log('📦 Commit data:', commitData);
            const latestModel = commitData.data?.project?.models?.items?.[0];
            const latestCommit = latestModel?.versions?.items?.[0];
            console.log('📌 Latest model:', latestModel?.name, latestModel?.id);
            console.log('📌 Latest commit:', latestCommit);

            if (!latestCommit) {
                throw new Error('No commits found');
            }

            // 2. Получить данные из Speckle
            const speckleObjects = await fetchSpeckleObjects(
                'https://speckle.structura-most.ru',
                speckleStreamId,
                latestCommit.id,
                speckleToken
            );

            console.log('🔹 Speckle objects count:', speckleObjects.length);
            console.log('🔹 Speckle objects:', speckleObjects);
            setSpeckleData(speckleObjects);

            // 3. Получить текущие GUID из БД (только для этого проекта, исключая удалённые)
            // Сначала определить project_id
            let currentProjectId = projectId;
            if (!currentProjectId) {
                const projectsRes = await fetch('/api-zmk/projects?select=id&limit=1');
                const projectsData = await projectsRes.json();
                currentProjectId = projectsData[0]?.id;
            }

            // Запрос с фильтрами: только активные сборки текущего проекта
            let dbUrl = '/api-zmk/assemblies?select=main_part_guid';
            if (currentProjectId) {
                dbUrl += `&project_id=eq.${currentProjectId}`;
            }
            dbUrl += '&sync_status=neq.deleted';

            const dbRes = await fetch(dbUrl);
            const dbData = await dbRes.json();
            const dbGuids = dbData.map((row: any) => row.main_part_guid).filter(Boolean);
            console.log('🔹 DB GUIDs count:', dbGuids.length, '(project:', currentProjectId, ')');
            console.log('🔹 DB GUIDs:', dbGuids);

            // 4. Сравнить
            const diff = compareSyncData(speckleObjects, dbGuids);
            console.log('📊 Diff result:', diff);
            setSyncDiff(diff);

        } catch (error: any) {
            message.error(`Ошибка синхронизации: ${error.message}`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplySync = async () => {
        if (!syncDiff || !speckleData) return;

        setLoading(true);

        // Проверка прав
        if (!hasPermission('bim_manager')) {
            message.error('Недостаточно прав. Требуется роль BIM Менеджер или выше.');
            setLoading(false);
            return;
        }

        try {
            const authHeaders = getAuthHeaders();

            // Автоопределение project_id если не передан
            let resolvedProjectId = projectId;
            if (!resolvedProjectId) {
                try {
                    const projectsRes = await fetch('/api-zmk/projects?select=id&limit=1');
                    const projectsData = await projectsRes.json();
                    if (projectsData.length > 0) {
                        resolvedProjectId = projectsData[0].id;
                        console.log('🔧 Auto-resolved project_id:', resolvedProjectId);
                    }
                } catch (e) {
                    console.warn('Could not auto-detect project_id:', e);
                }
            }

            const BATCH_SIZE = 1000; // PostgREST лимит на batch
            let successCount = 0;
            let errorCount = 0;

            // === BATCH INSERT для добавленных элементов ===
            if (syncDiff.added.length > 0) {
                console.log(`📦 Batch inserting ${syncDiff.added.length} assemblies...`);

                // Подготовить массив для вставки
                const batchData = syncDiff.added.map(item => ({
                    main_part_guid: item.mainpartGuid,
                    assembly_guid: item.assemblyGuid,
                    mark: item.assemblyMark,
                    name: item.name,
                    weight_model_t: item.weight ? item.weight / 1000 : 0,
                    speckle_object_id: item.speckleObjectId,
                    sync_status: 'active',
                    ...(resolvedProjectId && { project_id: resolvedProjectId })
                }));

                // Разбить на батчи если много записей
                for (let i = 0; i < batchData.length; i += BATCH_SIZE) {
                    const batch = batchData.slice(i, i + BATCH_SIZE);
                    console.log(`📦 Sending batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} items`);

                    const res = await fetch('/api-zmk/assemblies?on_conflict=main_part_guid', {
                        method: 'POST',
                        headers: {
                            ...authHeaders,
                            'Content-Type': 'application/json',
                            'Prefer': 'resolution=merge-duplicates,return=minimal'
                        },
                        body: JSON.stringify(batch)
                    });

                    if (res.ok) {
                        successCount += batch.length;
                    } else {
                        errorCount += batch.length;
                        const errText = await res.text();
                        console.error(`Batch POST error:`, res.status, errText);
                    }
                }
            }

            // === BATCH UPDATE для удалённых элементов ===
            if (syncDiff.removed.length > 0) {
                console.log(`📦 Marking ${syncDiff.removed.length} assemblies as deleted...`);

                // PostgREST поддерживает PATCH с IN для множественного обновления
                const guidsParam = syncDiff.removed.map(g => `"${g}"`).join(',');
                const res = await fetch(`/api-zmk/assemblies?main_part_guid=in.(${guidsParam})`, {
                    method: 'PATCH',
                    headers: {
                        ...authHeaders,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ sync_status: 'deleted' })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    console.error(`Batch PATCH error:`, res.status, errText);
                    errorCount += syncDiff.removed.length;
                }
            }

            if (errorCount > 0) {
                message.warning(`Частично: +${successCount} добавлено, ${errorCount} ошибок. Проверьте консоль.`);
            } else {
                message.success(`Синхронизация завершена: +${syncDiff.added.length} новых, ${syncDiff.removed.length} удалено`);
            }

            setIsModalVisible(false);
            onSyncComplete?.();

        } catch (error: any) {
            message.error(`Ошибка применения: ${error.message}`);
            console.error('Apply sync error:', error);
        } finally {
            setLoading(false);
        }
    };

    const addedColumns = [
        { title: 'Марка', dataIndex: 'assemblyMark', key: 'mark' },
        { title: 'Имя', dataIndex: 'name', key: 'name' },
        { title: 'Профиль', dataIndex: 'profile', key: 'profile' },
        { title: 'Вес, т', dataIndex: 'weight', key: 'weight', render: (w: number) => (w / 1000).toFixed(3) }
    ];

    return (
        <>
            <Button
                type="primary"
                icon={<SyncOutlined />}
                onClick={handleSync}
                loading={loading}
            >
                Синхронизировать с Speckle
            </Button>

            <Modal
                title="Синхронизация с Speckle"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                width={900}
                footer={[
                    <Button key="cancel" onClick={() => setIsModalVisible(false)}>
                        Отмена
                    </Button>,
                    <Button
                        key="apply"
                        type="primary"
                        loading={loading}
                        disabled={!syncDiff}
                        onClick={handleApplySync}
                    >
                        Применить изменения
                    </Button>
                ]}
            >
                {syncDiff && (
                    <>
                        <Row gutter={16} style={{ marginBottom: 24 }}>
                            <Col span={8}>
                                <Statistic
                                    title="Новые"
                                    value={syncDiff.added.length}
                                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Удалённые"
                                    value={syncDiff.removed.length}
                                    prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="Без изменений"
                                    value={syncDiff.unchanged.length}
                                />
                            </Col>
                        </Row>

                        {syncDiff.added.length > 0 && (
                            <>
                                <h4>Новые элементы ({syncDiff.added.length})</h4>
                                <Table
                                    dataSource={syncDiff.added}
                                    columns={addedColumns}
                                    rowKey="mainpartGuid"
                                    pagination={{ pageSize: 5 }}
                                    size="small"
                                    style={{ marginBottom: 16 }}
                                />
                            </>
                        )}

                        {syncDiff.removed.length > 0 && (
                            <>
                                <h4>Удалённые элементы ({syncDiff.removed.length})</h4>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    {syncDiff.removed.slice(0, 10).map(guid => (
                                        <Tag key={guid} color="red">{guid}</Tag>
                                    ))}
                                    {syncDiff.removed.length > 10 && (
                                        <Tag>и ещё {syncDiff.removed.length - 10}...</Tag>
                                    )}
                                </Space>
                            </>
                        )}
                    </>
                )}

                {loading && !syncDiff && (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <SyncOutlined spin style={{ fontSize: 48 }} />
                        <p>Загрузка данных из Speckle...</p>
                    </div>
                )}
            </Modal>
        </>
    );
}
