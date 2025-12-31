import { Card, Typography, Space, Statistic, Row, Col } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

const { Title } = Typography;

export const DashboardPage = () => {
    return (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Title level={2}>Digital Twin - Панель управления</Title>

            <Row gutter={16}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Завершено"
                            value={1}
                            valueStyle={{ color: "#3f8600" }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="В работе"
                            value={2}
                            valueStyle={{ color: "#cf1322" }}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Не начато"
                            value={2}
                            prefix={<CloseCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card title="Быстрый старт">
                <Space direction="vertical">
                    <Title level={4}>Добро пожаловать в Digital Twin систему!</Title>
                    <p>Система готова к работе. Основные возможности:</p>
                    <ul>
                        <li>Просмотр элементов BIM модели</li>
                        <li>Управление статусами элементов</li>
                        <li>Визуализация в 3D (Speckle Viewer)</li>
                    </ul>
                </Space>
            </Card>
        </Space>
    );
};
