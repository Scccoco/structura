import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Button, Tabs, Space } from 'antd';
import { ArrowLeftOutlined, UnorderedListOutlined, AppstoreOutlined } from '@ant-design/icons';
import './aid.css';

const { Title, Text } = Typography;

// Re-export Registry component with project context
import AIDRegistry from './RegistryContent';
import AIDElements from './ElementsContent';

const AIDRegistryPage: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    const items = [
        {
            key: 'registry',
            label: <span><UnorderedListOutlined /> Реестр актов</span>,
            children: <AIDRegistry projectId={projectId || ''} />,
        },
        {
            key: 'elements',
            label: <span><AppstoreOutlined /> Элементы модели</span>,
            children: <AIDElements projectId={projectId || ''} />,
        },
    ];

    return (
        <div className="aid-container">
            {/* Header */}
            <div className="aid-header">
                <div>
                    <Space>
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate(`/project/${projectId}`)}
                            className="back-btn"
                        >
                            К модулям
                        </Button>
                    </Space>
                    <Title level={2} className="aid-title">
                        📋 Исполнительная документация
                    </Title>
                    <Text type="secondary">
                        Реестр актов ИД и привязка к элементам модели
                    </Text>
                </div>
            </div>

            {/* Tabs */}
            <div className="aid-tabs">
                <Tabs items={items} defaultActiveKey="registry" size="large" />
            </div>
        </div>
    );
};

export default AIDRegistryPage;
