import React from "react";
import { Typography, Progress } from "antd";
import { useNavigate, Link } from "react-router-dom";
import {
    HomeOutlined, ProjectOutlined, TeamOutlined, WarningOutlined,
    CheckCircleOutlined, ClockCircleOutlined, RiseOutlined,
    DollarOutlined, CalendarOutlined, BarChartOutlined,
    ArrowLeftOutlined, ExclamationCircleOutlined
} from "@ant-design/icons";
import "../demo.css";

const { Title, Text } = Typography;

// Моковые данные для руководителя
const MANAGER_DATA = {
    // Общие KPI
    kpis: {
        totalProjects: 3,
        activeProjects: 2,
        totalBudget: 4850, // млн руб
        spentBudget: 2340,
        overallProgress: 48,
        onSchedule: 2,
        delayed: 1,
    },
    // Проекты с детализацией
    projects: [
        {
            id: "proj-1",
            name: "МГУ — Мостовой переход",
            status: "В работе",
            progress: 62,
            budget: 2400,
            spent: 1420,
            deadline: "2026-08-15",
            risk: "low",
            eventsTotal: 156,
            eventsValidated: 118,
            team: 24,
        },
        {
            id: "proj-2",
            name: "Транспортная развязка М-12",
            status: "В работе",
            progress: 35,
            budget: 1850,
            spent: 620,
            deadline: "2026-12-01",
            risk: "medium",
            eventsTotal: 89,
            eventsValidated: 42,
            team: 18,
        },
        {
            id: "proj-3",
            name: "Путепровод через ж/д",
            status: "Задержка",
            progress: 28,
            budget: 600,
            spent: 300,
            deadline: "2026-06-30",
            risk: "high",
            eventsTotal: 45,
            eventsValidated: 15,
            team: 12,
        },
    ],
    // Критические уведомления
    alerts: [
        { id: "a1", type: "delay", project: "Путепровод через ж/д", message: "Отставание от графика на 2 недели", date: "Сегодня" },
        { id: "a2", type: "budget", project: "МГУ — Мостовой переход", message: "Перерасход бюджета на арматуру +8%", date: "Вчера" },
        { id: "a3", type: "doc", project: "Транспортная развязка М-12", message: "12 событий ожидают валидации более 3 дней", date: "2 дня назад" },
    ],
    // Динамика за месяц
    monthlyStats: {
        eventsCreated: 67,
        eventsValidated: 54,
        documentsUploaded: 128,
        issues_resolved: 23,
    }
};

