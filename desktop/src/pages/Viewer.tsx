import React, { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Button, message } from 'antd';
import { ArrowLeftOutlined, FullscreenOutlined } from '@ant-design/icons';
import { FullViewer, FullViewerRef } from '../components/FullViewer';
import './Viewer.css';

const { Title, Text } = Typography;

// Демо-проекты со Speckle streamId
// Model: https://speckle.structura-most.ru/projects/69b5048b92/models/9af0e90df9
const PROJECT_STREAMS: Record<string, { name: string; streamId: string; modelId?: string }> = {
    'mgu': {
        name: 'МГУ',
        streamId: '69b5048b92', // Correct project ID
        modelId: '9af0e90df9', // Model ID
    },
    'mvd': {
        name: 'МВД',
        streamId: '69b5048b92',
        modelId: '9af0e90df9',
    },
    'airport': {
        name: 'Аэропорт',
        streamId: '69b5048b92',
        modelId: '9af0e90df9',
    },
};

const ViewerPage: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();
    const viewerRef = useRef<FullViewerRef>(null);

    const project = PROJECT_STREAMS[projectId || ''] || {
        name: projectId,
        streamId: '69b5048b92',
    };

    const handleReady = () => {
        message.success('Модель загружена!');
    };

    return (
        <div className="viewer-container">
            {/* Header */}
            <div className="viewer-header">
                <div className="viewer-header-left">
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate(`/project/${projectId}`)}
                        className="back-btn"
                    >
                        К модулям
                    </Button>
                    <div className="viewer-title">
                        <Title level={3} style={{ margin: 0, color: '#fff' }}>
                            🏗️ {project.name}
                        </Title>
                        <Text type="secondary">3D Визуализатор</Text>
                    </div>
                </div>
                <div className="viewer-header-right">
                    <Button
                        icon={<FullscreenOutlined />}
                        onClick={() => viewerRef.current?.fitToView()}
                    >
                        Показать всё
                    </Button>
                </div>
            </div>

            {/* Main Content - FullViewer */}
            <div className="viewer-content">
                <FullViewer
                    ref={viewerRef}
                    streamId={project.streamId}
                    height="calc(100vh - 80px)"
                    showToolbar={true}
                    onReady={handleReady}
                />
            </div>
        </div>
    );
};

export default ViewerPage;
