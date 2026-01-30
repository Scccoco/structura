import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Select, Table, Button, Spin, Typography, Tag, Space, Statistic, Row, Col, message } from 'antd';
import { BuildOutlined, PlusOutlined, ReloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

import { API_URL } from '../../shared/apiUrl';

interface ElementProperty {
    key: string;
    count: number;
}

interface PropertyValue {
    value: string;
    count: number;
    sampleNames: string[];
}

export default function ConstructionsPage() {
    const { streamId } = useParams<{ streamId: string }>();
    const [loading, setLoading] = useState(false);
    const [elements, setElements] = useState<any[]>([]);
    const [propertyKeys, setPropertyKeys] = useState<ElementProperty[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [propertyValues, setPropertyValues] = useState<PropertyValue[]>([]);
    const [projectId, setProjectId] = useState<number | null>(null);

    // Получить project_id по streamId
    const fetchProjectId = async () => {
        if (!streamId) return;
        try {
            const res = await fetch(`${API_URL}/projects?speckle_stream_id=eq.${streamId}&select=id`);
            const data = await res.json();
            if (data.length > 0) {
                setProjectId(data[0].id);
                return data[0].id;
            }
        } catch (error) {
            console.error('Failed to fetch project:', error);
        }
        return null;
    };

    // Загрузить элементы
    const fetchElements = async (projId?: number) => {
        setLoading(true);
        try {
            let url = `${API_URL}/elements?select=guid,name,element_type,properties&sync_status=neq.deleted&limit=5000`;
            if (projId) {
                url += `&project_id=eq.${projId}`;
            }

            const res = await fetch(url);
            const data = await res.json();
            setElements(data);

            // Собрать уникальные ключи свойств
            const keysMap = new Map<string, number>();

            for (const el of data) {
                if (el.properties && typeof el.properties === 'object') {
                    for (const key of Object.keys(el.properties)) {
                        // Пропускаем вложенные объекты, берём только примитивы
                        const val = el.properties[key];
                        if (val !== null && typeof val !== 'object') {
                            keysMap.set(key, (keysMap.get(key) || 0) + 1);
                        }
                    }
                }
            }

            const keys = Array.from(keysMap.entries())
                .map(([key, count]) => ({ key, count }))
                .sort((a, b) => b.count - a.count);

            setPropertyKeys(keys);
            console.log('📊 Found property keys:', keys.length);

        } catch (error: any) {
            message.error(`Ошибка загрузки: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // При выборе ключа — собрать уникальные значения
    useEffect(() => {
        if (!selectedKey || elements.length === 0) {
            setPropertyValues([]);
            return;
        }

        const valuesMap = new Map<string, { count: number; sampleNames: string[] }>();

        for (const el of elements) {
            const val = el.properties?.[selectedKey];
            if (val !== undefined && val !== null && typeof val !== 'object') {
                const strVal = String(val);
                const existing = valuesMap.get(strVal);
                if (existing) {
                    existing.count++;
                    if (existing.sampleNames.length < 3) {
                        existing.sampleNames.push(el.name);
                    }
                } else {
                    valuesMap.set(strVal, { count: 1, sampleNames: [el.name] });
                }
            }
        }

        const values = Array.from(valuesMap.entries())
            .map(([value, data]) => ({ value, count: data.count, sampleNames: data.sampleNames }))
            .sort((a, b) => b.count - a.count);

        setPropertyValues(values);
    }, [selectedKey, elements]);

    // Начальная загрузка
    useEffect(() => {
        const init = async () => {
            const projId = await fetchProjectId();
            await fetchElements(projId || undefined);
        };
        init();
    }, [streamId]);

    const columns = [
        {
            title: 'Значение',
            dataIndex: 'value',
            key: 'value',
            render: (val: string) => <Tag color="blue">{val || '(пусто)'}</Tag>
        },
        {
            title: 'Элементов',
            dataIndex: 'count',
            key: 'count',
            width: 100,
            sorter: (a: PropertyValue, b: PropertyValue) => a.count - b.count,
        },
        {
            title: 'Примеры',
            dataIndex: 'sampleNames',
            key: 'samples',
            render: (names: string[]) => (
                <Text type="secondary" ellipsis style={{ maxWidth: 300 }}>
                    {names.join(', ')}
                </Text>
            )
        },
        {
            title: 'Действие',
            key: 'action',
            width: 180,
            render: (_: any, record: PropertyValue) => (
                <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => message.info(`TODO: Создать конструкцию "${record.value}" с правилом ${selectedKey}=${record.value}`)}
                >
                    Создать
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <Space style={{ marginBottom: 16 }}>
                <Link to={`/projects/${streamId}/viewer`}>
                    <Button icon={<ArrowLeftOutlined />}>К вьюеру</Button>
                </Link>
            </Space>

            <Title level={2}>
                <BuildOutlined /> Конструкции
            </Title>

            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Создавайте стабильные конструкции на основе свойств элементов модели
            </Text>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card size="small">
                        <Statistic title="Элементов загружено" value={elements.length} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small">
                        <Statistic title="Свойств найдено" value={propertyKeys.length} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small">
                        <Statistic
                            title="Уникальных значений"
                            value={propertyValues.length}
                            suffix={selectedKey ? `по ${selectedKey}` : ''}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                title="Шаг 1: Выберите свойство для группировки"
                extra={
                    <Button icon={<ReloadOutlined />} onClick={() => fetchElements(projectId || undefined)} loading={loading}>
                        Обновить
                    </Button>
                }
                style={{ marginBottom: 24 }}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Select
                        style={{ width: '100%' }}
                        placeholder="Выберите свойство..."
                        loading={loading}
                        showSearch
                        value={selectedKey}
                        onChange={setSelectedKey}
                        options={propertyKeys.map(p => ({
                            value: p.key,
                            label: (
                                <Space>
                                    <span>{p.key}</span>
                                    <Tag>{p.count} элементов</Tag>
                                </Space>
                            )
                        }))}
                    />

                    {selectedKey && (
                        <Text type="secondary">
                            Свойство <Tag>{selectedKey}</Tag> имеет {propertyValues.length} уникальных значений
                        </Text>
                    )}
                </Space>
            </Card>

            {selectedKey && (
                <Card
                    title={`Шаг 2: Просмотр значений "${selectedKey}"`}
                    extra={
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => message.info(`TODO: Массовое создание ${propertyValues.length} конструкций`)}
                        >
                            Создать все как конструкции
                        </Button>
                    }
                >
                    <Table
                        dataSource={propertyValues}
                        columns={columns}
                        rowKey="value"
                        size="small"
                        pagination={{ pageSize: 20 }}
                        loading={loading}
                    />
                </Card>
            )}

            {loading && !elements.length && (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <Spin size="large" />
                    <p>Загрузка элементов...</p>
                </div>
            )}
        </div>
    );
}
