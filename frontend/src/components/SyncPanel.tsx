import { useState } from 'react';
import { Button, Modal, Table, Tag, Space, Statistic, Row, Col, message } from 'antd';
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { fetchSpeckleObjects, compareSyncData, SpeckleAssemblyData, SyncDiff } from '../services/speckleSync';
import { getAuthHeaders, hasPermission } from '../services/authZmk';

interface SyncPanelProps {
    speckleStreamId: string;
    speckleToken: string;
    onSyncComplete?: () => void;
}

export default function SyncPanel({ speckleStreamId, speckleToken, onSyncComplete }: SyncPanelProps) {
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
                  model(id: "f903a0aa61") {
                    versions(limit: 1) {
                      items {
                        id
                        createdAt
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
            const latestCommit = commitData.data?.project?.model?.versions?.items?.[0];

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

            setSpeckleData(speckleObjects);

            // 3. Получить текущие GUID из БД
            const dbRes = await fetch(`/api-zmk/assemblies?select=main_part_guid`);
            const dbData = await dbRes.json();
            const dbGuids = dbData.map((row: any) => row.main_part_guid);

            // 4. Сравнить
            const diff = compareSyncData(speckleObjects, dbGuids);
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
        let successCount = 0;
        let errorCount = 0;

        // Проверка прав
        if (!hasPermission('bim_manager')) {
            message.error('Недостаточно прав. Требуется роль BIM Менеджер или выше.');
            setLoading(false);
            return;
        }

        try {
            const authHeaders = getAuthHeaders();

            // Создать новые записи для добавленных элементов
            for (const item of syncDiff.added) {
                const res = await fetch('/api-zmk/assemblies', {
                    method: 'POST',
                    headers: {
                        ...authHeaders,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        main_part_guid: item.mainpartGuid,
                        assembly_guid: item.assemblyGuid,
                        mark: item.assemblyMark,
                        name: item.name,
                        weight_model_t: item.weight ? item.weight / 1000 : 0,
                        speckle_object_id: item.speckleObjectId,
                        sync_status: 'active'
                    })
                });

                if (res.ok) {
                    successCount++;
                } else {
                    errorCount++;
                    const errText = await res.text();
                    console.error(`POST error for ${item.mainpartGuid}:`, res.status, errText);
                }
            }

            // Пометить удалённые как deleted
            for (const guid of syncDiff.removed) {
                const res = await fetch(`/api-zmk/assemblies?main_part_guid=eq.${guid}`, {
                    method: 'PATCH',
                    headers: {
                        ...authHeaders,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ sync_status: 'deleted' })
                });

                if (!res.ok) {
                    errorCount++;
                    const errText = await res.text();
                    console.error(`PATCH error for ${guid}:`, res.status, errText);
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
