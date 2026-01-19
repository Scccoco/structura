import React, { useState } from "react";
import { Button, Typography, Modal, message } from "antd";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    HomeOutlined, ArrowLeftOutlined, CheckCircleOutlined,
    RollbackOutlined, LinkOutlined, FileOutlined,
    FilePdfOutlined, FileImageOutlined
} from "@ant-design/icons";
import { DEMO_EVENTS, STATUS_CONFIG, TYPE_CONFIG } from "../mockData";
import "../demo.css";

const { Title, Text, Paragraph } = Typography;

const getFileIcon = (filename: string) => {
    if (filename.endsWith(".pdf")) return <FilePdfOutlined style={{ color: "#ef4444" }} />;
    if (filename.match(/\.(jpg|jpeg|png)$/i)) return <FileImageOutlined style={{ color: "#22c55e" }} />;
    return <FileOutlined style={{ color: "#3b82f6" }} />;
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

export const EventCard: React.FC = () => {
    const navigate = useNavigate();
    const { eventId } = useParams<{ eventId: string }>();
    const [returnModalVisible, setReturnModalVisible] = useState(false);
    const [returnReason, setReturnReason] = useState("");

    const event = DEMO_EVENTS.find(e => e.id === eventId);

    if (!event) {
        return (
            <div className="demo-container">
                <div className="demo-content">
                    <Title level={3} style={{ color: "#fff" }}>Событие не найдено</Title>
                    <Button onClick={() => navigate("/demo/validator")}>Назад</Button>
                </div>
            </div>
        );
    }

    const handleValidate = () => {
        Modal.confirm({
            title: "Подтвердить валидацию?",
            content: "Событие будет переведено в статус «Валидировано».",
            okText: "Валидировать",
            cancelText: "Отмена",
            onOk: () => {
                message.success("Событие валидировано!");
                navigate("/demo/validator");
            }
        });
    };

    const handleReturn = () => {
        if (!returnReason.trim()) {
            message.warning("Укажите причину возврата");
            return;
        }
        message.info("Событие возвращено автору");
        setReturnModalVisible(false);
        navigate("/demo/validator");
    };

    return (
        <div className="demo-container">
            <div className="demo-content">
                {/* Breadcrumb */}
                <div className="demo-breadcrumb">
                    <Link to="/demo"><HomeOutlined /> Демо</Link>
                    <span> / </span>
                    <Link to="/demo/validator">Валидатор</Link>
                    <span> / </span>
                    <span className="current">Событие {event.id}</span>
                </div>

                {/* Back */}
                <a
                    className="demo-back-link"
                    onClick={() => navigate("/demo/validator")}
                    style={{ cursor: "pointer" }}
                >
                    <ArrowLeftOutlined /> К очереди
                </a>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
                    {/* Main Content */}
                    <div className="demo-card">
                        <div className="demo-card-header">
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: 28 }}>{TYPE_CONFIG[event.type]?.icon}</span>
                                <div>
                                    <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
                                        {event.title}
                                    </div>
                                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                                        {event.createdAt} • {event.author}
                                    </div>
                                </div>
                            </div>
                            <span className={`demo-tag ${getStatusClass(event.status)}`}>
                                {STATUS_CONFIG[event.status]?.label}
                            </span>
                        </div>
                        <div className="demo-card-body">
                            {/* Details */}
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 16,
                                marginBottom: 24,
                                padding: 16,
                                background: "rgba(255,255,255,0.03)",
                                borderRadius: 8
                            }}>
                                <div>
                                    <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Тип события</Text>
                                    <div style={{ color: "#fff" }}>{TYPE_CONFIG[event.type]?.icon} {event.type}</div>
                                </div>
                                <div>
                                    <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Проект</Text>
                                    <div style={{ color: "#fff" }}>{event.project}</div>
                                </div>
                                <div style={{ gridColumn: "span 2" }}>
                                    <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Объект</Text>
                                    <div style={{ color: "#fff" }}>📍 {event.object}</div>
                                </div>
                            </div>

                            {/* Comment */}
                            {event.comment && (
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8 }}>
                                        Комментарий автора
                                    </div>
                                    <div style={{
                                        padding: 12,
                                        background: "rgba(255,255,255,0.03)",
                                        borderRadius: 8,
                                        color: "rgba(255,255,255,0.8)"
                                    }}>
                                        {event.comment}
                                    </div>
                                </div>
                            )}

                            {/* Files */}
                            <div>
                                <div style={{
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: 12,
                                    marginBottom: 12,
                                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                                    paddingBottom: 8
                                }}>
                                    Прикреплённые файлы ({event.files.length})
                                </div>
                                {event.files.map((file, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "12px 0",
                                            borderBottom: "1px solid rgba(255,255,255,0.05)"
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
                                            {getFileIcon(file)}
                                            {file}
                                        </div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <Button type="link" size="small">Просмотр</Button>
                                            <Button type="link" size="small">Скачать</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div>
                        <div className="demo-card" style={{ marginBottom: 16 }}>
                            <div className="demo-card-header">
                                <div className="demo-card-title">⚡ Действия</div>
                            </div>
                            <div className="demo-card-body">
                                <div className="demo-actions">
                                    <button
                                        className="demo-action-btn validate"
                                        onClick={handleValidate}
                                    >
                                        <CheckCircleOutlined /> Валидировать
                                    </button>
                                    <button
                                        className="demo-action-btn link"
                                        onClick={() => navigate(`/demo/validator/link/${event.id}`)}
                                    >
                                        <LinkOutlined /> Связать с моделью
                                    </button>
                                    <button
                                        className="demo-action-btn return"
                                        onClick={() => setReturnModalVisible(true)}
                                    >
                                        <RollbackOutlined /> Вернуть автору
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="demo-card">
                            <div className="demo-card-header">
                                <div className="demo-card-title">📊 Связанные элементы</div>
                            </div>
                            <div className="demo-card-body">
                                <Paragraph style={{ color: "rgba(255,255,255,0.5)", margin: 0 }}>
                                    Пока не связано. Нажмите "Связать с моделью" для привязки к элементам BIM.
                                </Paragraph>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Return Modal */}
                <Modal
                    title="Вернуть событие автору"
                    open={returnModalVisible}
                    onCancel={() => setReturnModalVisible(false)}
                    onOk={handleReturn}
                    okText="Вернуть"
                    cancelText="Отмена"
                >
                    <Paragraph>Укажите причину возврата:</Paragraph>
                    <textarea
                        className="demo-textarea"
                        rows={4}
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="Например: не хватает спецификации металла"
                        style={{ width: "100%" }}
                    />
                </Modal>
            </div>
        </div>
    );
};

export default EventCard;
