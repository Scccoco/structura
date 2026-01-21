/**
 * LoginPage - Страница входа
 */
import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, ROLE_NAMES } from '../services/authZmk';
import './LoginPage.css';

const { Title, Text } = Typography;

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (values: { email: string; password: string }) => {
        setLoading(true);
        setError(null);

        const result = await login(values.email, values.password);

        if (result.success && result.user) {
            message.success(`Добро пожаловать, ${result.user.name || result.user.email}!`);
            message.info(`Роль: ${ROLE_NAMES[result.user.role]}`);
            navigate('/zmk/projects');
        } else {
            setError(result.error || 'Ошибка входа');
        }

        setLoading(false);
    };

    return (
        <div className="login-container">
            <Card className="login-card">
                <div className="login-header">
                    <Title level={2}>Structura</Title>
                    <Text type="secondary">Система управления ЗМК</Text>
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />
                )}

                <Form
                    name="login"
                    onFinish={handleSubmit}
                    size="large"
                    layout="vertical"
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Введите email' },
                            { type: 'email', message: 'Неверный формат email' }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Email"
                            autoComplete="email"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Введите пароль' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Пароль"
                            autoComplete="current-password"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                        >
                            Войти
                        </Button>
                    </Form.Item>
                </Form>

                <div className="login-footer">
                    <Text type="secondary">
                        По умолчанию: admin@structura-most.ru / admin123
                    </Text>
                </div>
            </Card>
        </div>
    );
}
