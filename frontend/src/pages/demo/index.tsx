import React from "react";
import { Button, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { UserOutlined, SafetyCertificateOutlined, BuildOutlined, HomeOutlined } from "@ant-design/icons";
import "./demo.css";

const { Title, Paragraph } = Typography;

export const DemoIndex: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="demo-container">
            <div className="demo-content">
                {/* Header */}
                <div className="demo-header">
                    <div className="demo-brand">
                        <BuildOutlined className="demo-brand-icon" />
                        <Title level={1} className="demo-brand-title">Structura Demo</Title>
                    </div>
                    <Paragraph className="demo-subtitle">
                        Демонстрация интерфейсов для разных ролей пользователей<br />
                        событийного учёта строительного проекта
                    </Paragraph>
                </div>

                {/* Role Cards */}
                <div className="demo-role-cards">
                    {/* Author Card */}
                    <div
                        className="demo-role-card"
                        onClick={() => navigate("/demo/author")}
                    >
                        <div className="demo-role-icon author">
                            <UserOutlined />
                        </div>
                        <Title level={3} className="demo-role-title">
                            👷 Инженер (Автор)
                        </Title>
                        <Paragraph className="demo-role-desc">
                            Создание событий, загрузка документов, фиксация фактов выполнения работ
                        </Paragraph>
                        <ul className="demo-role-features">
                            <li>Создание черновиков событий</li>
                            <li>Загрузка файлов (PDF, фото)</li>
                            <li>Привязка к объектам модели</li>
                            <li>Отправка на валидацию</li>
                        </ul>
                        <Button type="primary" className="demo-btn-primary">
                            Войти как Инженер →
                        </Button>
                    </div>

                    {/* Validator Card */}
                    <div
                        className="demo-role-card"
                        onClick={() => navigate("/demo/validator")}
                    >
                        <div className="demo-role-icon validator">
                            <SafetyCertificateOutlined />
                        </div>
                        <Title level={3} className="demo-role-title">
                            📋 Валидатор
                        </Title>
                        <Paragraph className="demo-role-desc">
                            Проверка данных, связывание с BIM-моделью, подтверждение событий
                        </Paragraph>
                        <ul className="demo-role-features">
                            <li>Очередь событий на проверку</li>
                            <li>Проверка файлов и атрибутов</li>
                            <li>Связка с элементами модели</li>
                            <li>Валидация или возврат</li>
                        </ul>
                        <Button type="primary" className="demo-btn-primary demo-btn-validator">
                            Войти как Валидатор →
                        </Button>
                    </div>
                </div>

                {/* Back to main */}
                <div style={{ textAlign: "center" }}>
                    <a
                        className="demo-back-link"
                        onClick={() => navigate("/")}
                        style={{ cursor: "pointer" }}
                    >
                        <HomeOutlined /> Вернуться на главную
                    </a>
                </div>
            </div>
        </div>
    );
};

export default DemoIndex;
