import React, { useState, useRef, useEffect } from "react";
import { Button, Typography, message } from "antd";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    HomeOutlined, ArrowLeftOutlined, LinkOutlined,
    CheckCircleOutlined, DeleteOutlined, AimOutlined
} from "@ant-design/icons";
import { DEMO_EVENTS, MOCK_1C_DATA } from "../mockData";
import "../demo.css";

const { Title, Text } = Typography;

// Speckle config
const SPECKLE_SERVER = "https://speckle.structura-most.ru";
const SPECKLE_TOKEN = "b47015ff123fc23131070342b14043c1b8a657dfb7";
const STREAM_ID = "69b5048b92";

interface BimLink {
    dataId: string;
    dataName: string;
    elementId: string;
    elementName: string;
}

export const BimLinking: React.FC = () => {
    const navigate = useNavigate();
    const { eventId } = useParams<{ eventId: string }>();
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);

    const [viewerReady, setViewerReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedDataRow, setSelectedDataRow] = useState<string | null>(null);
    const [selectedElement, setSelectedElement] = useState<{ id: string; name: string } | null>(null);
    const [links, setLinks] = useState<BimLink[]>([]);

    const event = DEMO_EVENTS.find(e => e.id === eventId);

    // Initialize Speckle Viewer
    useEffect(() => {
        const initViewer = async () => {
            if (!containerRef.current) return;

            try {
                const {
                    Viewer,
                    DefaultViewerParams,
                    SpeckleLoader,
                    CameraController,
                    SelectionExtension,
                    ViewerEvent
                } = await import("@speckle/viewer");

                const params = DefaultViewerParams;
                params.showStats = false;

                const viewer = new Viewer(containerRef.current, params);
                await viewer.init();
                viewerRef.current = viewer;

                viewer.createExtension(CameraController);
                viewer.createExtension(SelectionExtension);

                // Get latest commit
                const query = `
                    query GetLatestCommit($streamId: String!) {
                        stream(id: $streamId) {
                            commits(limit: 1) {
                                items { id referencedObject }
                            }
                        }
                    }
                `;

                const response = await fetch(`${SPECKLE_SERVER}/graphql`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${SPECKLE_TOKEN}`,
                    },
                    body: JSON.stringify({ query, variables: { streamId: STREAM_ID } }),
                });

                const result = await response.json();
                const commit = result.data?.stream?.commits?.items?.[0];

                if (commit) {
                    const objectUrl = `${SPECKLE_SERVER}/streams/${STREAM_ID}/objects/${commit.referencedObject}`;
                    const loader = new SpeckleLoader(
                        viewer.getWorldTree(),
                        objectUrl,
                        SPECKLE_TOKEN
                    );
                    await viewer.loadObject(loader, true);
                }

                setViewerReady(true);
                setLoading(false);

                // Handle selection
                viewer.on(ViewerEvent.ObjectClicked, (event: any) => {
                    if (event?.hits?.length > 0) {
                        const hit = event.hits[0];
                        const raw = hit.node?.model?.raw;
                        const name = raw?.name || raw?.Name || raw?.speckle_type || "Элемент";
                        const id = raw?.id || hit.node?.model?.id || "unknown";
                        setSelectedElement({ id, name: String(name) });
                    }
                });

            } catch (error) {
                console.error("Viewer init error:", error);
                setLoading(false);
                message.error("Ошибка загрузки модели");
            }
        };

        initViewer();

        return () => {
            if (viewerRef.current) {
                viewerRef.current.dispose?.();
            }
        };
    }, []);

    const handleLink = () => {
        if (!selectedDataRow || !selectedElement) {
            message.warning("Выберите строку данных и элемент модели");
            return;
        }

        const dataItem = MOCK_1C_DATA.find(d => d.id === selectedDataRow);
        if (!dataItem) return;

        if (links.some(l => l.dataId === selectedDataRow && l.elementId === selectedElement.id)) {
            message.warning("Эта связь уже существует");
            return;
        }

        setLinks(prev => [...prev, {
            dataId: selectedDataRow,
            dataName: `${dataItem.code} - ${dataItem.name}`,
            elementId: selectedElement.id,
            elementName: selectedElement.name,
        }]);

        message.success("Связь создана");
        setSelectedDataRow(null);
        setSelectedElement(null);
    };

    const handleRemoveLink = (index: number) => {
        setLinks(prev => prev.filter((_, i) => i !== index));
        message.info("Связь удалена");
    };

    const handleSave = () => {
        message.success(`Сохранено ${links.length} связей`);
        navigate(`/demo/validator/event/${eventId}`);
    };

    return (
        <div className="demo-container">
            <div className="demo-content" style={{ maxWidth: 1400 }}>
                {/* Breadcrumb */}
                <div className="demo-breadcrumb">
                    <Link to="/demo"><HomeOutlined /> Демо</Link>
                    <span> / </span>
                    <Link to="/demo/validator">Валидатор</Link>
                    <span> / </span>
                    <span className="current">Связка с моделью</span>
                </div>

                {/* Header */}
                <div className="demo-page-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <a
                            className="demo-back-link"
                            onClick={() => navigate(`/demo/validator/event/${eventId}`)}
                            style={{ cursor: "pointer", margin: 0 }}
                        >
                            <ArrowLeftOutlined />
                        </a>
                        <Title level={2} className="demo-page-title" style={{ margin: 0 }}>
                            🔗 Связка данных с моделью
                        </Title>
                    </div>
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        className="demo-btn-primary"
                        style={{ width: "auto", padding: "0 32px" }}
                        onClick={handleSave}
                        disabled={links.length === 0}
                    >
                        Сохранить ({links.length})
                    </Button>
                </div>

                {/* Event info */}
                {event && (
                    <div style={{
                        padding: "12px 16px",
                        background: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: 8,
                        marginBottom: 24,
                        color: "#60a5fa"
                    }}>
                        ℹ️ Событие: {event.title}
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 24 }}>
                    {/* Left: Data table */}
                    <div>
                        <div className="demo-card">
                            <div className="demo-card-header">
                                <div className="demo-card-title">📊 Данные из 1С</div>
                                {selectedDataRow && (
                                    <span className="demo-tag pending">Выбрано</span>
                                )}
                            </div>
                            <div className="demo-card-body" style={{ padding: 0 }}>
                                <table className="demo-table">
                                    <thead>
                                        <tr>
                                            <th>Код</th>
                                            <th>Наименование</th>
                                            <th>Кол-во</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {MOCK_1C_DATA.map(item => (
                                            <tr
                                                key={item.id}
                                                onClick={() => setSelectedDataRow(item.id)}
                                                style={{
                                                    cursor: "pointer",
                                                    background: selectedDataRow === item.id
                                                        ? "rgba(59, 130, 246, 0.15)"
                                                        : undefined
                                                }}
                                            >
                                                <td>{item.code}</td>
                                                <td>{item.name}</td>
                                                <td>{item.quantity} {item.unit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Link action */}
                        <div style={{
                            padding: 20,
                            textAlign: "center",
                            background: "rgba(255,255,255,0.02)",
                            borderRadius: 12,
                            marginTop: 16
                        }}>
                            {selectedDataRow && selectedElement ? (
                                <div>
                                    <div style={{ marginBottom: 12, color: "rgba(255,255,255,0.8)" }}>
                                        <span className="demo-tag pending" style={{ marginRight: 8 }}>
                                            {MOCK_1C_DATA.find(d => d.id === selectedDataRow)?.name}
                                        </span>
                                        →
                                        <span className="demo-tag validated" style={{ marginLeft: 8 }}>
                                            {selectedElement.name}
                                        </span>
                                    </div>
                                    <Button
                                        type="primary"
                                        icon={<LinkOutlined />}
                                        onClick={handleLink}
                                    >
                                        Создать связь
                                    </Button>
                                </div>
                            ) : (
                                <Text style={{ color: "rgba(255,255,255,0.4)" }}>
                                    {!selectedDataRow && "1. Выберите строку данных"}
                                    {selectedDataRow && !selectedElement && "2. Кликните на элемент модели"}
                                </Text>
                            )}
                        </div>

                        {/* Links */}
                        <div className="demo-card" style={{ marginTop: 16 }}>
                            <div className="demo-card-header">
                                <div className="demo-card-title">
                                    ✅ Связи
                                    <span className="demo-tag validated" style={{ marginLeft: 8 }}>{links.length}</span>
                                </div>
                            </div>
                            <div className="demo-card-body">
                                {links.length === 0 ? (
                                    <Text style={{ color: "rgba(255,255,255,0.4)" }}>Пока нет связей</Text>
                                ) : (
                                    links.map((link, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "10px 0",
                                                borderBottom: "1px solid rgba(255,255,255,0.05)"
                                            }}
                                        >
                                            <Text style={{ color: "#fff", flex: 1 }} ellipsis>
                                                {link.dataName} → {link.elementName}
                                            </Text>
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => handleRemoveLink(index)}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: BIM Viewer */}
                    <div className="demo-viewer-container">
                        <div className="demo-viewer-header">
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ color: "#fff", fontWeight: 600 }}>🏗️ BIM-модель</span>
                                {loading && <span className="demo-tag pending">Загрузка...</span>}
                                {viewerReady && <span className="demo-tag validated">Готово</span>}
                            </div>
                            {selectedElement && (
                                <span className="demo-tag validated">
                                    <AimOutlined style={{ marginRight: 4 }} />
                                    {selectedElement.name}
                                </span>
                            )}
                        </div>
                        <div
                            ref={containerRef}
                            style={{
                                width: "100%",
                                height: 550,
                                background: "#0a0a0f",
                            }}
                        />
                        <div className="demo-viewer-hint">
                            💡 Кликните на элемент модели для выбора
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BimLinking;
