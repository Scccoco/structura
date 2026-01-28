import { useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Typography, Space } from "antd";
import { HomeOutlined, FolderOutlined, EyeOutlined } from "@ant-design/icons";
import { FullViewer, FullViewerRef } from "../../components/FullViewer";
import SyncPanelMost from "../../components/SyncPanelMost";

const { Title } = Typography;

// Токен Моста (отдельный аккаунт Speckle)
const MOST_TOKEN = "b47015ff123fc23131070342b14043c1b8a657dfb7";

export const ProjectViewer = () => {
    const { streamId } = useParams<{ streamId: string }>();
    const viewerRef = useRef<FullViewerRef>(null);

    const handleSyncComplete = () => {
        // После синхронизации можно перезагрузить viewer
        console.log("✅ Sync complete, could reload viewer here");
    };

    return (
        <div style={{ padding: 24 }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: 16, color: "#888" }}>
                <Link to="/"><HomeOutlined /> Главная</Link>
                <span> / </span>
                <Link to="/projects"><FolderOutlined /> Проекты</Link>
                <span> / </span>
                <span style={{ color: "#333" }}>Просмотр модели</span>
            </div>

            {/* Header with Sync button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <EyeOutlined style={{ marginRight: 8 }} />
                    3D Модель проекта
                </Title>
                <Space>
                    <SyncPanelMost
                        streamId={streamId || ""}
                        onSyncComplete={handleSyncComplete}
                    />
                </Space>
            </div>

            {/* Viewer */}
            <FullViewer
                ref={viewerRef}
                streamId={streamId || ""}
                token={MOST_TOKEN}
                height="calc(100vh - 180px)"
                showToolbar={true}
            />
        </div>
    );
};

export default ProjectViewer;

