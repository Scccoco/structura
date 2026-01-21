/**
 * ЗМК - Аудит
 * /zmk/audit
 * Просмотр журнала изменений
 */
import React, { useState, useEffect, useCallback } from "react";
import { Table, Typography, Space, Button, Input, Tag, Card, Spin } from "antd";
import { useNavigate, Link } from "react-router-dom";
import { HomeOutlined, ReloadOutlined, SearchOutlined, HistoryOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { dataProviderZmk } from "../../providers/dataProviderZmk";
import "./zmk.css";

const { Title, Text } = Typography;

interface AuditLog {
    id: number;
    action: string;
    entity_id: string;
    payload: any;
    actor: string;
    created_at: string;
}

export const ZmkAudit: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterActor, setFilterActor] = useState("");
    const [filterEntity, setFilterEntity] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const filters = [];
            if (filterActor) filters.push({ field: "actor", operator: "ilike", value: `*${filterActor}*` });
            if (filterEntity) filters.push({ field: "entity_id", operator: "ilike", value: `*${filterEntity}*` });

            const result = await dataProviderZmk.getList({
                resource: "audit_log",
                pagination: { current: 1, pageSize: 200 },
                sorters: [{ field: "created_at", order: "desc" }],
                filters,
            });
            setData(result.data);
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [filterActor, filterEntity]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns = [
        {
            title: "Время",
            dataIndex: "created_at",
            key: "created_at",
            width: 180,
            render: (val: string) => dayjs(val).format("DD.MM.YYYY HH:mm:ss"),
        },
        {
            title: "Пользователь",
            dataIndex: "actor",
            key: "actor",
            width: 120,
        },
        {
            title: "Действие",
            dataIndex: "action",
            key: "action",
            width: 100,
            render: (val: string) => {
                const color = val === "INSERT" ? "green" : val === "UPDATE" ? "blue" : "default";
                return <Tag color={color}>{val}</Tag>;
            },
        },
        {
            title: "Сущность",
            dataIndex: "entity_id",
            key: "entity_id",
            width: 200,
            render: (val: string) => {
                // format: assembly_id:stage_code
                const [asmId, stageCode] = val.split(":");
                return (
                    <Space>
                        <a onClick={() => navigate(`/zmk/assemblies/${asmId}`)}>
                            Сборка #{asmId}
                        </a>
                        {stageCode && <Tag>{stageCode}</Tag>}
                    </Space>
                );
            },
        },
        {
            title: "Данные",
            dataIndex: "payload",
            key: "payload",
            render: (val: any) => (
                <Text
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}
                    ellipsis={{ tooltip: JSON.stringify(val, null, 2) }}
                >
                    {JSON.stringify(val)}
                </Text>
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
                    <Link to="/zmk/program">ЗМК</Link>
                    <span> / </span>
                    <span className="current">Аудит</span>
                </div>

                {/* Header */}
                <div className="zmk-header">
                    <div>
                        <Title level={2} className="zmk-title">
                            <HistoryOutlined /> Журнал изменений
                        </Title>
                        <Text className="zmk-subtitle">
                            Все изменения этапов производства
                        </Text>
                    </div>
                    <Space>
                        <Button
                            onClick={() => navigate("/zmk/program")}
                        >
                            ← К программе
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
                    <Space>
                        <Input
                            placeholder="Фильтр по пользователю..."
                            prefix={<SearchOutlined />}
                            value={filterActor}
                            onChange={(e) => setFilterActor(e.target.value)}
                            style={{ width: 200 }}
                            allowClear
                        />
                        <Input
                            placeholder="Фильтр по сборке (ID)..."
                            value={filterEntity}
                            onChange={(e) => setFilterEntity(e.target.value)}
                            style={{ width: 200 }}
                            allowClear
                        />
                    </Space>
                </Card>

                {/* Table */}
                <Card className="zmk-table-card">
                    <Spin spinning={loading}>
                        <Table
                            dataSource={data}
                            columns={columns}
                            rowKey="id"
                            size="small"
                            pagination={{
                                pageSize: 50,
                                showTotal: (total) => `Записей: ${total}`,
                            }}
                        />
                    </Spin>
                </Card>
            </div>
        </div>
    );
};

export default ZmkAudit;
