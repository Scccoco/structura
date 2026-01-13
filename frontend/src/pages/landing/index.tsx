import { Button, Typography, Row, Col } from "antd";
import { ProjectOutlined, BarChartOutlined, BuildOutlined, CheckCircleOutlined, ClockCircleOutlined, ControlOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import "./index.css";

const { Title, Paragraph, Text } = Typography;

export const LandingPage = () => {
    const navigate = useNavigate();

    const workflowSteps = [
        {
            number: 1,
            title: "Модель",
            description: "BIM-модель загружается из проектной среды и используется как основа учёта."
        },
        {
            number: 2,
            title: "Данные",
            description: "Статусы элементов, объёмы, участки работ, исполнители."
        },
        {
            number: 3,
            title: "Контроль выполнения",
            description: "Контроль хода работ по статусам элементов и объёмам."
        },
        {
            number: 4,
            title: "Принятие решений",
            description: "Анализ текущего состояния и принятие управленческих решений."
        }
    ];

    const scenarios = [
        {
            icon: <ProjectOutlined />,
            title: "Контроль объёмов",
            actions: [
                "Работать с элементами модели",
                "Сравнивать объёмы с планом",
                "Отслеживать готовность конструкций"
            ]
        },
        {
            icon: <CheckCircleOutlined />,
            title: "Статусы работ",
            actions: [
                "Обновлять статусы элементов",
                "Видеть текущее состояние работ",
                "Анализировать выполнение"
            ]
        },
        {
            icon: <ClockCircleOutlined />,
            title: "Сменные задания",
            actions: [
                "Назначать задания бригадам",
                "Контролировать выполнение",
                "Фиксировать фактическое выполнение"
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
                        Управление строительством через BIM-модель
                    </Title>

                    <Paragraph className="value-description">
                        BIM-модель как основа управления.
                        Статусы элементов и объёмы работ.
                        Фиксация фактического выполнения.
                    </Paragraph>

                    <div className="cta-section">
                        <Button
                            type="primary"
                            size="large"
                            className="cta-primary"
                            onClick={() => navigate("/projects")}
                            icon={<ProjectOutlined />}
                        >
                            Открыть проекты
                        </Button>

                        <Button
                            size="large"
                            className="cta-secondary"
                            onClick={() => navigate("/dashboard")}
                            icon={<ControlOutlined />}
                        >
                            Управление и анализ
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

                {/* Usage Scenarios */}
                <div className="scenarios-section">
                    <Title level={3} className="section-title">Что можно делать</Title>
                    <Row gutter={[24, 24]}>
                        {scenarios.map((scenario, index) => (
                            <Col key={index} xs={24} md={8}>
                                <div className="scenario-card">
                                    <div className="scenario-icon">{scenario.icon}</div>
                                    <Title level={4} className="scenario-title">
                                        {scenario.title}
                                    </Title>
                                    <ul className="scenario-actions">
                                        {scenario.actions.map((action, i) => (
                                            <li key={i}>{action}</li>
                                        ))}
                                    </ul>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>

                {/* Quick Access */}
                <div className="quick-access">
                    <div className="access-item" onClick={() => navigate("/projects")}>
                        <ProjectOutlined />
                        <span>Проекты</span>
                    </div>
                    <div className="access-divider"></div>
                    <div className="access-item" onClick={() => navigate("/dashboard")}>
                        <BarChartOutlined />
                        <span>Аналитика</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
