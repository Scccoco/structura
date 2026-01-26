import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Badge } from 'antd';
import {
    ProjectOutlined, WifiOutlined, DisconnectOutlined
} from '@ant-design/icons';
import './Home.css';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const checkNetwork = async () => {
            if (window.electronAPI) {
                const online = await window.electronAPI.isOnline();
                setIsOnline(online);
            }
        };
        checkNetwork();
        const interval = setInterval(checkNetwork, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="home-container">
            <div className="home-content">
                {/* Network Status */}
                <div className="home-status">
                    <Badge
                        status={isOnline ? 'success' : 'warning'}
                        text={
                            <span className="network-status">
                                {isOnline ? <WifiOutlined /> : <DisconnectOutlined />}
                                {isOnline ? ' Онлайн' : ' Офлайн'}
                            </span>
                        }
                    />
                </div>

                {/* Hero Section */}
                <div className="home-hero">
                    <div className="home-logo">
                        <img src="/logo.svg" alt="Structura" className="logo-img" />
                    </div>
                    <Title level={1} className="home-title">Structura Desktop</Title>
                    <Paragraph className="home-subtitle">
                        Платформа управления строительными проектами
                    </Paragraph>
                </div>

                {/* Main CTA */}
                <div className="home-cta">
                    <Button
                        type="primary"
                        size="large"
                        icon={<ProjectOutlined />}
                        className="cta-button"
                        onClick={() => navigate('/projects')}
                    >
                        Проекты
                    </Button>
                </div>

                {/* Footer */}
                <div className="home-footer">
                    <div className="footer-logos">
                        <img src="/logos/most.png" alt="ООО Мост" className="partner-logo" />
                    </div>
                    <div className="footer-text">
                        © 2026 Structura. Все права защищены.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
