/**
 * ЗМК - Производственная программа
 * /zmk/program
 * Основная таблица сборок с редактированием статусов и дат
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    Table, Input, DatePicker, Select, Typography, Space, Button,
    message, Card, Row, Col, Spin
} from "antd";
import { useNavigate, Link, useParams } from "react-router-dom";
import {
    SearchOutlined, BuildOutlined, HomeOutlined,
    ReloadOutlined, HistoryOutlined, ArrowLeftOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { dataProviderZmk } from "../../providers/dataProviderZmk";
import "./zmk.css";

const { Title, Text } = Typography;

interface Assembly {
    id: number;
    main_part_guid: string;
    assembly_guid: string;
    dwg_no: string;
    mark: string;
    axes: string;
    name: string;
    weight_model_t: number;
    weight_weld_t: number;
    weight_total_t: number;
    kmd_date: string | null;
    ship_plan: string | null;
    ship_fact: string | null;
    manufacture_date: string | null;
    mount_fact: string | null;
    tekla_status: string | null;
    ogk_status: string | null;
    // ПДО
    rascexovka: string | null;
    prod_start: string | null;
    assembly_weld: string | null;
    akz: string | null;
    sgp: string | null;
}

const STATUS_OPTIONS = [
    { value: "Approved", label: "Approved", color: "green" },
    { value: "In Progress", label: "In Progress", color: "blue" },
    { value: "Review", label: "Review", color: "orange" },
    { value: "Hold", label: "Hold", color: "red" },
    { value: "", label: "—", color: "default" },
];

export const ZmkProgram: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();
    const [data, setData] = useState<Assembly[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ dwg: "", mark: "", tekla_status: "", ogk_status: "" });
    const [savingCell, setSavingCell] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const filterArr = [];
            // Filter by project if projectId in URL
            if (projectId) filterArr.push({ field: "project_id", operator: "eq", value: projectId });
            if (filters.dwg) filterArr.push({ field: "dwg_no", operator: "ilike", value: `*${filters.dwg}*` });
            if (filters.mark) filterArr.push({ field: "mark", operator: "ilike", value: `*${filters.mark}*` });
            if (filters.tekla_status) filterArr.push({ field: "tekla_status", operator: "eq", value: filters.tekla_status });
            if (filters.ogk_status) filterArr.push({ field: "ogk_status", operator: "eq", value: filters.ogk_status });

            const result = await dataProviderZmk.getList({
                resource: "v_program",
                pagination: { current: 1, pageSize: 500 },
                sorters: [{ field: "dwg_no", order: "asc" }],
                filters: filterArr,
            });
            setData(result.data);
        } catch (error) {
            console.error("Fetch error:", error);
            message.error("Ошибка загрузки данных");
        } finally {
            setLoading(false);
        }
    }, [filters, projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Сохранение значения этапа (debounce в UI сделаем через DatePicker/Select)
    const handleStageChange = async (
        assemblyId: number,
        stageCode: string,
        value: string | null,
        isDate: boolean
    ) => {
        const cellKey = `${assemblyId}-${stageCode}`;
        setSavingCell(cellKey);
        try {
            await dataProviderZmk.upsertStageValue({
                assembly_id: assemblyId,
                stage_code: stageCode,
                value_date: isDate ? value || undefined : undefined,
                value_text: !isDate ? value || undefined : undefined,
                updated_by: "web",
            });
            message.success("Сохранено");
            // Обновить локальные данные
            setData(prev => prev.map(row => {
                if (row.id === assemblyId) {
                    return { ...row, [stageCode]: value };
                }
                return row;
            }));
        } catch (error) {
            console.error("Save error:", error);
            message.error("Ошибка сохранения");
        } finally {
            setSavingCell(null);
        }
    };

    const columns = [
        {
            title: "DWG",
            dataIndex: "dwg_no",
            key: "dwg_no",
            width: 100,
            fixed: "left" as const,
            render: (text: string, record: Assembly) => (
                <a onClick={() => navigate(`/zmk/assemblies/${record.id}`)}>
                    {text}
                </a>
            ),
        },
        {
            title: "Марка",
            dataIndex: "mark",
            key: "mark",
            width: 100,
            fixed: "left" as const,
        },
        {
            title: "Оси",
            dataIndex: "axes",
            key: "axes",
            width: 100,
        },
        {
            title: "Наименование",
            dataIndex: "name",
            key: "name",
            width: 200,
            ellipsis: true,
        },
        {
            title: "Вес (т)",
            dataIndex: "weight_total_t",
            key: "weight_total_t",
            width: 80,
            render: (val: number) => val?.toFixed(3) || "—",
        },
        {
            title: "КМД",
            dataIndex: "kmd_date",
            key: "kmd_date",
            width: 130,
            render: (val: string | null, record: Assembly) => (
                <DatePicker
                    size="small"
                    value={val ? dayjs(val) : null}
                    onChange={(date) => handleStageChange(record.id, "kmd_date", date?.format("YYYY-MM-DD") || null, true)}
                    format="DD.MM.YYYY"
                    style={{ width: "100%" }}
                    status={savingCell === `${record.id}-kmd_date` ? "warning" : undefined}
                />
            ),
        },
        {
            title: "Отгрузка (план)",
            dataIndex: "ship_plan",
            key: "ship_plan",
            width: 130,
            render: (val: string | null, record: Assembly) => (
                <DatePicker
                    size="small"
                    value={val ? dayjs(val) : null}
                    onChange={(date) => handleStageChange(record.id, "ship_plan", date?.format("YYYY-MM-DD") || null, true)}
                    format="DD.MM.YYYY"
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "Отгрузка (факт)",
            dataIndex: "ship_fact",
            key: "ship_fact",
            width: 130,
            render: (val: string | null, record: Assembly) => (
                <DatePicker
                    size="small"
                    value={val ? dayjs(val) : null}
                    onChange={(date) => handleStageChange(record.id, "ship_fact", date?.format("YYYY-MM-DD") || null, true)}
                    format="DD.MM.YYYY"
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "Изготовление",
            dataIndex: "manufacture_date",
            key: "manufacture_date",
            width: 130,
            render: (val: string | null, record: Assembly) => (
                <DatePicker
                    size="small"
                    value={val ? dayjs(val) : null}
                    onChange={(date) => handleStageChange(record.id, "manufacture_date", date?.format("YYYY-MM-DD") || null, true)}
                    format="DD.MM.YYYY"
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "Монтаж (факт)",
            dataIndex: "mount_fact",
            key: "mount_fact",
            width: 130,
            render: (val: string | null, record: Assembly) => (
                <DatePicker
                    size="small"
                    value={val ? dayjs(val) : null}
                    onChange={(date) => handleStageChange(record.id, "mount_fact", date?.format("YYYY-MM-DD") || null, true)}
                    format="DD.MM.YYYY"
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "Статус Tekla",
            dataIndex: "tekla_status",
            key: "tekla_status",
            width: 130,
            render: (val: string | null, record: Assembly) => (
                <Select
                    size="small"
                    value={val || ""}
                    onChange={(v) => handleStageChange(record.id, "tekla_status", v || null, false)}
                    style={{ width: "100%" }}
                    options={STATUS_OPTIONS}
                />
            ),
        },
        {
            title: "Статус ОГК",
            dataIndex: "ogk_status",
            key: "ogk_status",
            width: 130,
            render: (val: string | null, record: Assembly) => (
                <Select
                    size="small"
                    value={val || ""}
                    onChange={(v) => handleStageChange(record.id, "ogk_status", v || null, false)}
                    style={{ width: "100%" }}
                    options={STATUS_OPTIONS}
                />
            ),
        },
    ];

    return (
        <div className="zmk-container">
            <div className="zmk-content">
                {/* Breadcrumb */}
                <div className="zmk-breadcrumb">
                    <Link to="/"><HomeOutlined /> Главная</Link>
                    <span> / </span>
                    <Link to="/zmk/projects">ЗМК</Link>
                    {projectId && (
                        <>
                            <span> / </span>
                            <span className="current">Проект #{projectId}</span>
                        </>
                    )}
                    {!projectId && <span className="current"> / Все сборки</span>}
                </div>

                {/* Back to projects */}
                {projectId && (
                    <a
                        className="zmk-back-link"
                        onClick={() => navigate("/zmk/projects")}
                        style={{ cursor: "pointer" }}
                    >
                        <ArrowLeftOutlined /> К списку проектов
                    </a>
                )}

                {/* Header */}
                <div className="zmk-header">
                    <div>
                        <Title level={2} className="zmk-title">
                            <BuildOutlined /> Производственная программа
                        </Title>
                        <Text className="zmk-subtitle">
                            {projectId ? `Проект #${projectId}` : "Все сборки ЗМК"}
                        </Text>
                    </div>
                    <Space>
                        <Button
                            icon={<HistoryOutlined />}
                            onClick={() => navigate("/zmk/audit")}
                        >
                            Аудит
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchData}
                            loading={loading}
                        >
                            Обновить
                        </Button>
                    </Space>
                </div>

                {/* Filters */}
                <Card size="small" className="zmk-filters">
                    <Row gutter={16}>
                        <Col span={6}>
                            <Input
                                placeholder="Поиск по DWG..."
                                prefix={<SearchOutlined />}
                                value={filters.dwg}
                                onChange={(e) => setFilters(f => ({ ...f, dwg: e.target.value }))}
                                allowClear
                            />
                        </Col>
                        <Col span={6}>
                            <Input
                                placeholder="Поиск по марке..."
                                value={filters.mark}
                                onChange={(e) => setFilters(f => ({ ...f, mark: e.target.value }))}
                                allowClear
                            />
                        </Col>
                        <Col span={6}>
                            <Select
                                placeholder="Статус Tekla"
                                value={filters.tekla_status || undefined}
                                onChange={(v) => setFilters(f => ({ ...f, tekla_status: v || "" }))}
                                style={{ width: "100%" }}
                                allowClear
                                options={STATUS_OPTIONS.filter(o => o.value)}
                            />
                        </Col>
                        <Col span={6}>
                            <Select
                                placeholder="Статус ОГК"
                                value={filters.ogk_status || undefined}
                                onChange={(v) => setFilters(f => ({ ...f, ogk_status: v || "" }))}
                                style={{ width: "100%" }}
                                allowClear
                                options={STATUS_OPTIONS.filter(o => o.value)}
                            />
                        </Col>
                    </Row>
                </Card>

                {/* Stats */}
                <div className="zmk-stats">
                    <div className="zmk-stat">
                        <span className="zmk-stat-value">{data.length}</span>
                        <span className="zmk-stat-label">Сборок</span>
                    </div>
                    <div className="zmk-stat">
                        <span className="zmk-stat-value">
                            {data.reduce((sum, r) => sum + (r.weight_total_t || 0), 0).toFixed(1)}
                        </span>
                        <span className="zmk-stat-label">Тонн (итого)</span>
                    </div>
                    <div className="zmk-stat">
                        <span className="zmk-stat-value">
                            {data.filter(r => r.ship_fact).length}
                        </span>
                        <span className="zmk-stat-label">Отгружено</span>
                    </div>
                </div>

                {/* Table */}
                <Card className="zmk-table-card">
                    <Spin spinning={loading}>
                        <Table
                            dataSource={data}
                            columns={columns}
                            rowKey="id"
                            size="small"
                            scroll={{ x: 1600 }}
                            pagination={{
                                pageSize: 50,
                                showSizeChanger: true,
                                showTotal: (total) => `Всего: ${total}`,
                            }}
                            onRow={(record) => ({
                                style: { cursor: "pointer" },
                                onDoubleClick: () => navigate(`/zmk/assemblies/${record.id}`),
                            })}
                        />
                    </Spin>
                </Card>
            </div>
        </div>
    );
};

export default ZmkProgram;
