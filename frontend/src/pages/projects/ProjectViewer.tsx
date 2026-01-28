import { useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Typography } from "antd";
import { HomeOutlined, FolderOutlined, EyeOutlined } from "@ant-design/icons";
import { FullViewer, FullViewerRef } from "../../components/FullViewer";

const { Title } = Typography;

// Токен Моста (отдельный аккаунт Speckle)
const MOST_TOKEN = "b47015ff123fc23131070342b14043c1b8a657dfb7";

export const ProjectViewer = () => {
    const { streamId } = useParams<{ streamId: string }>();
    const viewerRef = useRef<FullViewerRef>(null);

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

            {/* Header */}
            <Title level={3} style={{ marginBottom: 16 }}>
                <EyeOutlined style={{ marginRight: 8 }} />
                3D Модель проекта
            </Title>

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
