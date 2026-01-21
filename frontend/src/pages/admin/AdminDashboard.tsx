/**
 * AdminDashboard - Админ-панель
 */
import { useState, useEffect } from 'react';
import {
    Layout, Menu, Card, Table, Button, Tag, Space, Typography,
    Modal, Form, Input, Select, message, Statistic, Row, Col
} from 'antd';
import {
    UserOutlined, SettingOutlined, AuditOutlined,
    DashboardOutlined, PlusOutlined, LogoutOutlined,
    HomeOutlined
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { loadAuth, logout, ROLE_NAMES, User } from '../../services/authZmk';
import './AdminDashboard.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface UserRecord {
    id: number;
    email: string;
    name: string;
    role: User['role'];
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
    const [form] = Form.useForm();

    const auth = loadAuth();

    // Проверка авторизации
    useEffect(() => {
        if (!auth.isAuthenticated || auth.user?.role !== 'admin') {
            message.error('Доступ запрещён. Требуется роль Администратор.');
            navigate('/login');
        }
    }, [auth, navigate]);

    // Загрузка пользователей
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api-zmk/users?select=*&order=created_at.desc');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Создание/редактирование пользователя
    const handleSave = async (values: any) => {
        try {
            if (editingUser) {
                // Update
                await fetch(`/api-zmk/users?id=eq.${editingUser.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: values.name,
                        role: values.role,
                        is_active: values.is_active
                    })
                });
                message.success('Пользователь обновлён');
            } else {
                // Create via RPC
                const res = await fetch('/api-zmk/rpc/register_user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        p_email: values.email,
                        p_password: values.password,
                        p_name: values.name,
                        p_role: values.role
                    })
                });
                const result = await res.json();
                if (result.success) {
                    message.success('Пользователь создан');
                } else {
                    message.error(result.error || 'Ошибка создания');
                    return;
                }
            }
            setIsModalOpen(false);
            setEditingUser(null);
            form.resetFields();
            fetchUsers();
        } catch (error: any) {
            message.error(`Ошибка: ${error.message}`);
        }
    };

    const handleEdit = (user: UserRecord) => {
        setEditingUser(user);
        form.setFieldsValue(user);
        setIsModalOpen(true);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const columns = [
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (email: string) => <Text strong>{email}</Text>
        },
        { title: 'Имя', dataIndex: 'name', key: 'name' },
        {
            title: 'Роль',
            dataIndex: 'role',
            key: 'role',
            render: (role: User['role']) => (
                <Tag color={role === 'admin' ? 'red' : role === 'manager' ? 'gold' : 'blue'}>
                    {ROLE_NAMES[role]}
                </Tag>
            )
        },
        {
            title: 'Статус',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active: boolean) => (
                <Tag color={active ? 'green' : 'default'}>
                    {active ? 'Активен' : 'Заблокирован'}
                </Tag>
            )
        },
        {
            title: 'Последний вход',
            dataIndex: 'last_login',
            key: 'last_login',
            render: (date: string | null) => date
                ? new Date(date).toLocaleDateString('ru-RU')
                : '—'
        },
        {
            title: 'Действия',
            key: 'actions',
            render: (_: any, record: UserRecord) => (
                <Button size="small" onClick={() => handleEdit(record)}>
                    Редактировать
                </Button>
            )
        }
    ];

    const roleStats = {
        total: users.length,
        admin: users.filter(u => u.role === 'admin').length,
        active: users.filter(u => u.is_active).length
    };

    return (
        <Layout className="admin-layout">
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                theme="light"
            >
                <div className="admin-logo">
                    {collapsed ? 'S' : 'Structura'}
                </div>
                <Menu
                    mode="inline"
                    defaultSelectedKeys={['users']}
                    items={[
                        { key: 'home', icon: <HomeOutlined />, label: <Link to="/zmk/projects">← К проектам</Link> },
                        { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
                        { key: 'users', icon: <UserOutlined />, label: 'Пользователи' },
                        { key: 'audit', icon: <AuditOutlined />, label: 'Аудит' },
                        { key: 'settings', icon: <SettingOutlined />, label: 'Настройки' },
                    ]}
                />
            </Sider>
            <Layout>
                <Header className="admin-header">
                    <Title level={4} style={{ margin: 0, color: '#fff' }}>
                        Админ-панель
                    </Title>
                    <Space>
                        <Text style={{ color: '#fff' }}>
                            {auth.user?.email}
                        </Text>
                        <Button
                            type="text"
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                            style={{ color: '#fff' }}
                        >
                            Выход
                        </Button>
                    </Space>
                </Header>
                <Content className="admin-content">
                    {/* Stats */}
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                        <Col span={8}>
                            <Card>
                                <Statistic title="Всего пользователей" value={roleStats.total} />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card>
                                <Statistic title="Администраторов" value={roleStats.admin} />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card>
                                <Statistic title="Активных" value={roleStats.active} />
                            </Card>
                        </Col>
                    </Row>

                    {/* Users Table */}
                    <Card
                        title="Пользователи"
                        extra={
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setEditingUser(null);
                                    form.resetFields();
                                    setIsModalOpen(true);
                                }}
                            >
                                Добавить
                            </Button>
                        }
                    >
                        <Table
                            dataSource={users}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    </Card>

                    {/* Modal */}
                    <Modal
                        title={editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
                        open={isModalOpen}
                        onCancel={() => {
                            setIsModalOpen(false);
                            setEditingUser(null);
                        }}
                        footer={null}
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSave}
                            initialValues={{ role: 'viewer', is_active: true }}
                        >
                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[
                                    { required: true, message: 'Введите email' },
                                    { type: 'email', message: 'Неверный формат' }
                                ]}
                            >
                                <Input disabled={!!editingUser} />
                            </Form.Item>

                            {!editingUser && (
                                <Form.Item
                                    name="password"
                                    label="Пароль"
                                    rules={[{ required: true, message: 'Введите пароль' }]}
                                >
                                    <Input.Password />
                                </Form.Item>
                            )}

                            <Form.Item name="name" label="Имя">
                                <Input />
                            </Form.Item>

                            <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
                                <Select>
                                    <Select.Option value="viewer">Просмотр</Select.Option>
                                    <Select.Option value="user">Пользователь</Select.Option>
                                    <Select.Option value="bim_manager">BIM Менеджер</Select.Option>
                                    <Select.Option value="manager">Руководитель</Select.Option>
                                    <Select.Option value="admin">Администратор</Select.Option>
                                </Select>
                            </Form.Item>

                            {editingUser && (
                                <Form.Item name="is_active" label="Статус" rules={[{ required: true }]}>
                                    <Select>
                                        <Select.Option value={true}>Активен</Select.Option>
                                        <Select.Option value={false}>Заблокирован</Select.Option>
                                    </Select>
                                </Form.Item>
                            )}

                            <Form.Item>
                                <Button type="primary" htmlType="submit" block>
                                    {editingUser ? 'Сохранить' : 'Создать'}
                                </Button>
                            </Form.Item>
                        </Form>
                    </Modal>
                </Content>
            </Layout>
        </Layout>
    );
}
