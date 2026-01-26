import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Button, Row, Col, Card } from 'antd';
import {
    ArrowLeftOutlined, FileTextOutlined, CalendarOutlined,
    DatabaseOutlined, CalculatorOutlined, ExportOutlined, LinkOutlined, BoxPlotOutlined
} from '@ant-design/icons';
import './Project.css';

const { Title, Text, Paragraph } = Typography;

// Модули проекта
const MODULES = [
    {
        id: 'schedule',
        name: '1. Сменное задание',
        description: 'Планирование работ, контроль выполнения',
        icon: <CalendarOutlined />,
        color: '#3b82f6',
        path: '/schedule',
        disabled: true
    },
    {
        id: 'aid',
        name: '2. Реестр актов ИД',
        description: 'Акты исполнительной документации, привязка к модели',
        icon: <FileTextOutlined />,
        color: '#22c55e',
        path: '/aid'
    },
    {
        id: 'materials',
        name: '3. Реестр материалов',
        description: 'Учёт материалов на объекте',
        icon: <DatabaseOutlined />,
        color: '#8b5cf6',
        path: '/materials',
        disabled: true
    },
    {
        id: 'materials-rd',
        name: '4. Формирование материалов по РД',
        description: 'Расчёт потребности материалов по рабочей документации',
        icon: <CalculatorOutlined />,
        color: '#f59e0b',
        path: '/materials-rd',
        disabled: true
    },
    {
        id: 'materials-estimates',
        name: '5. Выгрузка материалов из смет',
        description: 'Импорт данных из сметной документации',
        icon: <ExportOutlined />,
        color: '#06b6d4',
        path: '/materials-estimates',
        disabled: true
    },
    {
        id: 'model-estimate',
        name: '6. Привязка модели к смете',
        description: 'Связь элементов модели со сметными позициями',
        icon: <LinkOutlined />,
        color: '#ec4899',
        path: '/model-estimate',
        disabled: true
    },
    {
        id: 'expense-orders',
        name: '7. Реестр расходных ордеров',
        description: 'Учёт расхода материалов',
        icon: <FileTextOutlined />,
        color: '#ef4444',
        path: '/expense-orders',
        disabled: true
    },
    {
        id: 'viewer',
        name: '3D Визуализатор',
        description: 'Просмотр BIM-модели, навигация по элементам',
        icon: <BoxPlotOutlined />,
        color: '#06b6d4',
        path: '/viewer'
    },
];

const ProjectPage: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    // TODO: Load project info from DB
    const project = {
        id: projectId,
        name: projectId === 'mgu' ? 'МГУ' : projectId === 'mvd' ? 'МВД' : 'Аэропорт'
    };

    const handleModuleClick = (module: typeof MODULES[0]) => {
        if (module.disabled) return;
        navigate(`/project/${projectId}${module.path}`);
    };

    return (
        <div className="project-container">
            {/* Header */}
            <div className="project-header">
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/projects')}
                    className="back-btn"
                >
                    Проекты
                </Button>
                <div className="project-info">
                    <Title level={2} className="project-title">{project.name}</Title>
                    <Text type="secondary">Выберите модуль для работы</Text>
                </div>
            </div>

            {/* Modules Grid */}
            <div className="project-content">
                <Row gutter={[24, 24]}>
                    {MODULES.map(module => (
                        <Col xs={24} sm={12} md={8} key={module.id}>
                            <Card
                                className={`module-card ${module.disabled ? 'disabled' : ''}`}
                                hoverable={!module.disabled}
                                onClick={() => handleModuleClick(module)}
                            >
                                <div
                                    className="module-icon"
                                    style={{ background: `${module.color}20`, color: module.color }}
                                >
                                    {module.icon}
                                </div>
                                <Title level={4} className="module-title">{module.name}</Title>
                                <Paragraph className="module-desc">{module.description}</Paragraph>
                                {module.disabled && (
                                    <div className="module-badge">Скоро</div>
                                )}
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>
        </div>
    );
};

export default ProjectPage;
