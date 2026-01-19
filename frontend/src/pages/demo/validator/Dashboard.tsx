import React, { useState } from "react";
import { Button, Typography, Badge } from "antd";
import { useNavigate, Link } from "react-router-dom";
import {
    CheckCircleOutlined, ClockCircleOutlined,
    HomeOutlined, EyeOutlined, LinkOutlined
} from "@ant-design/icons";
import { DEMO_EVENTS, STATUS_CONFIG, TYPE_CONFIG, DemoEvent } from "../mockData";
import "../demo.css";

const { Title, Text } = Typography;

export const ValidatorDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [events] = useState<DemoEvent[]>(DEMO_EVENTS);

    const queue = events.filter(e => e.status === "На_валидации");
    const drafts = events.filter(e => e.status === "Черновик");
    const validated = events.filter(e => e.status === "Валидировано");

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
                    <Link to="/demo"><HomeOutlined /> Демо</Link>
                    <span> / </span>
                    <span className="current">Валидатор</span>
                </div>

                {/* Header */}
                <div className="demo-page-header">
                    <div>
                        <Title level={2} className="demo-page-title">
                            📋 Очередь валидации
                        </Title>
                        <Text className="demo-page-subtitle">
                            BIM-координатор — Проверка и связывание данных
                        </Text>
                    </div>
                </div>

                {/* Statistics */}
                <div className="demo-stats">
                    <div className="demo-stat-card highlight">
                        <ClockCircleOutlined style={{ fontSize: 24, color: "#3b82f6", marginBottom: 8 }} />
                        <div className="demo-stat-value blue">{queue.length}</div>
                        <div className="demo-stat-label">На валидации</div>
                    </div>
                    <div className="demo-stat-card">
                        <ClockCircleOutlined style={{ fontSize: 24, color: "#6b7280", marginBottom: 8 }} />
                        <div className="demo-stat-value">{drafts.length}</div>
                        <div className="demo-stat-label">Черновики (ожидают)</div>
                    </div>
                    <div className="demo-stat-card success">
                        <CheckCircleOutlined style={{ fontSize: 24, color: "#22c55e", marginBottom: 8 }} />
                        <div className="demo-stat-value green">{validated.length}</div>
                        <div className="demo-stat-label">Валидировано сегодня</div>
                    </div>
                </div>

                {/* Queue */}
                <div className="demo-card">
                    <div className="demo-card-header">
                        <div className="demo-card-title">
                            <Badge status="processing" />
                            <span style={{ marginLeft: 8 }}>Требуют проверки</span>
                            <span className="demo-tag pending" style={{ marginLeft: 12 }}>{queue.length}</span>
                        </div>
                    </div>
                    <div className="demo-card-body" style={{ padding: 0 }}>
                        {queue.length === 0 ? (
                            <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                                Очередь пуста — все события проверены! 🎉
                            </div>
                        ) : (
                            <table className="demo-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 50 }}>Тип</th>
                                        <th>Событие</th>
                                        <th style={{ width: 140 }}>Автор</th>
                                        <th style={{ width: 100 }}>Дата</th>
                                        <th style={{ width: 200 }}>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {queue.map(evt => (
                                        <tr key={evt.id}>
                                            <td>
                                                <span style={{ fontSize: 20 }}>{TYPE_CONFIG[evt.type]?.icon}</span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{evt.title}</div>
                                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                                                    📍 {evt.object}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <div style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: "50%",
                                                        background: "#3b82f6",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: 12,
                                                        fontWeight: 700
                                                    }}>
                                                        {evt.author.charAt(0)}
                                                    </div>
                                                    <span>{evt.author}</span>
                                                </div>
                                            </td>
                                            <td>{evt.createdAt}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <Button
                                                        type="primary"
                                                        icon={<EyeOutlined />}
                                                        onClick={() => navigate(`/demo/validator/event/${evt.id}`)}
                                                    >
                                                        Открыть
                                                    </Button>
                                                    <Button
                                                        icon={<LinkOutlined />}
                                                        onClick={() => navigate(`/demo/validator/link/${evt.id}`)}
                                                        style={{
                                                            background: "rgba(255,255,255,0.06)",
                                                            border: "1px solid rgba(255,255,255,0.15)",
                                                            color: "#fff"
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* All Events */}
                <div className="demo-card" style={{ marginTop: 24 }}>
                    <div className="demo-card-header">
                        <div className="demo-card-title">Все события</div>
                    </div>
                    <div className="demo-card-body" style={{ padding: 0 }}>
                        <table className="demo-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 50 }}>Тип</th>
                                    <th>Событие</th>
                                    <th style={{ width: 130 }}>Статус</th>
                                    <th style={{ width: 140 }}>Автор</th>
                                    <th style={{ width: 100 }}>Дата</th>
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
                                                📍 {evt.object}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`demo-tag ${getStatusClass(evt.status)}`}>
                                                {STATUS_CONFIG[evt.status]?.label}
                                            </span>
                                        </td>
                                        <td>{evt.author}</td>
                                        <td>{evt.createdAt}</td>
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

export default ValidatorDashboard;
