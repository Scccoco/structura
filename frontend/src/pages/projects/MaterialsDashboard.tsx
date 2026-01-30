import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Card, Table, Button, Upload, Typography, Tag, Space, Statistic, Row, Col,
    message, Select, Spin, Segmented, Tooltip
} from 'antd';
import {
    UploadOutlined, ArrowLeftOutlined, ReloadOutlined,
    BarChartOutlined, WarningOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

import { API_URL } from '../../shared/apiUrl';

interface MaterialRow {
    id?: number;
    guid: string;
    name: string;
    position: string;
    floor: string;
    base_volume_model?: number;
    estimate_number: string;
    section: string;
    estimate_construction: string;
    construction_1c: string;
    source: string;
    material_name: string;
    material_type: string;
    quantity?: number;
    unit: string;
    document: string;
}

interface ConstructionAggregate {
    key: string;
    construction: string;
    materialType?: string;
    rd: number;
    estimate: number;
    fact1c: number;
    // Дельты относительно РД (РД = 0%)
    deltaEstimateRd: number | null;  // (Смета - РД) / РД * 100
    delta1cRd: number | null;        // (1С - РД) / РД * 100
    deltaEstimate1c: number | null;  // (Смета - 1С) / 1С * 100
    unit: string;
    unitWarning: boolean;
    children?: ConstructionAggregate[];
}

// Нормализация типа материала (игнорирование регистра)
const normalizeType = (type: string): string => {
    if (!type) return '';
    const lower = type.toLowerCase().trim();
    // Канонические названия
    if (lower === 'бетон') return 'Бетон';
    if (lower === 'арматура') return 'Арматура';
    // Остальные - с заглавной буквы
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

export default function MaterialsDashboard() {
    const { streamId } = useParams<{ streamId: string }>();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [materials, setMaterials] = useState<MaterialRow[]>([]);
    const [projectId, setProjectId] = useState<number | null>(null);

    // Filters
    const [filterType, setFilterType] = useState<string>('Все');
    const [filterFloors, setFilterFloors] = useState<string[]>([]);
    const [filterConstructions, setFilterConstructions] = useState<string[]>([]);

    // Detail view
    const [selectedConstruction, setSelectedConstruction] = useState<string | null>(null);
    const [detailSourceFilter, setDetailSourceFilter] = useState<string>('Все');

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
            })).filter((row: any) => row.guid);

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

    // Get filtered materials with normalized types
    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            const normalizedMaterialType = normalizeType(m.material_type);
            if (filterType !== 'Все' && normalizedMaterialType !== filterType) return false;
            if (filterFloors.length > 0 && !filterFloors.includes(m.floor)) return false;
            if (filterConstructions.length > 0 && !filterConstructions.includes(m.estimate_construction || 'Без конструкции')) return false;
            return true;
        });
    }, [materials, filterType, filterFloors, filterConstructions]);

    // Get unique values for filters (normalized)
    const materialTypes = useMemo(() => {
        const set = new Set<string>();
        materials.forEach(m => {
            const normalized = normalizeType(m.material_type);
            if (normalized) set.add(normalized);
        });
        return ['Все', ...Array.from(set).sort()];
    }, [materials]);

    const floors = useMemo(() => {
        const set = new Set(materials.map(m => m.floor).filter(Boolean));
        return Array.from(set).sort();
    }, [materials]);

    const constructions = useMemo(() => {
        const set = new Set(materials.map(m => m.estimate_construction || 'Без конструкции'));
        return Array.from(set).sort();
    }, [materials]);

    // Calculate delta percent (relative to base)
    const calcDelta = (value: number, base: number): number | null => {
        if (base === 0) return null;
        return ((value - base) / base) * 100;
    };

    // KPI stats with normalized types
    const kpiStats = useMemo(() => {
        const calcByType = (type: string) => {
            const data = materials.filter(m => {
                const normalizedType = normalizeType(m.material_type);
                return (type === 'Все' || normalizedType === type) &&
                    (filterFloors.length === 0 || filterFloors.includes(m.floor)) &&
                    (filterConstructions.length === 0 || filterConstructions.includes(m.estimate_construction || 'Без конструкции'));
            });

            const rd = data.filter(m => m.source === 'РД').reduce((s, m) => s + (m.quantity || 0), 0);
            const est = data.filter(m => m.source === 'Смета').reduce((s, m) => s + (m.quantity || 0), 0);
            const fact = data.filter(m => m.source === '1С').reduce((s, m) => s + (m.quantity || 0), 0);
            const unit = data.find(m => m.unit)?.unit || '';

            return {
                rd,
                estimate: est,
                fact,
                unit,
                deltaEstimateRd: calcDelta(est, rd),
                delta1cRd: calcDelta(fact, rd),
                deltaEstimate1c: calcDelta(est, fact)
            };
        };

        if (filterType === 'Все') {
            return {
                concrete: calcByType('Бетон'),
                rebar: calcByType('Арматура')
            };
        }
        return { single: calcByType(filterType) };
    }, [materials, filterType, filterFloors, filterConstructions]);

    // Aggregate by construction
    const aggregates = useMemo<ConstructionAggregate[]>(() => {
        if (filterType === 'Все') {
            const byConstruction = new Map<string, Map<string, { rd: number; est: number; fact: number; units: Set<string> }>>();

            for (const m of filteredMaterials) {
                const cKey = m.estimate_construction || 'Без конструкции';
                const tKey = normalizeType(m.material_type) || 'Прочее';

                if (!byConstruction.has(cKey)) byConstruction.set(cKey, new Map());
                const types = byConstruction.get(cKey)!;
                if (!types.has(tKey)) types.set(tKey, { rd: 0, est: 0, fact: 0, units: new Set() });

                const agg = types.get(tKey)!;
                const qty = m.quantity || 0;
                if (m.source === 'РД') agg.rd += qty;
                else if (m.source === 'Смета') agg.est += qty;
                else if (m.source === '1С') agg.fact += qty;
                if (m.unit) agg.units.add(m.unit);
            }

            const result: ConstructionAggregate[] = [];
            for (const [cKey, types] of byConstruction.entries()) {
                const children: ConstructionAggregate[] = [];
                for (const [tKey, data] of types.entries()) {
                    const units = Array.from(data.units);
                    children.push({
                        key: `${cKey}-${tKey}`,
                        construction: tKey,
                        materialType: tKey,
                        rd: data.rd,
                        estimate: data.est,
                        fact1c: data.fact,
                        deltaEstimateRd: calcDelta(data.est, data.rd),
                        delta1cRd: calcDelta(data.fact, data.rd),
                        deltaEstimate1c: calcDelta(data.est, data.fact),
                        unit: units[0] || '',
                        unitWarning: units.length > 1
                    });
                }
                result.push({
                    key: cKey,
                    construction: cKey,
                    rd: children.reduce((s, c) => s + c.rd, 0),
                    estimate: children.reduce((s, c) => s + c.estimate, 0),
                    fact1c: children.reduce((s, c) => s + c.fact1c, 0),
                    deltaEstimateRd: null,
                    delta1cRd: null,
                    deltaEstimate1c: null,
                    unit: '',
                    unitWarning: false,
                    children
                });
            }
            return result.sort((a, b) => a.construction.localeCompare(b.construction));
        } else {
            const byConstruction = new Map<string, { rd: number; est: number; fact: number; units: Set<string> }>();

            for (const m of filteredMaterials) {
                const key = m.estimate_construction || 'Без конструкции';
                if (!byConstruction.has(key)) byConstruction.set(key, { rd: 0, est: 0, fact: 0, units: new Set() });

                const agg = byConstruction.get(key)!;
                const qty = m.quantity || 0;
                if (m.source === 'РД') agg.rd += qty;
                else if (m.source === 'Смета') agg.est += qty;
                else if (m.source === '1С') agg.fact += qty;
                if (m.unit) agg.units.add(m.unit);
            }

            const result: ConstructionAggregate[] = [];
            for (const [key, data] of byConstruction.entries()) {
                const units = Array.from(data.units);
                result.push({
                    key,
                    construction: key,
                    rd: data.rd,
                    estimate: data.est,
                    fact1c: data.fact,
                    deltaEstimateRd: calcDelta(data.est, data.rd),
                    delta1cRd: calcDelta(data.fact, data.rd),
                    deltaEstimate1c: calcDelta(data.est, data.fact),
                    unit: units[0] || '',
                    unitWarning: units.length > 1
                });
            }
            return result.sort((a, b) => a.construction.localeCompare(b.construction));
        }
    }, [filteredMaterials, filterType]);

    // Detail rows
    const detailRows = useMemo(() => {
        if (!selectedConstruction) return [];
        return materials
            .filter(m => (m.estimate_construction || 'Без конструкции') === selectedConstruction)
            .filter(m => detailSourceFilter === 'Все' || m.source === detailSourceFilter);
    }, [materials, selectedConstruction, detailSourceFilter]);

    // Get delta color (относительно base = 0)
    const getDeltaColor = (percent: number | null): string => {
        if (percent === null) return '#999';
        const abs = Math.abs(percent);
        if (abs <= 5) return '#52c41a';  // зелёный
        if (abs <= 15) return '#faad14'; // жёлтый
        return '#f5222d';                // красный
    };

    // Render delta cell
    const renderDelta = (val: number | null, label?: string) => {
        if (val === null) return <Tag color="default">{label || 'нет данных'}</Tag>;
        return (
            <Tag color={getDeltaColor(val)}>
                {val >= 0 ? '+' : ''}{val.toFixed(1)}%
            </Tag>
        );
    };

    // Table columns
    const columns = [
        {
            title: 'Конструкция',
            dataIndex: 'construction',
            key: 'construction',
            width: 300,
            render: (val: string, record: ConstructionAggregate) => (
                <Space>
                    <Text strong={!record.materialType}>{val}</Text>
                    {record.unitWarning && (
                        <Tooltip title="Найдено несколько единиц измерения">
                            <WarningOutlined style={{ color: '#faad14' }} />
                        </Tooltip>
                    )}
                </Space>
            )
        },
        {
            title: 'РД',
            dataIndex: 'rd',
            key: 'rd',
            align: 'right' as const,
            width: 100,
            render: (val: number) => val?.toFixed(2) || '-'
        },
        {
            title: 'Смета',
            dataIndex: 'estimate',
            key: 'estimate',
            align: 'right' as const,
            width: 100,
            render: (val: number) => val?.toFixed(2) || '-'
        },
        {
            title: '1С',
            dataIndex: 'fact1c',
            key: 'fact1c',
            align: 'right' as const,
            width: 100,
            render: (val: number) => val?.toFixed(2) || '-'
        },
        {
            title: <Tooltip title="(Смета - РД) / РД × 100">Δ Смета/РД</Tooltip>,
            dataIndex: 'deltaEstimateRd',
            key: 'deltaEstimateRd',
            align: 'center' as const,
            width: 110,
            render: (val: number | null) => renderDelta(val, 'нет РД')
        },
        {
            title: <Tooltip title="(1С - РД) / РД × 100">Δ 1С/РД</Tooltip>,
            dataIndex: 'delta1cRd',
            key: 'delta1cRd',
            align: 'center' as const,
            width: 100,
            render: (val: number | null) => renderDelta(val, 'нет РД')
        },
        {
            title: <Tooltip title="(Смета - 1С) / 1С × 100">Δ Смета/1С</Tooltip>,
            dataIndex: 'deltaEstimate1c',
            key: 'deltaEstimate1c',
            align: 'center' as const,
            width: 110,
            render: (val: number | null) => renderDelta(val, 'нет 1С')
        },
        {
            title: 'Ед.',
            dataIndex: 'unit',
            key: 'unit',
            width: 60
        }
    ];

    const detailColumns = [
        { title: 'GUID', dataIndex: 'guid', key: 'guid', width: 280 },
        { title: 'Позиция', dataIndex: 'position', key: 'position' },
        { title: 'Этаж', dataIndex: 'floor', key: 'floor' },
        { title: 'Источник', dataIndex: 'source', key: 'source', render: (v: string) => <Tag>{v}</Tag> },
        { title: 'Наименование', dataIndex: 'material_name', key: 'material_name' },
        { title: 'Тип', dataIndex: 'material_type', key: 'material_type', render: (v: string) => normalizeType(v) },
        { title: 'Количество', dataIndex: 'quantity', key: 'quantity', render: (v: number) => v?.toFixed(2) },
        { title: 'Ед.', dataIndex: 'unit', key: 'unit' },
        { title: 'Документ', dataIndex: 'document', key: 'document' }
    ];

    return (
        <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
            {/* Header */}
            <Space style={{ marginBottom: 16 }}>
                <Link to={`/projects/${streamId}/viewer`}>
                    <Button icon={<ArrowLeftOutlined />}>К вьюеру</Button>
                </Link>
                <Upload beforeUpload={handleExcelUpload} accept=".xlsx,.xls" showUploadList={false}>
                    <Button icon={<UploadOutlined />} loading={uploading}>Загрузить Excel</Button>
                </Upload>
                <Button icon={<ReloadOutlined />} onClick={fetchMaterials} loading={loading}>Обновить</Button>
            </Space>

            <Title level={2}>
                <BarChartOutlined /> Дашборд материалов
            </Title>

            {/* Global Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap size="large">
                    <Space>
                        <Text strong>Тип материала:</Text>
                        <Select
                            style={{ width: 150 }}
                            value={filterType}
                            onChange={setFilterType}
                            options={materialTypes.map(t => ({ value: t, label: t }))}
                        />
                    </Space>
                    <Space>
                        <Text strong>Этаж:</Text>
                        <Select
                            mode="multiple"
                            style={{ minWidth: 150 }}
                            placeholder="Все этажи"
                            value={filterFloors}
                            onChange={setFilterFloors}
                            options={floors.map(f => ({ value: f, label: f }))}
                            allowClear
                            maxTagCount={2}
                        />
                    </Space>
                    <Space>
                        <Text strong>Конструкция:</Text>
                        <Select
                            mode="multiple"
                            style={{ minWidth: 250 }}
                            placeholder="Все конструкции"
                            value={filterConstructions}
                            onChange={setFilterConstructions}
                            options={constructions.map(c => ({ value: c, label: c }))}
                            allowClear
                            showSearch
                            maxTagCount={2}
                        />
                    </Space>
                    <Text type="secondary">
                        Записей: {filteredMaterials.length} / {materials.length}
                    </Text>
                </Space>
            </Card>

            {/* KPI Cards - сравнение 3 источников */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                {filterType === 'Все' ? (
                    <>
                        {/* Бетон */}
                        <Col span={4}>
                            <Card size="small" title="Бетон">
                                <Statistic title="РД" value={kpiStats.concrete?.rd || 0} precision={1} suffix="м³" valueStyle={{ fontSize: 18 }} />
                                <Statistic title="Смета" value={kpiStats.concrete?.estimate || 0} precision={1} suffix="м³" valueStyle={{ fontSize: 14, color: '#722ed1' }} />
                                <Statistic title="1С" value={kpiStats.concrete?.fact || 0} precision={1} suffix="м³" valueStyle={{ fontSize: 14, color: '#52c41a' }} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card size="small" title="Арматура">
                                <Statistic title="РД" value={(kpiStats.rebar?.rd || 0) / 1000} precision={2} suffix="т" valueStyle={{ fontSize: 18 }} />
                                <Statistic title="Смета" value={(kpiStats.rebar?.estimate || 0) / 1000} precision={2} suffix="т" valueStyle={{ fontSize: 14, color: '#722ed1' }} />
                                <Statistic title="1С" value={(kpiStats.rebar?.fact || 0) / 1000} precision={2} suffix="т" valueStyle={{ fontSize: 14, color: '#52c41a' }} />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small" title="Отклонения от РД (Бетон)">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Space>
                                        <Text>Смета/РД:</Text>
                                        {renderDelta(kpiStats.concrete?.deltaEstimateRd ?? null)}
                                    </Space>
                                    <Space>
                                        <Text>1С/РД:</Text>
                                        {renderDelta(kpiStats.concrete?.delta1cRd ?? null)}
                                    </Space>
                                    <Space>
                                        <Text>Смета/1С:</Text>
                                        {renderDelta(kpiStats.concrete?.deltaEstimate1c ?? null)}
                                    </Space>
                                </Space>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small" title="Отклонения от РД (Арматура)">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Space>
                                        <Text>Смета/РД:</Text>
                                        {renderDelta(kpiStats.rebar?.deltaEstimateRd ?? null)}
                                    </Space>
                                    <Space>
                                        <Text>1С/РД:</Text>
                                        {renderDelta(kpiStats.rebar?.delta1cRd ?? null)}
                                    </Space>
                                    <Space>
                                        <Text>Смета/1С:</Text>
                                        {renderDelta(kpiStats.rebar?.deltaEstimate1c ?? null)}
                                    </Space>
                                </Space>
                            </Card>
                        </Col>
                    </>
                ) : (
                    <>
                        <Col span={6}>
                            <Card>
                                <Statistic title="РД (база)" value={kpiStats.single?.rd || 0} precision={2} suffix={kpiStats.single?.unit} valueStyle={{ color: '#1890ff' }} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic title="Смета" value={kpiStats.single?.estimate || 0} precision={2} suffix={kpiStats.single?.unit} valueStyle={{ color: '#722ed1' }} />
                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary">от РД: </Text>
                                    {renderDelta(kpiStats.single?.deltaEstimateRd ?? null)}
                                </div>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic title="1С (факт)" value={kpiStats.single?.fact || 0} precision={2} suffix={kpiStats.single?.unit} valueStyle={{ color: '#52c41a' }} />
                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary">от РД: </Text>
                                    {renderDelta(kpiStats.single?.delta1cRd ?? null)}
                                </div>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <div style={{ marginBottom: 8 }}>
                                    <Text strong>Смета vs 1С:</Text>
                                </div>
                                {renderDelta(kpiStats.single?.deltaEstimate1c ?? null)}
                            </Card>
                        </Col>
                    </>
                )}
            </Row>

            {/* Constructions Table */}
            <Card title="Конструкции" style={{ marginBottom: 24 }}>
                <Table
                    dataSource={aggregates}
                    columns={columns}
                    rowKey="key"
                    size="small"
                    pagination={{ pageSize: 20 }}
                    loading={loading}
                    expandable={filterType === 'Все' ? { defaultExpandAllRows: true } : undefined}
                    onRow={(record) => ({
                        onClick: () => {
                            if (!record.children) {
                                setSelectedConstruction(
                                    selectedConstruction === record.construction ? null : record.construction
                                );
                            }
                        },
                        style: {
                            cursor: record.children ? 'default' : 'pointer',
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
                            <Text>Детализация:</Text>
                            <Tag color="blue">{selectedConstruction}</Tag>
                            <Text type="secondary">({detailRows.length} записей)</Text>
                        </Space>
                    }
                    extra={
                        <Space>
                            <Text>Источник:</Text>
                            <Segmented
                                value={detailSourceFilter}
                                onChange={(v) => setDetailSourceFilter(v as string)}
                                options={['Все', 'РД', 'Смета', '1С']}
                            />
                        </Space>
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
