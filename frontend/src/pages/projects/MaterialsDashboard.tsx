import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Card, Table, Button, Upload, Typography, Tag, Space, Statistic, Row, Col,
    message, Select, Spin, Segmented, Tooltip, Alert
} from 'antd';
import {
    UploadOutlined, ArrowLeftOutlined, ReloadOutlined,
    BarChartOutlined, WarningOutlined, ExclamationCircleOutlined
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
    materialType?: string; // для режима "Все"
    rd: number;
    estimate: number;
    fact1c: number;
    deltaRd1c: number | null;
    deltaEstimate1c: number | null;
    unit: string;
    unitWarning: boolean;
    children?: ConstructionAggregate[];
}

interface DataQuality {
    noFact: number;
    noRd: number;
    noEstimate: number;
    zeroQuantity: number;
}

export default function MaterialsDashboard() {
    const { streamId } = useParams<{ streamId: string }>();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [materials, setMaterials] = useState<MaterialRow[]>([]);
    const [projectId, setProjectId] = useState<number | null>(null);

    // Filters
    const [filterType, setFilterType] = useState<string>('Все');
    const [filterFloors, setFilterFloors] = useState<string[]>([]);
    const [filterConstruction, setFilterConstruction] = useState<string | null>(null);

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

    // Get filtered materials
    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            if (filterType !== 'Все' && m.material_type !== filterType) return false;
            if (filterFloors.length > 0 && !filterFloors.includes(m.floor)) return false;
            if (filterConstruction && m.estimate_construction !== filterConstruction) return false;
            return true;
        });
    }, [materials, filterType, filterFloors, filterConstruction]);

    // Get unique values for filters
    const materialTypes = useMemo(() => {
        const set = new Set(materials.map(m => m.material_type).filter(Boolean));
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

    // Calculate delta percent (based on 1С)
    const calcDelta = (plan: number, fact: number): number | null => {
        if (fact === 0) return null;
        return ((plan - fact) / fact) * 100;
    };

    // KPI stats
    const kpiStats = useMemo(() => {
        const calcByType = (type: string) => {
            const data = materials.filter(m =>
                (type === 'Все' || m.material_type === type) &&
                (filterFloors.length === 0 || filterFloors.includes(m.floor)) &&
                (!filterConstruction || m.estimate_construction === filterConstruction)
            );

            const rd = data.filter(m => m.source === 'РД').reduce((s, m) => s + (m.quantity || 0), 0);
            const est = data.filter(m => m.source === 'Смета').reduce((s, m) => s + (m.quantity || 0), 0);
            const fact = data.filter(m => m.source === '1С').reduce((s, m) => s + (m.quantity || 0), 0);
            const unit = data.find(m => m.unit)?.unit || '';

            return { rd, estimate: est, fact, unit, deltaRd1c: calcDelta(rd, fact), deltaEstimate1c: calcDelta(est, fact) };
        };

        if (filterType === 'Все') {
            return {
                concrete: calcByType('Бетон'),
                rebar: calcByType('арматура')
            };
        }
        return { single: calcByType(filterType) };
    }, [materials, filterType, filterFloors, filterConstruction]);

    // Data quality indicators
    const dataQuality = useMemo<DataQuality>(() => {
        const guids = new Map<string, Set<string>>();
        let zeroQuantity = 0;

        for (const m of materials) {
            if (!guids.has(m.guid)) {
                guids.set(m.guid, new Set());
            }
            guids.get(m.guid)!.add(m.source);
            if (!m.quantity || m.quantity === 0) zeroQuantity++;
        }

        let noFact = 0, noRd = 0, noEstimate = 0;
        for (const sources of guids.values()) {
            if (!sources.has('1С')) noFact++;
            if (!sources.has('РД')) noRd++;
            if (!sources.has('Смета')) noEstimate++;
        }

        return { noFact, noRd, noEstimate, zeroQuantity };
    }, [materials]);

    // Aggregate by construction
    const aggregates = useMemo<ConstructionAggregate[]>(() => {
        if (filterType === 'Все') {
            // Group by construction, then by material type
            const byConstruction = new Map<string, Map<string, { rd: number; est: number; fact: number; units: Set<string> }>>();

            for (const m of filteredMaterials) {
                const cKey = m.estimate_construction || 'Без конструкции';
                const tKey = m.material_type || 'Прочее';

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
                        deltaRd1c: calcDelta(data.rd, data.fact),
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
                    deltaRd1c: null,
                    deltaEstimate1c: null,
                    unit: '',
                    unitWarning: false,
                    children
                });
            }
            return result.sort((a, b) => a.construction.localeCompare(b.construction));
        } else {
            // Single type grouping
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
                    deltaRd1c: calcDelta(data.rd, data.fact),
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

    // Get delta color
    const getDeltaColor = (percent: number | null): string => {
        if (percent === null) return '#999';
        const abs = Math.abs(percent);
        if (abs <= 5) return '#52c41a';
        if (abs <= 15) return '#faad14';
        return '#f5222d';
    };

    // Render delta cell
    const renderDelta = (val: number | null) => {
        if (val === null) return <Tag color="default">нет факта</Tag>;
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
            title: 'Δ РД–1С',
            dataIndex: 'deltaRd1c',
            key: 'deltaRd1c',
            align: 'center' as const,
            width: 100,
            render: renderDelta
        },
        {
            title: 'Δ Смета–1С',
            dataIndex: 'deltaEstimate1c',
            key: 'deltaEstimate1c',
            align: 'center' as const,
            width: 100,
            render: renderDelta
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
        { title: 'Тип', dataIndex: 'material_type', key: 'material_type' },
        { title: 'Количество', dataIndex: 'quantity', key: 'quantity', render: (v: number) => v?.toFixed(2) },
        { title: 'Ед.', dataIndex: 'unit', key: 'unit' },
        { title: 'Документ', dataIndex: 'document', key: 'document' }
    ];

    const totalProblems = dataQuality.noFact + dataQuality.noRd + dataQuality.noEstimate + dataQuality.zeroQuantity;

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

            {/* Data Quality Indicator */}
            {totalProblems > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    message={
                        <Space>
                            <Text>Проблемы с данными:</Text>
                            {dataQuality.noFact > 0 && <Tag color="red">Без 1С: {dataQuality.noFact}</Tag>}
                            {dataQuality.noRd > 0 && <Tag color="orange">Без РД: {dataQuality.noRd}</Tag>}
                            {dataQuality.noEstimate > 0 && <Tag color="orange">Без Сметы: {dataQuality.noEstimate}</Tag>}
                            {dataQuality.zeroQuantity > 0 && <Tag color="default">Количество=0: {dataQuality.zeroQuantity}</Tag>}
                        </Space>
                    }
                    style={{ marginBottom: 16 }}
                />
            )}

            {/* Global Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap size="large">
                    <Space>
                        <Text strong>Тип материала:</Text>
                        <Segmented
                            value={filterType}
                            onChange={(v) => setFilterType(v as string)}
                            options={materialTypes}
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
                        />
                    </Space>
                    <Space>
                        <Text strong>Конструкция:</Text>
                        <Select
                            style={{ minWidth: 200 }}
                            placeholder="Все конструкции"
                            value={filterConstruction}
                            onChange={setFilterConstruction}
                            options={constructions.map(c => ({ value: c, label: c }))}
                            allowClear
                            showSearch
                        />
                    </Space>
                    <Text type="secondary">
                        Записей: {filteredMaterials.length} / {materials.length}
                    </Text>
                </Space>
            </Card>

            {/* KPI Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                {filterType === 'Все' ? (
                    <>
                        {/* Concrete stats */}
                        <Col span={4}>
                            <Card size="small">
                                <Statistic title="РД Бетон" value={kpiStats.concrete?.rd || 0} precision={1} suffix="м³" valueStyle={{ color: '#1890ff' }} />
                                <Statistic title="РД Арматура" value={(kpiStats.rebar?.rd || 0) / 1000} precision={2} suffix="т" valueStyle={{ color: '#1890ff', fontSize: 16 }} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card size="small">
                                <Statistic title="Смета Бетон" value={kpiStats.concrete?.estimate || 0} precision={1} suffix="м³" valueStyle={{ color: '#722ed1' }} />
                                <Statistic title="Смета Арматура" value={(kpiStats.rebar?.estimate || 0) / 1000} precision={2} suffix="т" valueStyle={{ color: '#722ed1', fontSize: 16 }} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card size="small">
                                <Statistic title="1С Бетон" value={kpiStats.concrete?.fact || 0} precision={1} suffix="м³" valueStyle={{ color: '#52c41a' }} />
                                <Statistic title="1С Арматура" value={(kpiStats.rebar?.fact || 0) / 1000} precision={2} suffix="т" valueStyle={{ color: '#52c41a', fontSize: 16 }} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Text strong>Δ РД–1С</Text>
                                    <Space>
                                        <Text>Бетон:</Text>
                                        {renderDelta(kpiStats.concrete?.deltaRd1c ?? null)}
                                        <Text>Арм:</Text>
                                        {renderDelta(kpiStats.rebar?.deltaRd1c ?? null)}
                                    </Space>
                                </Space>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Text strong>Δ Смета–1С</Text>
                                    <Space>
                                        <Text>Бетон:</Text>
                                        {renderDelta(kpiStats.concrete?.deltaEstimate1c ?? null)}
                                        <Text>Арм:</Text>
                                        {renderDelta(kpiStats.rebar?.deltaEstimate1c ?? null)}
                                    </Space>
                                </Space>
                            </Card>
                        </Col>
                    </>
                ) : (
                    <>
                        <Col span={4}>
                            <Card>
                                <Statistic title="РД" value={kpiStats.single?.rd || 0} precision={2} suffix={kpiStats.single?.unit} valueStyle={{ color: '#1890ff' }} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card>
                                <Statistic title="Смета" value={kpiStats.single?.estimate || 0} precision={2} suffix={kpiStats.single?.unit} valueStyle={{ color: '#722ed1' }} />
                            </Card>
                        </Col>
                        <Col span={4}>
                            <Card>
                                <Statistic title="1С" value={kpiStats.single?.fact || 0} precision={2} suffix={kpiStats.single?.unit} valueStyle={{ color: '#52c41a' }} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Δ РД–1С"
                                    value={kpiStats.single?.deltaRd1c ?? 0}
                                    precision={1}
                                    suffix="%"
                                    valueStyle={{ color: getDeltaColor(kpiStats.single?.deltaRd1c ?? null) }}
                                    prefix={(kpiStats.single?.deltaRd1c ?? 0) >= 0 ? '+' : ''}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Δ Смета–1С"
                                    value={kpiStats.single?.deltaEstimate1c ?? 0}
                                    precision={1}
                                    suffix="%"
                                    valueStyle={{ color: getDeltaColor(kpiStats.single?.deltaEstimate1c ?? null) }}
                                    prefix={(kpiStats.single?.deltaEstimate1c ?? 0) >= 0 ? '+' : ''}
                                />
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
