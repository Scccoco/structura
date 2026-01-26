import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Card, Row, Col } from 'antd';
import { ArrowLeftOutlined, FolderOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import './Projects.css';

const { Title, Text } = Typography;

// Демо-проекты
const PROJECTS = [
    { id: 'mgu', name: 'МГУ', cached: true, elements: 1250, acts: 89 },
    { id: 'mvd', name: 'МВД', cached: false, elements: 0, acts: 0 },
    { id: 'airport', name: 'Аэропорт', cached: false, elements: 0, acts: 0 },
];

const ProjectsPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="projects-container">
            {/* Header */}
            <div className="projects-header">
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/')}
                    className="back-btn"
                >
                    Главная
                </Button>
                <Title level={2} className="projects-title">Проекты</Title>
                <Text type="secondary">Выберите проект для работы</Text>
            </div>

            {/* Projects Grid */}
            <div className="projects-content">
                <Row gutter={[24, 24]}>
                    {PROJECTS.map(project => (
                        <Col xs={24} sm={12} md={8} key={project.id}>
                            <Card
                                className={`project-card ${project.cached ? 'cached' : ''}`}
                                hoverable
                                onClick={() => project.cached && navigate(`/project/${project.id}`)}
                            >
                                <div className="project-icon">
                                    <FolderOutlined />
                                </div>
                                <Title level={3} className="project-name">{project.name}</Title>

                                {project.cached ? (
                                    <>
                                        <div className="project-stats">
                                            <div className="stat">
                                                <span className="stat-value">{project.elements}</span>
                                                <span className="stat-label">элементов</span>
                                            </div>
                                            <div className="stat">
                                                <span className="stat-value">{project.acts}</span>
                                                <span className="stat-label">актов</span>
                                            </div>
                                        </div>
                                        <div className="project-badge cached">Кеширован</div>
                                    </>
                                ) : (
                                    <>
                                        <Text type="secondary" className="project-empty">
                                            Данные не загружены
                                        </Text>
                                        <Button
                                            icon={<CloudDownloadOutlined />}
                                            className="download-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // TODO: Download project data
                                            }}
                                        >
                                            Загрузить
                                        </Button>
                                    </>
                                )}
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>
        </div>
    );
};

export default ProjectsPage;