export const ManagerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const data = MANAGER_DATA;

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case "high": return "#ef4444";
            case "medium": return "#f59e0b";
            case "low": return "#22c55e";
            default: return "#6b7280";
        }
    };

    const getRiskLabel = (risk: string) => {
        switch (risk) {
            case "high": return "Высокий";
            case "medium": return "Средний";
            case "low": return "Низкий";
            default: return "—";
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
                    <span className="current">Руководитель</span>
                </div>

                {/* Header */}
                <div className="demo-page-header">
                    <div>
                        <Title level={2} className="demo-page-title">
                            📊 Дашборд руководителя
                        </Title>
                        <Text className="demo-page-subtitle">
                            Сводка по строительным проектам • {new Date().toLocaleDateString("ru-RU")}
                        </Text>
                    </div>
                    <button
                        className="demo-back-btn"
                        onClick={() => navigate("/")}
                    >
                        <ArrowLeftOutlined /> На главную
                    </button>
                </div>

                {/* Main KPIs */}
                <div className="demo-stats" style={{ marginBottom: 32 }}>
                    <div className="demo-stat-card">
                        <ProjectOutlined style={{ fontSize: 24, color: "#3b82f6", marginBottom: 8 }} />
                        <div className="demo-stat-value blue">{data.kpis.activeProjects}/{data.kpis.totalProjects}</div>
                        <div className="demo-stat-label">Активных проектов</div>
                    </div>
                    <div className="demo-stat-card highlight">
                        <RiseOutlined style={{ fontSize: 24, color: "#22c55e", marginBottom: 8 }} />
                        <div className="demo-stat-value green">{data.kpis.overallProgress}%</div>
                        <div className="demo-stat-label">Общий прогресс</div>
                    </div>
                    <div className="demo-stat-card">
                        <DollarOutlined style={{ fontSize: 24, color: "#8b5cf6", marginBottom: 8 }} />
                        <div className="demo-stat-value" style={{ color: "#8b5cf6" }}>
                            {(data.kpis.spentBudget / 1000).toFixed(1)} / {(data.kpis.totalBudget / 1000).toFixed(1)}
                        </div>
                        <div className="demo-stat-label">Бюджет (млрд ₽)</div>
                    </div>
                    <div className="demo-stat-card warning">
                        <WarningOutlined style={{ fontSize: 24, color: "#f59e0b", marginBottom: 8 }} />
                        <div className="demo-stat-value yellow">{data.kpis.delayed}</div>
                        <div className="demo-stat-label">С задержками</div>
                    </div>
                </div>

                {/* Alerts Section */}
                {data.alerts.length > 0 && (
                    <div className="demo-card" style={{ marginBottom: 24, borderColor: "rgba(239, 68, 68, 0.3)" }}>
                        <div className="demo-card-header">
                            <div className="demo-card-title" style={{ color: "#ef4444" }}>
                                <ExclamationCircleOutlined /> Требуют внимания ({data.alerts.length})
                            </div>
                        </div>
                        <div className="demo-card-body" style={{ padding: 0 }}>
                            {data.alerts.map(alert => (
                                <div key={alert.id} className="manager-alert-item">
                                    <div className="manager-alert-icon">
                                        {alert.type === "delay" && <ClockCircleOutlined style={{ color: "#ef4444" }} />}
                                        {alert.type === "budget" && <DollarOutlined style={{ color: "#f59e0b" }} />}
                                        {alert.type === "doc" && <CalendarOutlined style={{ color: "#3b82f6" }} />}
                                    </div>
                                    <div className="manager-alert-content">
                                        <div className="manager-alert-project">{alert.project}</div>
                                        <div className="manager-alert-message">{alert.message}</div>
                                    </div>
                                    <div className="manager-alert-date">{alert.date}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Projects Overview */}
                <div className="demo-card">
                    <div className="demo-card-header">
                        <div className="demo-card-title">
                            <BarChartOutlined /> Статус проектов
                        </div>
                    </div>
                    <div className="demo-card-body" style={{ padding: 0 }}>
                        <table className="demo-table">
                            <thead>
                                <tr>
                                    <th>Проект</th>
                                    <th style={{ width: 100 }}>Прогресс</th>
                                    <th style={{ width: 120 }}>Бюджет (млн)</th>
                                    <th style={{ width: 80 }}>Риск</th>
                                    <th style={{ width: 100 }}>Документы</th>
                                    <th style={{ width: 80 }}>Команда</th>
                                    <th style={{ width: 100 }}>Срок</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.projects.map(proj => (
                                    <tr key={proj.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{proj.name}</div>
                                            <div style={{
                                                fontSize: 12,
                                                color: proj.status === "Задержка" ? "#ef4444" : "rgba(255,255,255,0.5)"
                                            }}>
                                                {proj.status}
                                            </div>
                                        </td>
                                        <td>
                                            <Progress
                                                percent={proj.progress}
                                                size="small"
                                                strokeColor={proj.progress >= 50 ? "#22c55e" : "#f59e0b"}
                                            />
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 14 }}>
                                                <span style={{ color: "#22c55e" }}>{proj.spent}</span>
                                                <span style={{ color: "rgba(255,255,255,0.4)" }}> / {proj.budget}</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                                                {((proj.spent / proj.budget) * 100).toFixed(0)}% освоено
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 6,
                                                padding: "4px 10px",
                                                borderRadius: 12,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                background: `${getRiskColor(proj.risk)}20`,
                                                color: getRiskColor(proj.risk),
                                            }}>
                                                ● {getRiskLabel(proj.risk)}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <CheckCircleOutlined style={{ color: "#22c55e" }} />
                                                <span>{proj.eventsValidated}</span>
                                                <span style={{ color: "rgba(255,255,255,0.4)" }}>/ {proj.eventsTotal}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <TeamOutlined style={{ color: "#3b82f6" }} />
                                                <span>{proj.team}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13 }}>
                                                {new Date(proj.deadline).toLocaleDateString("ru-RU", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "2-digit"
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Monthly Summary */}
                <div className="demo-stats" style={{ marginTop: 24 }}>
                    <div className="demo-stat-card">
                        <div className="demo-stat-value">{data.monthlyStats.eventsCreated}</div>
                        <div className="demo-stat-label">Событий за месяц</div>
                    </div>
                    <div className="demo-stat-card success">
                        <div className="demo-stat-value green">{data.monthlyStats.eventsValidated}</div>
                        <div className="demo-stat-label">Валидировано</div>
                    </div>
                    <div className="demo-stat-card">
                        <div className="demo-stat-value">{data.monthlyStats.documentsUploaded}</div>
                        <div className="demo-stat-label">Документов загружено</div>
                    </div>
                    <div className="demo-stat-card highlight">
                        <div className="demo-stat-value blue">{data.monthlyStats.issues_resolved}</div>
                        <div className="demo-stat-label">Вопросов закрыто</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
