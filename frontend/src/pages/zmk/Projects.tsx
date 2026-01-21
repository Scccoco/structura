/**
 * ЗМК - Список проектов
 * /zmk/projects
 * Отображает модели из Speckle stream как подпроекты
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    Typography, Card, Row, Col, Button, Spin, Tag, Empty, message
} from "antd";
import { useNavigate, Link } from "react-router-dom";
import {
    HomeOutlined, ReloadOutlined, FolderOutlined,
    AppstoreOutlined, ClockCircleOutlined
} from "@ant-design/icons";
import { dataProviderZmk } from "../../providers/dataProviderZmk";
import "./zmk.css";

const { Title, Text, Paragraph } = Typography;

// ZMK Speckle Config
const ZMK_SPECKLE_SERVER = "https://speckle.structura-most.ru";
const ZMK_SPECKLE_TOKEN = "95184e89f7abe8d350cc6bb70ce69b606dba95b7bf";
const ZMK_SPECKLE_STREAM = "99d6211223";

interface SpeckleModel {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

interface Project {
    id: number;
    speckle_model_id: string;
    name: string;
    description?: string;
    status: string;
    created_at: string;
}

export const ZmkProjects: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [speckleModels, setSpeckleModels] = useState<SpeckleModel[]>([]);
    const [dbProjects, setDbProjects] = useState<Project[]>([]);
    const [syncing, setSyncing] = useState(false);

    // Fetch models from Speckle stream (branches = models)
    const fetchSpeckleModels = useCallback(async () => {
        try {
            // GraphQL query to get models (branches) from stream
            const response = await fetch(`${ZMK_SPECKLE_SERVER}/graphql`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${ZMK_SPECKLE_TOKEN}`,
                },
                body: JSON.stringify({
                    query: `
                        query GetModels($streamId: String!) {
                            stream(id: $streamId) {
                                branches {
                                    items {
                                        id
                                        name
                                        description
                                        createdAt
                                        updatedAt
                                    }
                                }
                            }
                        }
                    `,
                    variables: { streamId: ZMK_SPECKLE_STREAM },
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data?.stream?.branches?.items) {
                    // Filter out 'main' branch, others are models
                    const models = data.data.stream.branches.items.filter(
                        (b: any) => b.name !== "main"
                    );
                    setSpeckleModels(models);
                }
            }
        } catch (error) {
            console.error("Speckle fetch error:", error);
        }
    }, []);

    // Fetch projects from database
    const fetchDbProjects = useCallback(async () => {
        try {
            const result = await dataProviderZmk.getList({
                resource: "projects",
                pagination: { current: 1, pageSize: 100 },
                sorters: [{ field: "created_at", order: "desc" }],
            });
            setDbProjects(result.data);
        } catch (error) {
            console.error("DB fetch error:", error);
        }
    }, []);

    // Load all data
    const loadData = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchSpeckleModels(), fetchDbProjects()]);
        setLoading(false);
    }, [fetchSpeckleModels, fetchDbProjects]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Sync: create DB project from Speckle model
    const syncProject = async (model: SpeckleModel) => {
        setSyncing(true);
        try {
            await dataProviderZmk.create({
                resource: "projects",
                variables: {
                    speckle_model_id: model.id,
                    name: model.name,
                    description: model.description || "",
                    status: "active",
                },
            });
            message.success(`Проект "${model.name}" создан`);
            await fetchDbProjects();
        } catch (error) {
            console.error("Sync error:", error);
            message.error("Ошибка создания проекта");
        } finally {
            setSyncing(false);
        }
    };

    // Check if model is already synced
    const isModelSynced = (modelId: string) => {
        return dbProjects.some(p => p.speckle_model_id === modelId);
    };

    // Get DB project for model
    const getProjectForModel = (modelId: string) => {
        return dbProjects.find(p => p.speckle_model_id === modelId);
    };

    return (
        <div className="zmk-container">
            <div className="zmk-content">
                {/* Breadcrumb */}
                <div className="zmk-breadcrumb">
                    <Link to="/"><HomeOutlined /> Главная</Link>
                    <span> / </span>
                    <span className="current">ЗМК — Проекты</span>
                </div>

                {/* Header */}
                <div className="zmk-header">
                    <div>
                        <Title level={2} className="zmk-title">
                            <AppstoreOutlined /> Проекты ЗМК
                        </Title>
                        <Text className="zmk-subtitle">
                            Модели из Speckle = отдельные подпроекты
                        </Text>
                    </div>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadData}
                        loading={loading}
                    >
                        Обновить
                    </Button>
                </div>

                {/* Stats */}
                <div className="zmk-stats">
                    <div className="zmk-stat">
                        <span className="zmk-stat-value">{speckleModels.length}</span>
                        <span className="zmk-stat-label">Моделей в Speckle</span>
                    </div>
                    <div className="zmk-stat">
                        <span className="zmk-stat-value">{dbProjects.length}</span>
                        <span className="zmk-stat-label">Проектов в системе</span>
                    </div>
                </div>

                {/* Content */}
                <Spin spinning={loading}>
                    {speckleModels.length === 0 && !loading ? (
                        <Card className="zmk-card">
                            <Empty
                                description="Нет моделей в Speckle stream. Загрузите модели через Tekla Connector."
                            />
                        </Card>
                    ) : (
                        <Row gutter={[16, 16]}>
                            {speckleModels.map(model => {
                                const synced = isModelSynced(model.id);
                                const project = getProjectForModel(model.id);

                                return (
                                    <Col xs={24} sm={12} lg={8} key={model.id}>
                                        <Card
                                            className="zmk-project-card"
                                            hoverable={synced}
                                            onClick={() => synced && project && navigate(`/zmk/projects/${project.id}`)}
                                        >
                                            <div className="zmk-project-header">
                                                <FolderOutlined className="zmk-project-icon" />
                                                <div className="zmk-project-status">
                                                    {synced ? (
                                                        <Tag color="success">Синхронизирован</Tag>
                                                    ) : (
                                                        <Tag color="warning">Не синхронизирован</Tag>
                                                    )}
                                                </div>
                                            </div>
                                            <Title level={4} className="zmk-project-name">
                                                {model.name}
                                            </Title>
                                            {model.description && (
                                                <Paragraph
                                                    className="zmk-project-description"
                                                    ellipsis={{ rows: 2 }}
                                                >
                                                    {model.description}
                                                </Paragraph>
                                            )}
                                            <div className="zmk-project-meta">
                                                <ClockCircleOutlined />
                                                <span>
                                                    {new Date(model.updatedAt).toLocaleDateString("ru-RU")}
                                                </span>
                                            </div>
                                            {!synced && (
                                                <Button
                                                    type="primary"
                                                    block
                                                    style={{ marginTop: 12 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        syncProject(model);
                                                    }}
                                                    loading={syncing}
                                                >
                                                    Создать проект
                                                </Button>
                                            )}
                                            {synced && (
                                                <Button
                                                    type="default"
                                                    block
                                                    style={{ marginTop: 12 }}
                                                >
                                                    Открыть проект
                                                </Button>
                                            )}
                                        </Card>
                                    </Col>
                                );
                            })}

                            {/* Show DB-only projects (no Speckle model) */}
                            {dbProjects
                                .filter(p => !speckleModels.some(m => m.id === p.speckle_model_id))
                                .map(project => (
                                    <Col xs={24} sm={12} lg={8} key={`db-${project.id}`}>
                                        <Card
                                            className="zmk-project-card"
                                            hoverable
                                            onClick={() => navigate(`/zmk/projects/${project.id}`)}
                                        >
                                            <div className="zmk-project-header">
                                                <FolderOutlined className="zmk-project-icon" />
                                                <Tag color="blue">Только в БД</Tag>
                                            </div>
                                            <Title level={4} className="zmk-project-name">
                                                {project.name}
                                            </Title>
                                            <Button type="default" block style={{ marginTop: 12 }}>
                                                Открыть проект
                                            </Button>
                                        </Card>
                                    </Col>
                                ))
                            }
                        </Row>
                    )}
                </Spin>
            </div>
        </div>
    );
};

export default ZmkProjects;
