import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Spin, Alert, Descriptions } from "antd";
import { ViewerToolbar } from "./ViewerToolbar";
import { MeasurementsPanel } from "./MeasurementsPanel";
import { DefaultViewerParams } from "@speckle/viewer"; // Для нормального освещения (docs и community рекомендуют)

const SPECKLE_SERVER = "https://speckle.structura-most.ru";
const SPECKLE_TOKEN = "b47015ff123fc23131070342b14043c1b8a657dfb7"; // Для GraphQL запросов, TODO: вынести на бэк proxy

const GET_LATEST_COMMIT_QUERY = `
  query GetLatestCommit($streamId: String!) {
    stream(id: $streamId) {
      name
      commits(limit: 1) {
        items {
          id
          referencedObject
        }
      }
    }
  }
`;

// Const для типов измерений (по docs/GitHub MeasurementType)
const MeasurementType = {
    PERPENDICULAR: 0,
    POINT_TO_POINT: 1,
    AREA: 2,
    POINT: 3,
} as const;

export const ViewerPage = () => {
    const { streamId } = useParams<{ streamId: string }>();
    const containerRef = useRef<HTMLDivElement>(null);
    // panelRef удалён - MeasurementsPanel теперь сам управляет ref (ChatGPT fix)

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commitId, setCommitId] = useState<string | null>(null);
    const [streamName, setStreamName] = useState<string>("");
    const [viewerInstance, setViewerInstance] = useState<any>(null);
    const [selectedElement, setSelectedElement] = useState<any>(null);

    const [measureActive, setMeasureActive] = useState(false);
    const [sectionActive, setSectionActive] = useState(false);
    const [measurementsExt, setMeasurementsExt] = useState<any>(null);
    const [sectionExt, setSectionExt] = useState<any>(null);
    const [selectionExt, setSelectionExt] = useState<any>(null);

    const [measurementsPanelVisible, setMeasurementsPanelVisible] = useState(false);
    const [measurementType, setMeasurementType] = useState<"pointToPoint" | "perpendicular" | "area" | "point">("pointToPoint");
    const [snapToVertices, setSnapToVertices] = useState(true);
    const [chainMeasurements, setChainMeasurements] = useState(false);
    const [units, setUnits] = useState("m");
    const [precision, setPrecision] = useState(2);

    useEffect(() => {
        if (!streamId) return;
        fetchLatestCommit();
    }, [streamId]);

    useEffect(() => {
        if (!commitId || !containerRef.current) return;

        let cancelled = false;
        let viewer: any = null;

        const initViewer = async () => {
            try {
                setLoading(true);
                setError(null);

                const { Viewer, CameraController, SpeckleLoader, SelectionExtension } = await import("@speckle/viewer");

                const objectUrl = `${SPECKLE_SERVER}/streams/${streamId}/objects/${commitId}`;

                viewer = new Viewer(containerRef.current!, DefaultViewerParams);

                await viewer.init();

                viewer.createExtension(CameraController);

                const selection = viewer.createExtension(SelectionExtension);
                setSelectionExt(selection);

                const { MeasurementsExtension, SectionTool } = await import("@speckle/viewer");
                const measurements = viewer.createExtension(MeasurementsExtension);
                const section = viewer.createExtension(SectionTool);

                setMeasurementsExt(measurements);
                setSectionExt(section);

                // КРИТИЧНО: Сначала устанавливаем options, ПОТОМ синхронизируем UI (ChatGPT fix)
                // Явно устанавливаем POINT_TO_POINT как дефолт
                measurements.options = { ...measurements.options, type: MeasurementType.POINT_TO_POINT };

                // Теперь синхронизируем UI с установленными options
                setMeasurementType("pointToPoint");
                setSnapToVertices(measurements.options.vertexSnap ?? true);

                const { ViewerEvent } = await import("@speckle/viewer");
                viewer.on(ViewerEvent.ObjectClicked, (event: any) => {
                    // Проверяем enabled напрямую (избегаем stale closure measureActive)
                    if (event?.hits?.length > 0 && selection.enabled) {
                        const hit = event.hits[0];
                        const userData = hit.node?.model?.raw || {};
                        setSelectedElement({
                            id: userData.id || "N/A",
                            type: userData.speckle_type || "Unknown",
                            properties: userData
                        });
                    }
                });

                // Токен нужен для приватных стримов (ChatGPT fix)
                const loader = new SpeckleLoader(viewer.getWorldTree(), objectUrl, SPECKLE_TOKEN);
                await viewer.loadObject(loader, true);

                // Настройка Section Tool после загрузки модели (docs: setBox required)
                const bounds = viewer.getRenderer().sceneBox;
                if (bounds && section) {
                    // Offset в единицах модели, 2% от max размера (ChatGPT fix)
                    const THREE = (window as any).THREE || await import("three").then(m => m.default || m);
                    const size = new THREE.Vector3();
                    bounds.getSize(size);
                    const offset = 0.02 * Math.max(size.x, size.y, size.z);

                    section.setBox(bounds, offset);
                }

                if (cancelled) return;

                console.log("Модель загружена");

                setViewerInstance(viewer);

                viewer.resize();

                setLoading(false);
            } catch (e: any) {
                console.error("Ошибка:", e);
                setError(e?.message || "Не загрузилось");
                setLoading(false);
            }
        };

        initViewer();

        return () => {
            cancelled = true;
            viewer?.dispose?.();
            if (containerRef.current) containerRef.current.innerHTML = "";
        };
    }, [commitId, streamId]);

    const fetchLatestCommit = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${SPECKLE_SERVER}/graphql`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SPECKLE_TOKEN}`
                },
                body: JSON.stringify({
                    query: GET_LATEST_COMMIT_QUERY,
                    variables: { streamId }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            const stream = data.data.stream;

            if (!stream) {
                throw new Error("Проект не найден");
            }

            if (!stream.commits.items.length) {
                throw new Error("В проекте нет коммитов");
            }

            const commit = stream.commits.items[0];
            setStreamName(stream.name);
            setCommitId(commit.referencedObject);
        } catch (e: any) {
            console.error("Ошибка загрузки коммита:", e);
            setError(e?.message || "Не удалось загрузить данные проекта");
            setLoading(false);
        }
    };

    const handleFitToView = async () => {
        if (!viewerInstance) return;

        try {
            const { CameraController } = await import("@speckle/viewer");
            const cameraController = viewerInstance.getExtension(CameraController);

            if (!cameraController) {
                console.warn("CameraController not found");
                return;
            }

            const renderer = viewerInstance.getRenderer();
            const sceneBox = renderer.sceneBox;

            if (sceneBox) {
                cameraController.setCameraView(sceneBox, true, 1.2);
                console.log("✅ Fit to view");
            } else {
                console.warn("Scene box not available");
            }
        } catch (err) {
            console.warn("Fit failed:", err);
        }
    };

    const handleMeasure = () => {
        if (!measurementsExt || !selectionExt) return;

        setMeasureActive(prev => {
            const nextActive = !prev;

            if (nextActive) {
                measurementsExt.enabled = true;
                setMeasurementsPanelVisible(true);
                selectionExt.enabled = false; // Отключаем selection (type defs: enabled в base Extension)
                setSelectedElement(null); // Очищаем выбранный элемент (ChatGPT fix)
                console.log("✅ Измерения включены");
            } else {
                measurementsExt.enabled = false;
                setMeasurementsPanelVisible(false);
                selectionExt.enabled = true;
                console.log("Измерения выключены");
            }

            return nextActive;
        });
    };

    const handleSection = () => {
        if (!sectionExt || !viewerInstance) return;

        setSectionActive(prev => {
            const nextActive = !prev;

            // Правильное управление через enabled/visible (docs API)
            sectionExt.enabled = nextActive;
            sectionExt.visible = nextActive;
            viewerInstance.requestRender();

            console.log(nextActive ? "✅ Сечения включены" : "Сечения выключены");
            return nextActive;
        });
    };

    const handleCameraView = async (view: "top" | "front" | "side" | "iso") => {
        if (!viewerInstance) return;

        try {
            const { CameraController } = await import("@speckle/viewer");
            const cameraController = viewerInstance.getExtension(CameraController);

            if (!cameraController) {
                console.warn("CameraController не найден");
                return;
            }

            // Маппинг на canonical views Speckle (docs: setCameraView API)
            const viewMap = {
                top: "top",
                front: "front",
                side: "right", // или "left" если нужно
                iso: "3d",
            } as const;

            // Используем setCameraView с smooth transition (docs API)
            cameraController.setCameraView(viewMap[view], true);
            viewerInstance.requestRender();

            console.log(`🎥 Вид: ${view} (${viewMap[view]})`);
        } catch (err) {
            console.warn("Camera view failed:", err);
        }
    };

    // Общая функция для обновления options (DRY, типизация ChatGPT fix)
    const updateMeasurementOptions = (newOptions: {
        type?: number;
        vertexSnap?: boolean;
        chain?: boolean;
        units?: string;
        precision?: number;
    }) => {
        if (!measurementsExt || !viewerInstance) return;

        const current = measurementsExt.options;
        measurementsExt.options = { ...current, ...newOptions };

        measurementsExt.removeMeasurement(); // Сброс текущего (docs)
        viewerInstance.requestRender(); // Из примеров GitHub
    };

    const handleMeasurementTypeChange = (type: "pointToPoint" | "perpendicular" | "area" | "point") => {
        setMeasurementType(type);

        const typeMap = {
            perpendicular: MeasurementType.PERPENDICULAR,
            pointToPoint: MeasurementType.POINT_TO_POINT,
            area: MeasurementType.AREA,
            point: MeasurementType.POINT,
        };

        updateMeasurementOptions({ type: typeMap[type] });
        console.log("✅ Тип изменен:", typeMap[type]);
    };

    const handleSnapChange = (snap: boolean) => {
        setSnapToVertices(snap);
        updateMeasurementOptions({ vertexSnap: snap });
        console.log("✅ Snap изменен:", snap);
    };

    const handleChainChange = (chain: boolean) => {
        setChainMeasurements(chain);
        updateMeasurementOptions({ chain: chain });
        console.log("✅ Chain изменен:", chain);
    };

    const handleUnitsChange = (units: string) => {
        setUnits(units);
        updateMeasurementOptions({ units: units });
        console.log("✅ Units изменены:", units);
    };

    const handlePrecisionChange = (precision: number) => {
        setPrecision(precision);
        updateMeasurementOptions({ precision: precision });
        console.log("✅ Precision изменена:", precision);
    };

    const handleClearAllMeasurements = () => {
        if (measurementsExt) {
            measurementsExt.clearMeasurements();
            console.log("🗑️ Все измерения удалены");
        }
    };

    if (!streamId) {
        return (
            <Alert
                message="Ошибка"
                description="Stream ID не указан в URL"
                type="error"
                showIcon
            />
        );
    }

    if (error) {
        return (
            <Alert
                message="Ошибка загрузки"
                description={<p style={{ whiteSpace: "pre-line" }}>{error}</p>}
                type="error"
                showIcon
            />
        );
    }

    return (
        <div style={{ position: "relative" }}>
            <Card
                title={streamName || `Модель: ${streamId}`}
            >
                {loading && (
                    <div style={{ textAlign: "center", padding: "80px 16px" }}>
                        <Spin size="large" />
                        <p style={{ marginTop: 16 }}>
                            {commitId ? "Загрузка 3D модели..." : "Загрузка данных проекта..."}
                        </p>
                    </div>
                )}

                <div
                    ref={containerRef}
                    style={{
                        width: "100%",
                        height: "calc(100vh - 220px)",
                        minHeight: "600px",
                        border: "1px solid #d9d9d9",
                        borderRadius: "8px",
                        overflow: "hidden",
                        position: "relative",
                    }}
                >
                    {!loading && viewerInstance && (
                        <>
                            <ViewerToolbar
                                onFit={handleFitToView}
                                onMeasure={handleMeasure}
                                onSection={handleSection}
                                onCameraView={handleCameraView}
                                measureActive={measureActive}
                                sectionActive={sectionActive}
                            />

                            <MeasurementsPanel
                                visible={measurementsPanelVisible}
                                onClose={() => setMeasurementsPanelVisible(false)}
                                measurementType={measurementType}
                                onTypeChange={handleMeasurementTypeChange}
                                snapToVertices={snapToVertices}
                                onSnapChange={handleSnapChange}
                                chainMeasurements={chainMeasurements}
                                onChainChange={handleChainChange}
                                units={units}
                                onUnitsChange={handleUnitsChange}
                                precision={precision}
                                onPrecisionChange={handlePrecisionChange}
                                onClearAll={handleClearAllMeasurements}
                            />
                        </>
                    )}
                </div>
            </Card>

            {!loading && selectedElement && (
                <div
                    style={{
                        position: "absolute",
                        right: 16,
                        top: 80,
                        width: 320,
                        background: "white",
                        borderRadius: 8,
                        padding: 16,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        maxHeight: "calc(100vh - 300px)",
                        overflow: "auto",
                        zIndex: 1000,
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <h4 style={{ margin: 0 }}>Выбранный элемент</h4>
                        <button
                            onClick={() => setSelectedElement(null)}
                            style={{
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                fontSize: 18,
                            }}
                        >
                            ×
                        </button>
                    </div>
                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="ID">
                            {selectedElement.id}
                        </Descriptions.Item>
                        <Descriptions.Item label="Тип">
                            {selectedElement.type}
                        </Descriptions.Item>
                    </Descriptions>
                </div>
            )}
        </div>
    );
};