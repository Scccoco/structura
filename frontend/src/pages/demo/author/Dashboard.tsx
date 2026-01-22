import React, { useState } from "react";
import { Button, Typography, message, Modal } from "antd";
import { useNavigate, Link } from "react-router-dom";
import {
    PlusOutlined, FileTextOutlined, ClockCircleOutlined,
    CheckCircleOutlined, ExclamationCircleOutlined, HomeOutlined,
    SendOutlined, EyeOutlined, EditOutlined, ArrowLeftOutlined
} from "@ant-design/icons";
import { DEMO_EVENTS, STATUS_CONFIG, TYPE_CONFIG, DemoEvent } from "../mockData";
import "../demo.css";

const { Title, Text } = Typography;

export const AuthorDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<DemoEvent[]>(DEMO_EVENTS.filter(e =>
        e.author === "Иванов А.И." || e.status === "Черновик" || e.status === "Возврат"
    ));

    // Статистика
    const drafts = events.filter(e => e.status === "Черновик").length;
    const pending = events.filter(e => e.status === "На_валидации").length;
    const returns = events.filter(e => e.status === "Возврат").length;
    const validated = events.filter(e => e.status === "Валидировано").length;

    const handleSend = (id: string) => {
        setEvents(prev => prev.map(e =>
            e.id === id ? { ...e, status: "На_валидации" as const } : e
        ));
        message.success("Событие отправлено на валидацию");
    };

    const handleView = (evt: DemoEvent) => {
        Modal.info({
            title: evt.title,
            content: (
                <div>
                    <p><strong>Тип:</strong> {TYPE_CONFIG[evt.type]?.icon} {evt.type}</p>
                    <p><strong>Объект:</strong> {evt.object}</p>
                    <p><strong>Файлы:</strong> {evt.files.join(", ")}</p>
                    {evt.comment && <p><strong>Комментарий:</strong> {evt.comment}</p>}
                </div>
            ),
            width: 500,
        });
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case "Черновик": return "draft";
            case "На_валидации": return "pending";
            case "Валидировано": return "validated";
            case "Возврат": return "returned";
            default: return "draft";
        }
    };

    return (
        <div className="demo-container">
            <div className="demo-content">
                {/* Breadcrumb */}
                <div className="demo-breadcrumb">
                    <Link to="/"><HomeOutlined /> Главная</Link>
                    <span> / </span>
                    <Link to="/demo">Демо</Link>
                    <span> / </span>
                    <span className="current">Инженер (Автор)</span>
                </div>

                {/* Header */}
                <div className="demo-page-header">
                    <div>
                        <Title level={2} className="demo-page-title">
                            👷 Мои события
                        </Title>
                        <Text className="demo-page-subtitle">Иванов А.И. — Инженер ПТО</Text>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <button
                            className="demo-back-btn"
                            onClick={() => navigate("/")}
                        >
                            <ArrowLeftOutlined /> На главную
                        </button>
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            className="demo-btn-primary"
                            style={{ width: "auto", padding: "0 32px" }}
                            onClick={() => navigate("/demo/author/create")}
                        >
                            Создать событие
                        </Button>
                    </div>
                </div>

                {/* Statistics */}
                <div className="demo-stats">
                    <div className="demo-stat-card">
                        <ClockCircleOutlined style={{ fontSize: 24, color: "#6b7280", marginBottom: 8 }} />
                        <div className="demo-stat-value">{drafts}</div>
                        <div className="demo-stat-label">Черновики</div>
                    </div>
                    <div className="demo-stat-card highlight">
                        <ClockCircleOutlined style={{ fontSize: 24, color: "#3b82f6", marginBottom: 8 }} />
                        <div className="demo-stat-value blue">{pending}</div>
                        <div className="demo-stat-label">На валидации</div>
                    </div>
                    <div className="demo-stat-card warning">
                        <ExclamationCircleOutlined style={{ fontSize: 24, color: "#f59e0b", marginBottom: 8 }} />
                        <div className="demo-stat-value yellow">{returns}</div>
                        <div className="demo-stat-label">Возвраты</div>
                    </div>
                    <div className="demo-stat-card success">
                        <CheckCircleOutlined style={{ fontSize: 24, color: "#22c55e", marginBottom: 8 }} />
                        <div className="demo-stat-value green">{validated}</div>
                        <div className="demo-stat-label">Валидировано</div>
                    </div>
                </div>

                {/* Events Table */}
                <div className="demo-card">
                    <div className="demo-card-header">
                        <div className="demo-card-title">
                            <FileTextOutlined /> Все события ({events.length})
                        </div>
                    </div>
                    <div className="demo-card-body" style={{ padding: 0 }}>
                        <table className="demo-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 50 }}>Тип</th>
                                    <th>Название</th>
                                    <th style={{ width: 130 }}>Статус</th>
                                    <th style={{ width: 100 }}>Дата</th>
                                    <th style={{ width: 70 }}>Файлы</th>
                                    <th style={{ width: 180 }}>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map(evt => (
                                    <tr key={evt.id}>
                                        <td>
                                            <span style={{ fontSize: 20 }}>{TYPE_CONFIG[evt.type]?.icon}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{evt.title}</div>
                                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                                                {evt.object} • {evt.project}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`demo-tag ${getStatusClass(evt.status)}`}>
                                                {STATUS_CONFIG[evt.status]?.label}
                                            </span>
                                        </td>
                                        <td>{evt.createdAt}</td>
                                        <td>
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                                color: "#3b82f6"
                                            }}>
                                                <FileTextOutlined />
                                                {evt.files.length}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                {evt.status === "Черновик" && (
                                                    <Button
                                                        size="small"
                                                        type="primary"
                                                        icon={<SendOutlined />}
                                                        onClick={() => handleSend(evt.id)}
                                                    >
                                                        Отправить
                                                    </Button>
                                                )}
                                                {evt.status === "Возврат" && (
                                                    <Button
                                                        size="small"
                                                        icon={<EditOutlined />}
                                                        onClick={() => navigate(`/demo/author/edit/${evt.id}`)}
                                                    >
                                                        Исправить
                                                    </Button>
                                                )}
                                                <Button
                                                    size="small"
                                                    icon={<EyeOutlined />}
                                                    onClick={() => handleView(evt)}
                                                >
                                                    Просмотр
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthorDashboard;
