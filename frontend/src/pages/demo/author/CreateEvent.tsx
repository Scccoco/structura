import React, { useState } from "react";
import { Button, Typography, message, Steps } from "antd";
import { useNavigate, Link } from "react-router-dom";
import {
    HomeOutlined, UploadOutlined, SaveOutlined,
    SendOutlined, ArrowLeftOutlined, CheckOutlined
} from "@ant-design/icons";
import { EVENT_TYPES, PROJECTS, OBJECTS } from "../mockData";
import "../demo.css";

const { Title, Paragraph } = Typography;

// Flatten objects for select
const flattenObjects = (objects: any[], prefix = ""): { value: string; label: string }[] => {
    let result: { value: string; label: string }[] = [];
    for (const obj of objects) {
        const label = prefix ? `${prefix} / ${obj.name}` : obj.name;
        result.push({ value: obj.id, label: `${label} (${obj.type})` });
        if (obj.children) {
            result = result.concat(flattenObjects(obj.children, label));
        }
    }
    return result;
};

export const CreateEvent: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        type: "",
        project: "",
        object: "",
        title: "",
        comment: "",
    });
    const [files, setFiles] = useState<string[]>([]);

    const objectOptions = flattenObjects(OBJECTS);

    const handleSaveDraft = () => {
        if (!formData.type || !formData.project || !formData.object) {
            message.error("Заполните обязательные поля");
            return;
        }
        message.success("Черновик сохранён");
        navigate("/demo/author");
    };

    const handleSubmit = () => {
        if (files.length === 0) {
            message.warning("Прикрепите хотя бы один файл");
            return;
        }
        message.success("Событие создано и отправлено на валидацию");
        navigate("/demo/author");
    };

    const simulateFileUpload = () => {
        const mockFiles = ["Документ_" + Date.now() + ".pdf"];
        setFiles(prev => [...prev, ...mockFiles]);
        message.success("Файл добавлен");
    };

    return (
        <div className="demo-container">
            <div className="demo-content" style={{ maxWidth: 800 }}>
                {/* Breadcrumb */}
                <div className="demo-breadcrumb">
                    <Link to="/demo"><HomeOutlined /> Демо</Link>
                    <span> / </span>
                    <Link to="/demo/author">Инженер</Link>
                    <span> / </span>
                    <span className="current">Создание события</span>
                </div>

                {/* Back */}
                <a
                    className="demo-back-link"
                    onClick={() => navigate("/demo/author")}
                    style={{ cursor: "pointer" }}
                >
                    <ArrowLeftOutlined /> Назад к списку
                </a>

                <Title level={2} className="demo-page-title" style={{ marginBottom: 16 }}>
                    📝 Новое событие
                </Title>
                <Paragraph style={{ color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
                    Заполните информацию о событии и прикрепите файлы
                </Paragraph>

                {/* Steps */}
                <Steps
                    current={currentStep}
                    style={{ marginBottom: 40 }}
                    items={[
                        { title: <span style={{ color: "#fff" }}>Тип и объект</span> },
                        { title: <span style={{ color: "#fff" }}>Файлы</span> },
                        { title: <span style={{ color: "#fff" }}>Отправка</span> },
                    ]}
                />

                {/* Form Card */}
                <div className="demo-card">
                    <div className="demo-card-body">
                        {/* Step 1 */}
                        {currentStep === 0 && (
                            <>
                                <div className="demo-form-group">
                                    <label className="demo-form-label">Тип события *</label>
                                    <select
                                        className="demo-select"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="">Выберите тип...</option>
                                        {EVENT_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="demo-form-group">
                                    <label className="demo-form-label">Проект *</label>
                                    <select
                                        className="demo-select"
                                        value={formData.project}
                                        onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                                    >
                                        <option value="">Выберите проект...</option>
                                        {PROJECTS.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="demo-form-group">
                                    <label className="demo-form-label">Объект *</label>
                                    <select
                                        className="demo-select"
                                        value={formData.object}
                                        onChange={(e) => setFormData({ ...formData, object: e.target.value })}
                                    >
                                        <option value="">Выберите объект...</option>
                                        {objectOptions.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="demo-form-group">
                                    <label className="demo-form-label">Название / Описание</label>
                                    <input
                                        type="text"
                                        className="demo-input"
                                        placeholder="Краткое описание события"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        {/* Step 2 */}
                        {currentStep === 1 && (
                            <>
                                <div
                                    className="demo-upload-zone"
                                    onClick={simulateFileUpload}
                                >
                                    <UploadOutlined className="demo-upload-icon" />
                                    <div className="demo-upload-text">
                                        Нажмите для добавления файлов
                                    </div>
                                    <div className="demo-upload-hint">
                                        Поддерживаются PDF, DWG, JPG, PNG, XLSX
                                    </div>
                                </div>

                                {files.length > 0 && (
                                    <div style={{ marginTop: 24 }}>
                                        <div style={{ color: "#fff", fontWeight: 600, marginBottom: 12 }}>
                                            Добавленные файлы ({files.length}):
                                        </div>
                                        {files.map((f, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    padding: "8px 12px",
                                                    background: "rgba(255,255,255,0.05)",
                                                    borderRadius: 6,
                                                    marginBottom: 8,
                                                    color: "rgba(255,255,255,0.8)"
                                                }}
                                            >
                                                📄 {f}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="demo-form-group" style={{ marginTop: 24 }}>
                                    <label className="demo-form-label">Комментарий (опционально)</label>
                                    <textarea
                                        className="demo-textarea"
                                        rows={3}
                                        placeholder="Дополнительная информация для валидатора"
                                        value={formData.comment}
                                        onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        {/* Step 3 */}
                        {currentStep === 2 && (
                            <div style={{ textAlign: "center", padding: "40px 0" }}>
                                <div style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto 24px",
                                    fontSize: 36,
                                    color: "#fff"
                                }}>
                                    <CheckOutlined />
                                </div>
                                <Title level={3} style={{ color: "#fff" }}>
                                    Событие готово к отправке
                                </Title>
                                <Paragraph style={{ color: "rgba(255,255,255,0.6)" }}>
                                    Тип: {formData.type || "—"}<br />
                                    Файлов: {files.length}
                                </Paragraph>

                                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<SendOutlined />}
                                        className="demo-btn-primary"
                                        onClick={handleSubmit}
                                    >
                                        Отправить на валидацию
                                    </Button>
                                    <Button
                                        size="large"
                                        icon={<SaveOutlined />}
                                        onClick={handleSaveDraft}
                                        style={{
                                            background: "rgba(255,255,255,0.06)",
                                            border: "1px solid rgba(255,255,255,0.15)",
                                            color: "#fff"
                                        }}
                                    >
                                        Сохранить как черновик
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        {currentStep < 2 && (
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: 32,
                                paddingTop: 24,
                                borderTop: "1px solid rgba(255,255,255,0.1)"
                            }}>
                                <Button
                                    disabled={currentStep === 0}
                                    onClick={() => setCurrentStep(prev => prev - 1)}
                                    style={{
                                        background: "transparent",
                                        border: "1px solid rgba(255,255,255,0.2)",
                                        color: "#fff"
                                    }}
                                >
                                    ← Назад
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={() => {
                                        if (currentStep === 0 && (!formData.type || !formData.project || !formData.object)) {
                                            message.error("Заполните обязательные поля");
                                            return;
                                        }
                                        setCurrentStep(prev => prev + 1);
                                    }}
                                    className="demo-btn-primary"
                                    style={{ width: "auto", padding: "0 32px" }}
                                >
                                    Далее →
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateEvent;
