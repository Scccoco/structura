import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Card, Table, Button, Upload, Typography, Tag, Space, Statistic, Row, Col,
    message, Select, Spin
} from 'antd';
import {
    UploadOutlined, ArrowLeftOutlined, ReloadOutlined,
    BarChartOutlined, TableOutlined, DownOutlined, RightOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

const API_URL = import.meta.env.VITE_API_URL || 'https://api.structura-most.ru';

interface MaterialRow {
    id?: number;
    guid: string;
    name: string;
    position: string;
    floor: string;
    base_volume_model: number;
    estimate_number: string;
    section: string;
    estimate_construction: string;
    construction_1c: string;
    source: string;
    material_name: string;
    material_type: string;
    quantity: number;
    unit: string;
    document: string;
}

interface ConstructionAggregate {
    construction: string;
    rd_concrete: number;
    estimate_concrete: number;
    fact_concrete: number;
    rd_rebar: number;
    estimate_rebar: number;
    fact_rebar: number;
    diff_percent: number;
    guids: string[];
}

export default function MaterialsDashboard() {
    const { streamId } = useParams<{ streamId: string }>();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [materials, setMaterials] = useState<MaterialRow[]>([]);
    const [projectId, setProjectId] = useState<number | null>(null);
    const [selectedConstruction, setSelectedConstruction] = useState<string | null>(null);
    const [filterSource, setFilterSource] = useState<string | null>(null);
    const [filterFloor, setFilterFloor] = useState<string | null>(null);

    // Fetch project ID
    useEffect(() => {
        const fetchProjectId = async () => {
            if (!streamId) return;
            try {
                const res = await fetch(`${API_URL}/projects?speckle_stream_id=eq.${streamId}&select=id`);
                const data = await res.json();
                if (data.length > 0) {
                    setProjectId(data[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch project:', error);
            }
        };
        fetchProjectId();
    }, [streamId]);

    // Fetch materials
    const fetchMaterials = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/materials?project_id=eq.${projectId}&order=estimate_construction`);
            const data = await res.json();
            setMaterials(data);
            message.success(`Загружено ${data.length} записей`);
        } catch (error: any) {
            message.error(`Ошибка загрузки: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchMaterials();
        }
    }, [projectId]);

    // Parse Excel file
    const handleExcelUpload = async (file: File) => {
        if (!projectId) {
            message.error('Проект не найден');
            return false;
        }

        setUploading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            console.log('📊 Parsed Excel:', jsonData.length, 'rows');
            console.log('Sample row:', jsonData[0]);

            // Map Excel columns to DB columns
            const mappedData: Partial<MaterialRow>[] = jsonData.map((row: any) => ({
                guid: row['GUID_'] || row['GUID'] || '',
                name: row['Имя_'] || row['Имя'] || '',
                position: row['Позиция_'] || row['Позиция'] || '',
                floor: row['Этаж_'] || row['Этаж'] || '',
                base_volume_model: parseFloat(row['БазовыйОбъемМодель']) || undefined,
                estimate_number: row['НомерСметы'] || '',
                section: row['Раздел'] || '',
                estimate_construction: row['КонструкцияСметы'] || '',
                construction_1c: row['Конструкция1С'] || '',
                source: row['Источник'] || '',
                material_name: row['Наименование'] || '',
                material_type: row['ТипГруппы'] || '',
                quantity: parseFloat(row['Количество']) || undefined,
                unit: row['ЕдИзм'] || '',
                document: row['Документ'] || '',
                project_id: projectId
            })).filter((row: any) => row.guid); // Only rows with GUID

            console.log('📝 Mapped data:', mappedData.length, 'valid rows');

            // Batch insert to DB
            const batchSize = 500;
            let inserted = 0;

            for (let i = 0; i < mappedData.length; i += batchSize) {
                const batch = mappedData.slice(i, i + batchSize);
                const res = await fetch(`${API_URL}/materials`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify(batch)
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(`Batch ${i}-${i + batchSize}: ${errText}`);
                }
                inserted += batch.length;
            }

            message.success(`Загружено ${inserted} записей`);
            fetchMaterials();
        } catch (error: any) {
            console.error('Upload error:', error);
            message.error(`Ошибка загрузки: ${error.message}`);
        } finally {
            setUploading(false);
        }
        return false;
    };

    // Aggregate by construction
    const aggregates = useMemo<ConstructionAggregate[]>(() => {
        const constructions = new Map<string, ConstructionAggregate>();

        for (const m of materials) {
            if (filterFloor && m.floor !== filterFloor) continue;

            const key = m.estimate_construction || '(без конструкции)';
            let agg = constructions.get(key);

            if (!agg) {
                agg = {
                    construction: key,
                    rd_concrete: 0,
                    estimate_concrete: 0,
                    fact_concrete: 0,
                    rd_rebar: 0,
                    estimate_rebar: 0,
                    fact_rebar: 0,
                    diff_percent: 0,
                    guids: []
                };
                constructions.set(key, agg);
            }

            if (!agg.guids.includes(m.guid)) {
                agg.guids.push(m.guid);
            }

            const qty = m.quantity || 0;
            const isConcrete = m.material_type?.toLowerCase().includes('бетон');
            const isRebar = m.material_type?.toLowerCase().includes('арматур');

            if (m.source === 'РД') {
                if (isConcrete) agg.rd_concrete += qty;
                if (isRebar) agg.rd_rebar += qty;
            } else if (m.source === 'Смета') {
                if (isConcrete) agg.estimate_concrete += qty;
                if (isRebar) agg.estimate_rebar += qty;
            } else if (m.source === '1С') {
                if (isConcrete) agg.fact_concrete += qty;
                if (isRebar) agg.fact_rebar += qty;
            }
        }

        // Calculate diff percent
        for (const agg of constructions.values()) {
            const rdTotal = agg.rd_concrete + agg.rd_rebar / 1000; // normalize rebar to m³
            const factTotal = agg.fact_concrete + agg.fact_rebar / 1000;
            if (rdTotal > 0) {
                agg.diff_percent = ((rdTotal - factTotal) / rdTotal) * 100;
            }
        }

        return Array.from(constructions.values()).sort((a, b) =>
            a.construction.localeCompare(b.construction)
        );
    }, [materials, filterFloor]);

    // Summary stats
    const stats = useMemo(() => {
        const result = {
            rd_concrete: 0,
            estimate_concrete: 0,
            fact_concrete: 0,
            rd_rebar: 0,
            estimate_rebar: 0,
            fact_rebar: 0
        };

        for (const agg of aggregates) {
            result.rd_concrete += agg.rd_concrete;
            result.estimate_concrete += agg.estimate_concrete;
            result.fact_concrete += agg.fact_concrete;
            result.rd_rebar += agg.rd_rebar;
            result.estimate_rebar += agg.estimate_rebar;
            result.fact_rebar += agg.fact_rebar;
        }

        return result;
    }, [aggregates]);

    // Unique floors for filter
    const floors = useMemo(() => {
        const set = new Set(materials.map(m => m.floor).filter(Boolean));
        return Array.from(set).sort();
    }, [materials]);

    // Detail rows for selected construction
    const detailRows = useMemo(() => {
        if (!selectedConstruction) return [];
        return materials
            .filter(m => (m.estimate_construction || '(без конструкции)') === selectedConstruction)
            .filter(m => !filterSource || m.source === filterSource);
    }, [materials, selectedConstruction, filterSource]);

    // Get diff color
    const getDiffColor = (percent: number) => {
        const abs = Math.abs(percent);
        if (abs < 5) return '#52c41a'; // green
        if (abs < 15) return '#faad14'; // yellow
        return '#f5222d'; // red
    };

    const constructionColumns = [
        {
            title: 'Конструкция',
            dataIndex: 'construction',
            key: 'construction',
            width: 300,
            render: (val: string, record: ConstructionAggregate) => (
                <Space>
                    {selectedConstruction === val ? <DownOutlined /> : <RightOutlined />}
                    <Text strong={selectedConstruction === val}>{val}</Text>
                    <Tag>{record.guids.length} элементов</Tag>
                </Space>
            )
        },
        {
            title: 'Бетон РД (м³)',
            dataIndex: 'rd_concrete',
            key: 'rd_concrete',
            align: 'right' as const,
            render: (val: number) => val.toFixed(2)
        },
        {
            title: 'Бетон 1С (м³)',
            dataIndex: 'fact_concrete',
            key: 'fact_concrete',
            align: 'right' as const,
            render: (val: number) => val.toFixed(2)
        },
        {
            title: 'Арматура РД (кг)',
            dataIndex: 'rd_rebar',
            key: 'rd_rebar',
            align: 'right' as const,
            render: (val: number) => val.toFixed(0)
        },
        {
            title: 'Арматура 1С (кг)',
            dataIndex: 'fact_rebar',
            key: 'fact_rebar',
            align: 'right' as const,
            render: (val: number) => val.toFixed(0)
        },
        {
            title: 'Расхождение',
            dataIndex: 'diff_percent',
            key: 'diff_percent',
            width: 120,
            align: 'center' as const,
            render: (val: number) => (
                <Tag color={getDiffColor(val)}>
                    {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                </Tag>
            )
        }
    ];

    const detailColumns = [
        { title: 'GUID', dataIndex: 'guid', key: 'guid', width: 280 },
        { title: 'Позиция', dataIndex: 'position', key: 'position' },
        { title: 'Этаж', dataIndex: 'floor', key: 'floor' },
        { title: 'Источник', dataIndex: 'source', key: 'source', render: (v: string) => <Tag>{v}</Tag> },
        { title: 'Материал', dataIndex: 'material_name', key: 'material_name' },
        { title: 'Количество', dataIndex: 'quantity', key: 'quantity', render: (v: number) => v?.toFixed(2) },
        { title: 'Ед.', dataIndex: 'unit', key: 'unit' }
    ];

    const concreteDiff = stats.rd_concrete > 0
        ? ((stats.rd_concrete - stats.fact_concrete) / stats.rd_concrete * 100)
        : 0;

    return (
        <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
            <Space style={{ marginBottom: 16 }}>
                <Link to={`/projects/${streamId}/viewer`}>
                    <Button icon={<ArrowLeftOutlined />}>К вьюеру</Button>
                </Link>
            </Space>

            <Title level={2}>
                <BarChartOutlined /> Дашборд материалов
            </Title>

            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Сравнение объёмов материалов: РД → Смета → 1С (факт)
            </Text>

            {/* Summary Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Бетон РД"
                            value={stats.rd_concrete}
                            precision={1}
                            suffix="м³"
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Бетон 1С (факт)"
                            value={stats.fact_concrete}
                            precision={1}
                            suffix="м³"
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Арматура РД"
                            value={stats.rd_rebar / 1000}
                            precision={2}
                            suffix="т"
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Расхождение бетон"
                            value={concreteDiff}
                            precision={1}
                            suffix="%"
                            valueStyle={{ color: getDiffColor(concreteDiff) }}
                            prefix={concreteDiff >= 0 ? '+' : ''}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Filters and Upload */}
            <Card style={{ marginBottom: 24 }}>
                <Space wrap>
                    <Select
                        style={{ width: 150 }}
                        placeholder="Этаж"
                        allowClear
                        value={filterFloor}
                        onChange={setFilterFloor}
                        options={floors.map(f => ({ value: f, label: f }))}
                    />

                    <Upload
                        beforeUpload={handleExcelUpload}
                        accept=".xlsx,.xls"
                        showUploadList={false}
                    >
                        <Button icon={<UploadOutlined />} loading={uploading}>
                            Загрузить Excel
                        </Button>
                    </Upload>

                    <Button icon={<ReloadOutlined />} onClick={fetchMaterials} loading={loading}>
                        Обновить
                    </Button>

                    <Text type="secondary">
                        Загружено: {materials.length} записей, {aggregates.length} конструкций
                    </Text>
                </Space>
            </Card>

            {/* Constructions Table */}
            <Card
                title={<><TableOutlined /> Конструкции сметы</>}
                style={{ marginBottom: 24 }}
            >
                <Table
                    dataSource={aggregates}
                    columns={constructionColumns}
                    rowKey="construction"
                    size="small"
                    pagination={{ pageSize: 15 }}
                    loading={loading}
                    onRow={(record) => ({
                        onClick: () => setSelectedConstruction(
                            selectedConstruction === record.construction ? null : record.construction
                        ),
                        style: {
                            cursor: 'pointer',
                            background: selectedConstruction === record.construction ? '#e6f7ff' : undefined
                        }
                    })}
                />
            </Card>

            {/* Detail Table */}
            {selectedConstruction && (
                <Card
                    title={
                        <Space>
                            <Text>Детализация: </Text>
                            <Tag color="blue">{selectedConstruction}</Tag>
                            <Text type="secondary">({detailRows.length} записей)</Text>
                        </Space>
                    }
                    extra={
                        <Select
                            style={{ width: 120 }}
                            placeholder="Источник"
                            allowClear
                            value={filterSource}
                            onChange={setFilterSource}
                            options={[
                                { value: 'РД', label: 'РД' },
                                { value: 'Смета', label: 'Смета' },
                                { value: '1С', label: '1С' }
                            ]}
                        />
                    }
                >
                    <Table
                        dataSource={detailRows}
                        columns={detailColumns}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 20 }}
                        scroll={{ y: 400 }}
                    />
                </Card>
            )}

            {loading && materials.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <Spin size="large" />
                    <p>Загрузка данных...</p>
                </div>
            )}
        </div>
    );
}
