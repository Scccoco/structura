import { Button, Typography, Row, Col } from "antd";
import { ProjectOutlined, BarChartOutlined, BuildOutlined, FileAddOutlined, ApartmentOutlined, CheckSquareOutlined, DashboardOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import "./index.css";

// Логотипы партнёров (раскомментируйте после копирования файлов в src/assets/logos/)
// import zmkMostLogo from "../../assets/logos/zmk_most_full.png";
// import mostLogo from "../../assets/logos/most_small.png";

const { Title, Paragraph, Text } = Typography;

export const LandingPage = () => {
    const navigate = useNavigate();

    // Шаги рабочего процесса
    const workflowSteps = [
        {
            number: 1,
            title: "Фиксация факта",
            description: "Документы, фото, акты, события."
        },
        {
            number: 2,
            title: "Привязка к модели",
            description: "Элементы, узлы, захватки BIM-модели."
        },
        {
            number: 3,
            title: "Проверка и валидация",
            description: "Структурирование и подтверждение данных."
        },
        {
            number: 4,
            title: "Мониторинг состояния",
            description: "Статусы, объёмы, план-факт, аналитика."
        }
    ];

    // Карточки функционала
    const features = [
        {
            icon: <FileAddOutlined />,
            title: "Фиксация фактов",
            actions: [
                "Загрузка документов",
                "Фото с объекта",
                "Регистрация событий"
            ]
        },
        {
            icon: <ApartmentOutlined />,
            title: "Связь с BIM-моделью",
            actions: [
                "Привязка к элементам",
                "Работа с узлами и захватками"
            ]
        },
        {
            icon: <CheckSquareOutlined />,
            title: "Проверка данных",
            actions: [
                "Валидация событий",
                "Устранение дублей",
                "Подтверждение связей"
            ]
        },
        {
            icon: <DashboardOutlined />,
            title: "Мониторинг выполнения",
            actions: [
                "Статусы элементов",
                "Объёмы и план-факт",
                "Аналитика состояния"
            ]
        }
    ];

    return (
        <div className="landing-container">
            <div className="landing-content">
                {/* Main Header */}
                <div className="main-header">
                    <div className="brand">
                        <BuildOutlined className="brand-icon" />
                        <Title level={1} className="brand-title">Structura</Title>
                    </div>

                    <Title level={2} className="value-prop">
                        Система учёта и аудита строительства через BIM-модель
                    </Title>

                    <Paragraph className="value-description">
                        Фиксация фактов, документов и объёмов с привязкой к элементам модели.
                    </Paragraph>

                    <div className="cta-section">
                        <Button
                            type="primary"
                            size="large"
                            className="cta-primary"
                            onClick={() => navigate("/projects")}
                            icon={<ProjectOutlined />}
                        >
                            Управление строительством
                        </Button>

                        <Button
                            size="large"
                            className="cta-zmk"
                            onClick={() => navigate("/zmk/projects")}
                            icon={<BuildOutlined />}
                        >
                            Управление заводом
                        </Button>
                    </div>
                </div>

                {/* CDE Demo Section - сразу после кнопок */}
                <div className="cde-section">
                    <div className="cde-content">
                        <div className="cde-icon">
                            <EyeOutlined />
                        </div>
                        <div className="cde-text">
                            <Title level={4} className="cde-title">
                                Среда общих данных (CDE)
                            </Title>
                            <Paragraph className="cde-description">
                                Демонстрация организации среды общих данных и событийного подхода
                                к управлению строительной информацией
                            </Paragraph>
                        </div>
                        <Button
                            size="large"
                            className="cta-secondary"
                            onClick={() => navigate("/demo")}
                            icon={<EyeOutlined />}
                        >
                            Перейти к демонстрации
                        </Button>
                    </div>
                </div>

                {/* How System Works */}
                <div className="workflow-section">
                    <Title level={3} className="section-title">Как работает система</Title>
                    <div className="workflow-steps">
                        {workflowSteps.map((step, index) => (
                            <>
                                <div key={step.number} className="workflow-step">
                                    <div className="step-number">{step.number}</div>
                                    <Text className="step-label">{step.title}</Text>
                                    <Text className="step-desc">{step.description}</Text>
                                </div>
                                {index < workflowSteps.length - 1 && (
                                    <div className="workflow-arrow">→</div>
                                )}
                            </>
                        ))}
                    </div>
                </div>

                {/* Features */}
                <div className="scenarios-section">
                    <Title level={3} className="section-title">Что можно делать</Title>
                    <Row gutter={[24, 24]}>
                        {features.map((feature, index) => (
                            <Col key={index} xs={24} sm={12} md={6}>
                                <div className="scenario-card">
                                    <div className="scenario-icon">{feature.icon}</div>
                                    <Title level={4} className="scenario-title">
                                        {feature.title}
                                    </Title>
                                    <ul className="scenario-actions">
                                        {feature.actions.map((action, i) => (
                                            <li key={i}>{action}</li>
                                        ))}
                                    </ul>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>

                {/* Footer Quick Access */}
                <div className="quick-access">
                    <div className="access-item" onClick={() => navigate("/projects")}>
                        <ProjectOutlined />
                        <span>Строительство</span>
                    </div>
                    <div className="access-divider"></div>
                    <div className="access-item" onClick={() => navigate("/zmk/projects")}>
                        <BuildOutlined />
                        <span>ЗМК</span>
                    </div>
                    <div className="access-divider"></div>
                    <div className="access-item" onClick={() => navigate("/dashboard")}>
                        <BarChartOutlined />
                        <span>Аналитика</span>
                    </div>
                    <div className="access-divider"></div>
                    <div className="access-item" onClick={() => navigate("/demo")}>
                        <EyeOutlined />
                        <span>CDE Демо</span>
                    </div>
                </div>

                {/* Partner Logos Footer - раскомментируйте после копирования логотипов */}
                {/*
                <div className="partners-footer">
                    <Text className="partners-label">Разработано для:</Text>
                    <div className="partners-logos">
                        <img src={mostLogo} alt="ООО Мост" className="partner-logo partner-logo-small" />
                        <img src={zmkMostLogo} alt="ЗМК Мост" className="partner-logo partner-logo-full" />
                    </div>
                </div>
                */}
            </div>
        </div>
    );
};
