/**
 * Страница проектов - Управление строительством
 * /projects
 * Отображает проекты (streams) из Speckle
 */
import { useState, useEffect } from "react";
import { Spin, Typography, Button } from "antd";
import { useNavigate, Link } from "react-router-dom";
import {
    HomeOutlined, ReloadOutlined, FolderOpenOutlined,
    ClockCircleOutlined, BranchesOutlined, ArrowRightOutlined,
    InboxOutlined
} from "@ant-design/icons";
import "./projects.css";

const { Title, Text, Paragraph } = Typography;

interface SpeckleStream {
    id: string;
    name: string;
    description: string;
    updatedAt: string;
    createdAt: string;
    commits: {
        items: Array<{
            id: string;
            message: string;
            referencedObject: string;
        }>;
    };
}

const SPECKLE_SERVER = "https://speckle.structura-most.ru";
const SPECKLE_TOKEN = "b47015ff123fc23131070342b14043c1b8a657dfb7";

const GET_STREAMS_QUERY = `
  query GetStreams {
    streams(limit: 100) {
      items {
        id
        name
        description
        updatedAt
        createdAt
        commits(limit: 1) {
          items {
            id
            message
            referencedObject
          }
        }
      }
    }
  }
`;

export const ProjectList = () => {
    const [streams, setStreams] = useState<SpeckleStream[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStreams();
    }, []);

    const fetchStreams = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${SPECKLE_SERVER}/graphql`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SPECKLE_TOKEN}`
                },
                body: JSON.stringify({
                    query: GET_STREAMS_QUERY
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            setStreams(data.data.streams.items);
        } catch (e: any) {
            console.error("Ошибка загрузки проектов:", e);
            setError(e?.message || "Не удалось загрузить список проектов");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="projects-container">
                <div className="projects-content">
                    <div className="projects-loading">
                        <Spin size="large" />
                        <span className="projects-loading-text">Загрузка проектов...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="projects-container">
                <div className="projects-content">
                    <div className="projects-breadcrumb">
                        <Link to="/"><HomeOutlined /> Главная</Link>
                        <span> / </span>
                        <span className="current">Управление строительством</span>
                    </div>
                    <div className="projects-error">
                        <Title level={4} style={{ color: '#ef4444', marginBottom: 8 }}>
                            Ошибка загрузки
                        </Title>
                        <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                            {error}
                        </Text>
                        <br />
                        <button className="projects-btn-retry" onClick={fetchStreams}>
                            Повторить загрузку
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="projects-container">
            <div className="projects-content">
                {/* Breadcrumb */}
                <div className="projects-breadcrumb">
                    <Link to="/"><HomeOutlined /> Главная</Link>
                    <span> / </span>
                    <span className="current">Управление строительством</span>
                </div>

                {/* Header */}
                <div className="projects-header">
                    <div className="projects-header-left">
                        <Title level={2} className="projects-title">
                            <FolderOpenOutlined />
                            Управление строительством
                        </Title>
                        <Text className="projects-subtitle">
                            Проекты из Speckle — 3D модели и документация
                        </Text>
                    </div>
                    <div className="projects-header-actions">
                        <Button
                            className="projects-btn-refresh"
                            icon={<ReloadOutlined />}
                            onClick={fetchStreams}
                            loading={loading}
                        >
                            Обновить
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="projects-stats">
                    <div className="projects-stat">
                        <span className="projects-stat-value">{streams.length}</span>
                        <span className="projects-stat-label">Всего проектов</span>
                    </div>
                </div>

                {/* Content */}
                {streams.length === 0 ? (
                    <div className="projects-empty">
                        <InboxOutlined className="projects-empty-icon" />
                        <Title level={4} className="projects-empty-title">
                            Проекты не найдены
                        </Title>
                        <Text className="projects-empty-text">
                            Загрузите модели через Speckle Connector
                        </Text>
                    </div>
                ) : (
                    <div className="projects-grid">
                        {streams.map((stream) => (
                            <div
                                key={stream.id}
                                className="project-card"
                                onClick={() => navigate(`/projects/${stream.id}/viewer`)}
                            >
                                <div className="project-card-header">
                                    <div className="project-icon">
                                        <FolderOpenOutlined />
                                    </div>
                                    <span className="project-status-tag active">
                                        Активный
                                    </span>
                                </div>

                                <div className="project-card-content">
                                    <Title level={4} className="project-name">
                                        {stream.name}
                                    </Title>
                                    <Paragraph
                                        className="project-description"
                                        ellipsis={{ rows: 2 }}
                                    >
                                        {stream.description || "Нет описания проекта"}
                                    </Paragraph>
                                </div>

                                <div className="project-card-meta">
                                    <div className="project-meta-item">
                                        <ClockCircleOutlined />
                                        <span>{formatDate(stream.updatedAt)}</span>
                                    </div>
                                    {stream.commits.items[0] && (
                                        <div className="project-meta-item">
                                            <BranchesOutlined />
                                            <span>
                                                {stream.commits.items[0].message?.slice(0, 25) || "Новый коммит"}
                                                {stream.commits.items[0].message?.length > 25 ? "..." : ""}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="project-card-action">
                                    <Button className="project-btn-open">
                                        Открыть проект <ArrowRightOutlined />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
