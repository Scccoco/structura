import { useState } from 'react';
import { Button, Modal, Table, Tag, Space, Statistic, Row, Col, message } from 'antd';
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import { fetchSpeckleElements, compareSyncData, SpeckleElementData, SyncDiff, DbElement, fetchCommits } from '../services/speckleSyncMost';

// Speckle конфиг
const SPECKLE_SERVER = 'https://speckle.structura-most.ru';
const MOST_TOKEN = 'b47015ff123fc23131070342b14043c1b8a657dfb7';

// API endpoint для Моста
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface SyncPanelMostProps {
    streamId: string;
    projectId?: number;  // ID проекта в БД public.projects
    onSyncComplete?: () => void;
}

export default function SyncPanelMost({ streamId, projectId, onSyncComplete }: SyncPanelMostProps) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [syncDiff, setSyncDiff] = useState<SyncDiff | null>(null);
    const [speckleData, setSpeckleData] = useState<SpeckleElementData[]>([]);
    const [resolvedProjectId, setResolvedProjectId] = useState<number | null>(projectId || null);

    /**
     * Получить или создать проект в БД по streamId
     */
    const getOrCreateProject = async (speckleStreamId: string, streamName: string): Promise<number> => {
        // 1. Проверить существует ли проект
        const checkRes = await fetch(`${API_URL}/projects?speckle_stream_id=eq.${speckleStreamId}&select=id`);
        const existing = await checkRes.json();

        if (existing.length > 0) {
            console.log('📂 Found existing project:', existing[0].id);
            return existing[0].id;
        }

        // 2. Создать новый проект
        const createRes = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                speckle_stream_id: speckleStreamId,
                name: streamName || `Проект ${speckleStreamId}`
            })
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`Failed to create project: ${errText}`);
        }

        const created = await createRes.json();
        console.log('📂 Created new project:', created[0].id);
        return created[0].id;
    };

    /**
     * Получить имя stream из Speckle
     */
    const fetchStreamName = async (): Promise<string> => {
        const query = `
            query GetStream {
                stream(id: "${streamId}") {
                    name
                }
            }
        `;

        const res = await fetch(`${SPECKLE_SERVER}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MOST_TOKEN}`
            },
            body: JSON.stringify({ query })
        });

        const data = await res.json();
        return data.data?.stream?.name || '';
    };

    const handleSync = async () => {
        setIsModalVisible(true);
        setLoading(true);

        try {
            // 0. Получить или создать проект
            let currentProjectId = resolvedProjectId;
            if (!currentProjectId) {
                const streamName = await fetchStreamName();
                currentProjectId = await getOrCreateProject(streamId, streamName);
                setResolvedProjectId(currentProjectId);
            }

            // 1. Получить последний коммит
            const commits = await fetchCommits(SPECKLE_SERVER, streamId, MOST_TOKEN, 1);

            if (commits.length === 0) {
                throw new Error('No commits found in stream');
            }

            const latestCommit = commits[0];
            console.log('📌 Latest commit:', latestCommit.id, latestCommit.message);

            // 2. Получить данные из Speckle
            const speckleElements = await fetchSpeckleElements(
                SPECKLE_SERVER,
                streamId,
                latestCommit.id,
                MOST_TOKEN
            );

            console.log('🔹 Speckle elements count:', speckleElements.length);
            setSpeckleData(speckleElements);

            // 3. Получить текущие элементы из БД (только для этого проекта)
            let dbUrl = `${API_URL}/elements?select=id,guid,speckle_object_id,name,element_type&project_id=eq.${currentProjectId}&sync_status=neq.deleted`;

            const dbRes = await fetch(dbUrl);
            if (!dbRes.ok) {
                throw new Error(`DB fetch failed: ${dbRes.status}`);
            }

            const dbElements: DbElement[] = await dbRes.json();
            console.log('🔹 DB elements count:', dbElements.length, '(project:', currentProjectId, ')');

            // 4. Сравнить
            const diff = compareSyncData(speckleElements, dbElements);
            console.log('📊 Diff result:', {
                added: diff.added.length,
                updated: diff.updated.length,
                removed: diff.removed.length,
                unchanged: diff.unchanged.length
            });
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

        try {
            const BATCH_SIZE = 500;
            let insertedCount = 0;
            let updatedCount = 0;
            let deletedCount = 0;

            // === BATCH INSERT для новых элементов ===
            if (syncDiff.added.length > 0) {
                console.log(`📦 Inserting ${syncDiff.added.length} new elements...`);

                const batchData = syncDiff.added.map(el => ({
                    guid: el.guid,
                    speckle_object_id: el.speckle_object_id,
                    name: el.name,
                    element_type: el.element_type,
                    profile: el.profile,
                    material: el.material,
                    weight_kg: el.weight_kg,
                    properties: el.properties,
                    status: 'new',
                    sync_status: 'active',
                    project_id: resolvedProjectId
                }));

                for (let i = 0; i < batchData.length; i += BATCH_SIZE) {
                    const batch = batchData.slice(i, i + BATCH_SIZE);

                    const res = await fetch(`${API_URL}/elements`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Prefer': 'resolution=merge-duplicates,return=minimal'
                        },
                        body: JSON.stringify(batch)
                    });

                    if (res.ok) {
                        insertedCount += batch.length;
                    } else {
                        const errText = await res.text();
                        console.error(`Insert batch error:`, res.status, errText);
                    }
                }
            }

            // === BATCH UPDATE для обновлённых элементов ===
            if (syncDiff.updated.length > 0) {
                console.log(`📦 Updating ${syncDiff.updated.length} elements...`);

                for (const el of syncDiff.updated) {
                    const res = await fetch(`${API_URL}/elements?guid=eq.${encodeURIComponent(el.guid)}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            speckle_object_id: el.speckle_object_id,
                            name: el.name,
                            element_type: el.element_type,
                            profile: el.profile,
                            material: el.material,
                            weight_kg: el.weight_kg,
                            properties: el.properties
                        })
                    });

                    if (res.ok) {
                        updatedCount++;
                    } else {
                        console.error(`Update error for ${el.guid}:`, await res.text());
                    }
                }
            }

            // === BATCH UPDATE для удалённых ===
            if (syncDiff.removed.length > 0) {
                console.log(`📦 Marking ${syncDiff.removed.length} elements as deleted...`);

                // PostgREST PATCH с IN
                const guidsParam = syncDiff.removed.map(g => `"${g}"`).join(',');
                const res = await fetch(`${API_URL}/elements?guid=in.(${guidsParam})`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ sync_status: 'deleted' })
                });

                if (res.ok) {
                    deletedCount = syncDiff.removed.length;
                } else {
                    console.error(`Delete batch error:`, await res.text());
                }
            }

            message.success(
                `Синхронизация завершена: +${insertedCount} новых, ~${updatedCount} обновлено, -${deletedCount} удалено`
            );

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
        { title: 'GUID', dataIndex: 'guid', key: 'guid', ellipsis: true, width: 150 },
        { title: 'Имя', dataIndex: 'name', key: 'name', ellipsis: true },
        { title: 'Тип', dataIndex: 'element_type', key: 'type', width: 150 },
        { title: 'Профиль', dataIndex: 'profile', key: 'profile', width: 120 },
        {
            title: 'Вес, кг', dataIndex: 'weight_kg', key: 'weight', width: 80,
            render: (w: number | undefined) => w ? w.toFixed(1) : '-'
        }
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
                title="Синхронизация элементов с Speckle"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                width={1000}
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
                            <Col span={6}>
                                <Statistic
                                    title="Новые"
                                    value={syncDiff.added.length}
                                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Обновлённые"
                                    value={syncDiff.updated.length}
                                    prefix={<EditOutlined style={{ color: '#1890ff' }} />}
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Удалённые"
                                    value={syncDiff.removed.length}
                                    prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                                />
                            </Col>
                            <Col span={6}>
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
                                    rowKey="guid"
                                    pagination={{ pageSize: 5 }}
                                    size="small"
                                    style={{ marginBottom: 16 }}
                                    scroll={{ x: 800 }}
                                />
                            </>
                        )}

                        {syncDiff.updated.length > 0 && (
                            <>
                                <h4>Обновлённые элементы ({syncDiff.updated.length})</h4>
                                <Table
                                    dataSource={syncDiff.updated}
                                    columns={addedColumns}
                                    rowKey="guid"
                                    pagination={{ pageSize: 5 }}
                                    size="small"
                                    style={{ marginBottom: 16 }}
                                    scroll={{ x: 800 }}
                                />
                            </>
                        )}

                        {syncDiff.removed.length > 0 && (
                            <>
                                <h4>Удалённые элементы ({syncDiff.removed.length})</h4>
                                <Space wrap style={{ marginBottom: 16 }}>
                                    {syncDiff.removed.slice(0, 10).map(guid => (
                                        <Tag key={guid} color="red">{guid.slice(0, 20)}...</Tag>
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
