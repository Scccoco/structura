/**
 * ЗМК - Производственная программа (v2)
 * /zmk/projects/:projectId
 * Таблица сборок + 3D Viewer + Статистика
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    Table, Input, Select, Typography, Space, Button,
    message, Tag, InputRef
} from "antd";
import type { ColumnsType, ColumnType, FilterValue } from "antd/es/table/interface";
import { useNavigate, Link, useParams } from "react-router-dom";
import {
    SearchOutlined, BuildOutlined, HomeOutlined,
    ReloadOutlined, HistoryOutlined, ArrowLeftOutlined, ClearOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { dataProviderZmk } from "../../providers/dataProviderZmk";
import { FullViewer, FullViewerRef, AssemblyMap } from "../../components/FullViewer";
import "./zmk.css";

const { Title, Text } = Typography;

// Speckle config
const ZMK_SPECKLE_STREAM = "99d6211223";

// Статусы работ с цветами для 3D модели (ARGB hex)
const WORK_STATUS_OPTIONS = [
    { value: "km_review", label: "Изменения КМ", color: "orange", viewerColor: 0xFF800080 },
    { value: "model_not_ready", label: "Модель не готова", color: "default", viewerColor: 0xFFCCCC66 },
    { value: "model_in_progress", label: "Модель в работе", color: "processing", viewerColor: 0xFF8B008B },
    { value: "model_done", label: "Модель разработана", color: "cyan", viewerColor: 0xFFFFFFFF },
    { value: "kmd_in_progress", label: "КМД в разработке", color: "blue", viewerColor: 0xFFFF9F7F },
    { value: "kmd_released", label: "КМД передано", color: "geekblue", viewerColor: 0xFF00FFFF },
    { value: "in_production", label: "В цехе", color: "gold", viewerColor: 0xFF0000FF },
    { value: "ready_to_ship", label: "К отгрузке", color: "purple", viewerColor: 0xFFFF0000 },
    { value: "shipped", label: "Отгружено", color: "success", viewerColor: 0xFF00FF00 },
];

interface Assembly {
    id: number;
    project_id: number;
    project_name: string;
    main_part_guid: string;
    assembly_guid: string;
    mark: string;
    axes: string;
    name: string;
    weight_model_t: number;
    work_status: string;
    speckle_object_id: string;
    kmd_date: string | null;
    ship_plan: string | null;
    ship_fact: string | null;
    manufacture_date: string | null;
}

type DataIndex = keyof Assembly;

export const ZmkProgram: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();
    const viewerRef = useRef<FullViewerRef>(null);
    const searchInput = useRef<InputRef>(null);

    const [data, setData] = useState<Assembly[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectName, setProjectName] = useState<string>("");
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRow, setSelectedRow] = useState<Assembly | null>(null);
    const [filteredInfo, setFilteredInfo] = useState<Record<string, FilterValue | null>>({});

    // Проверка есть ли активные фильтры
    const hasActiveFilters = Object.values(filteredInfo).some(v => v && v.length > 0);

    // Сброс фильтров таблицы
    const handleResetFilters = () => {
        setFilteredInfo({});
    };

    // Флаг готовности assemblyMap
    const [assemblyMapReady, setAssemblyMapReady] = useState(false);

    // Callback когда assemblyMap построен
    const handleAssemblyMapReady = useCallback((assemblyMap: AssemblyMap) => {
        console.log("📊 AssemblyMap ready in Program:", assemblyMap.size, "assemblies");
        setAssemblyMapReady(true);
    }, []);

    // Применение цветов по статусам
    const applyStatusColors = useCallback(() => {
        if (!viewerRef.current || !assemblyMapReady || data.length === 0) return;

        const statusColors: { assemblyGuid: string; color: number }[] = [];

        for (const row of data) {
            if (!row.assembly_guid) continue;

            const status = row.work_status || "model_not_ready";
            const statusOpt = WORK_STATUS_OPTIONS.find(opt => opt.value === status);
            const color = statusOpt?.viewerColor || 0xFFCCCCCC;

            statusColors.push({ assemblyGuid: row.assembly_guid, color });
        }

        if (statusColors.length > 0) {
            viewerRef.current.colorByStatus(statusColors);
            console.log("🎨 Applied status colors to", statusColors.length, "assemblies");
        }
    }, [assemblyMapReady, data]);

    // Применить цвета когда и данные и карта готовы
    useEffect(() => {
        applyStatusColors();
    }, [applyStatusColors]);

    // Загрузка данных
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const filterArr = [];
            if (projectId) filterArr.push({ field: "project_id", operator: "eq", value: projectId });

            const result = await dataProviderZmk.getList({
                resource: "v_program",
                pagination: { current: 1, pageSize: 500 },
                sorters: [{ field: "mark", order: "asc" }],
                filters: filterArr,
            });
            setData(result.data);

            // Get project name from first row
            if (result.data.length > 0 && result.data[0].project_name) {
                setProjectName(result.data[0].project_name);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            message.error("Ошибка загрузки данных");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Статистика
    const stats = useMemo(() => {
        const total = data.length;
        const totalWeight = data.reduce((sum, a) => sum + (a.weight_model_t || 0), 0);
        const byStatus: Record<string, { count: number; weight: number }> = {};

        WORK_STATUS_OPTIONS.forEach(opt => {
            byStatus[opt.value] = { count: 0, weight: 0 };
        });

        data.forEach(a => {
            const status = a.work_status || "model_not_ready";
            if (byStatus[status]) {
                byStatus[status].count++;
                byStatus[status].weight += a.weight_model_t || 0;
            }
        });

        const shippedWeight = byStatus.shipped?.weight || 0;

        return { total, totalWeight, byStatus, shippedWeight };
    }, [data]);

    // Обработка изменения статуса
    const handleWorkStatusChange = async (assemblyId: number, newStatus: string) => {
        try {
            await dataProviderZmk.update({
                resource: "assemblies",
                id: assemblyId,
                variables: { work_status: newStatus },
            });
            message.success("Статус обновлён");
            fetchData();
        } catch (error) {
            message.error("Ошибка обновления");
        }
    };

    // При выборе строки — подсветить в viewer
    const handleRowSelect = (record: Assembly) => {
        setSelectedRow(record);
        setSelectedRowKeys([record.id]);

        if (record.speckle_object_id && viewerRef.current) {
            viewerRef.current.highlightObjects([record.speckle_object_id]);
            viewerRef.current.fitToObjects([record.speckle_object_id]);
        }
    };

    // Column search filter
    const getColumnSearchProps = (dataIndex: DataIndex): ColumnType<Assembly> => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={`Поиск...`}
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => confirm()}
                    style={{ marginBottom: 8, display: "block" }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => confirm()}
                        icon={<SearchOutlined />}
                        size="small"
                    >
                        Найти
                    </Button>
                    <Button onClick={() => clearFilters && clearFilters()} size="small">
                        Сброс
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered: boolean) => (
            <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
        onFilter: (value, record) =>
            (record[dataIndex]
                ?.toString()
                .toLowerCase()
                .includes((value as string).toLowerCase())) || false,
        onFilterDropdownOpenChange: (visible) => {
            if (visible) {
                setTimeout(() => searchInput.current?.select(), 100);
            }
        },
    });

    // Columns
    const columns: ColumnsType<Assembly> = [
        {
            title: "Марка",
            dataIndex: "mark",
            key: "mark",
            width: 120,
            fixed: "left",
            sorter: (a, b) => (a.mark || "").localeCompare(b.mark || ""),
            ...getColumnSearchProps("mark"),
        },
        {
            title: "Оси",
            dataIndex: "axes",
            key: "axes",
            width: 100,
            ...getColumnSearchProps("axes"),
        },
        {
            title: "Наименование",
            dataIndex: "name",
            key: "name",
            width: 180,
            ellipsis: true,
            ...getColumnSearchProps("name"),
        },
        {
            title: "Вес (т)",
            dataIndex: "weight_model_t",
            key: "weight_model_t",
            width: 80,
            sorter: (a, b) => (a.weight_model_t || 0) - (b.weight_model_t || 0),
            render: (val: number) => val?.toFixed(3) || "—",
        },
        {
            title: "Статус",
            dataIndex: "work_status",
            key: "work_status",
            width: 160,
            filters: WORK_STATUS_OPTIONS.map(opt => ({ text: opt.label, value: opt.value })),
            onFilter: (value, record) => record.work_status === value,
            render: (val: string, record: Assembly) => {
                const statusOpt = WORK_STATUS_OPTIONS.find(o => o.value === val) || WORK_STATUS_OPTIONS[1];
                return (
                    <Select
                        size="small"
                        value={val || "model_not_ready"}
                        onChange={(v) => handleWorkStatusChange(record.id, v)}
                        style={{ width: "100%" }}
                        options={WORK_STATUS_OPTIONS.map(o => ({
                            value: o.value,
                            label: <Tag color={statusOpt.color === o.color ? statusOpt.color : o.color}>{o.label}</Tag>
                        }))}
                    />
                );
            },
        },
        {
            title: "КМД",
            dataIndex: "kmd_date",
            key: "kmd_date",
            width: 110,
            render: (val: string | null) => val ? dayjs(val).format("DD.MM.YY") : "—",
        },
        {
            title: "Отгрузка",
            dataIndex: "ship_fact",
            key: "ship_fact",
            width: 110,
            render: (val: string | null) => val ? dayjs(val).format("DD.MM.YY") : "—",
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
                    <span> / </span>
                    <span className="current">{projectName || `Проект #${projectId}`}</span>
                </div>

                {/* Back link */}
                <a className="zmk-back-link" onClick={() => navigate("/zmk/projects")} style={{ cursor: "pointer" }}>
                    <ArrowLeftOutlined /> К списку проектов
                </a>

                {/* Header */}
                <div className="zmk-header">
                    <div>
                        <Title level={2} className="zmk-title">
                            <BuildOutlined /> {projectName || "Производственная программа"}
                        </Title>
                    </div>
                    <Space>
                        <Button icon={<HistoryOutlined />} onClick={() => navigate("/zmk/audit")}>
                            Аудит
                        </Button>
                        <Button
                            icon={<ClearOutlined />}
                            onClick={handleResetFilters}
                            disabled={!hasActiveFilters}
                        >
                            Сбросить фильтры
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                            Обновить
                        </Button>
                    </Space>
                </div>

                {/* Statistics */}
                <div className="zmk-stats" style={{ marginBottom: 16 }}>
                    <div className="zmk-stat">
                        <span className="zmk-stat-value">{stats.total}</span>
                        <span className="zmk-stat-label">сборок</span>
                    </div>
                    <div className="zmk-stat">
                        <span className="zmk-stat-value">{stats.totalWeight.toFixed(1)}</span>
                        <span className="zmk-stat-label">тонн ∑</span>
                    </div>
                    <div className="zmk-stat">
                        <span className="zmk-stat-value">{stats.byStatus.model_done?.weight.toFixed(1) || 0}</span>
                        <span className="zmk-stat-label">т модель</span>
                    </div>
                    <div className="zmk-stat">
                        <span className="zmk-stat-value">{stats.byStatus.kmd_released?.weight.toFixed(1) || 0}</span>
                        <span className="zmk-stat-label">т КМД</span>
                    </div>
                    <div className="zmk-stat">
                        <span className="zmk-stat-value" style={{ color: "#52c41a" }}>{stats.shippedWeight.toFixed(1)}</span>
                        <span className="zmk-stat-label">т отгружено</span>
                    </div>
                </div>

                {/* Table */}
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    scroll={{ x: 900 }}
                    pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
                    rowSelection={{
                        type: "radio",
                        selectedRowKeys,
                        onChange: (keys) => setSelectedRowKeys(keys),
                    }}
                    onChange={(_, filters) => setFilteredInfo(filters)}
                    onRow={(record) => ({
                        onClick: () => handleRowSelect(record),
                        onDoubleClick: () => navigate(`/zmk/assemblies/${record.id}`),
                        style: { cursor: "pointer" },
                    })}
                />

                {/* 3D Viewer */}
                <div style={{ marginTop: 24 }}>
                    <Title level={4}>
                        <BuildOutlined /> 3D Модель
                        {selectedRow && <Text type="secondary" style={{ marginLeft: 12 }}>Выбрано: {selectedRow.mark}</Text>}
                    </Title>
                    <FullViewer
                        ref={viewerRef}
                        streamId={ZMK_SPECKLE_STREAM}
                        height={500}
                        showToolbar={true}
                        onAssemblyMapReady={handleAssemblyMapReady}
                        onObjectSelect={(element) => {
                            console.log("Selected in viewer:", element);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ZmkProgram;
