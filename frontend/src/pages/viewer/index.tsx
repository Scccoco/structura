import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, Spin, Alert, Descriptions } from "antd";
import { ViewerToolbar } from "./ViewerToolbar";
import { MeasurementsPanel } from "./MeasurementsPanel";
import { SceneExplorerPanel } from "./SceneExplorerPanel";
import { FilteringPanel } from "./FilteringPanel";
import { ModelsPanel } from "./ModelsPanel";
import { DefaultViewerParams } from "@speckle/viewer";

const SPECKLE_SERVER = "https://speckle.structura-most.ru";
const SPECKLE_TOKEN = "b47015ff123fc23131070342b14043c1b8a657dfb7";

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

// Const для типов измерений
const MeasurementType = {
    PERPENDICULAR: 0,
    POINT_TO_POINT: 1,
    AREA: 2,
    POINT: 3,
} as const;

export const ViewerPage = () => {
    const { streamId } = useParams<{ streamId: string }>();
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const isInitializedRef = useRef(false); // Флаг инициализации

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commitId, setCommitId] = useState<string | null>(null);
    const [streamName, setStreamName] = useState<string>("");
    const [viewerInstance, setViewerInstance] = useState<any>(null);
    const [selectedElement, setSelectedElement] = useState<any>(null);

    // Extensions как refs для стабильности
    const extensionsRef = useRef<{
        measurements: any;
        section: any;
        selection: any;
        filtering: any;
        cameraController: any;
    } | null>(null);

    const [measurementsExt, setMeasurementsExt] = useState<any>(null);
    const [sectionExt, setSectionExt] = useState<any>(null);
    const [selectionExt, setSelectionExt] = useState<any>(null);
    const [filteringExt, setFilteringExt] = useState<any>(null);
    const [cameraControllerExt, setCameraControllerExt] = useState<any>(null);

    // UI States
    const [measureActive, setMeasureActive] = useState(false);
    const [sectionActive, setSectionActive] = useState(false);
    const [measurementsPanelVisible, setMeasurementsPanelVisible] = useState(false);
    const [measurementType, setMeasurementType] = useState<"pointToPoint" | "perpendicular" | "area" | "point">("pointToPoint");
    const [snapToVertices, setSnapToVertices] = useState(true);
    const [chainMeasurements, setChainMeasurements] = useState(false);
    const [units, setUnits] = useState("m");
    const [precision, setPrecision] = useState(2);

    // Панели
    const [sceneExplorerVisible, setSceneExplorerVisible] = useState(false);
    const [filteringPanelVisible, setFilteringPanelVisible] = useState(false);
    const [modelsPanelVisible, setModelsPanelVisible] = useState(false);

    // 1. Загрузка последнего коммита
    useEffect(() => {
        if (!streamId) return;
        fetchLatestCommit();
    }, [streamId]);

    // 2. Инициализация Viewer и загрузка модели
    useEffect(() => {
        if (!commitId || !containerRef.current || !streamId) return;

        // Если viewer уже есть — просто перезагружаем модель
        if (viewerRef.current && isInitializedRef.current) {
            reloadModel(commitId);
            return;
        }

        let cancelled = false;

        const initViewer = async () => {
            try {
                setLoading(true);
                setError(null);

                const { Viewer, CameraController, SpeckleLoader, SelectionExtension } = await import("@speckle/viewer");

                const objectUrl = `${SPECKLE_SERVER}/streams/${streamId}/objects/${commitId}`;

                const viewer = new Viewer(containerRef.current!, DefaultViewerParams);
                await viewer.init();

                const cameraCtrl = viewer.createExtension(CameraController);
                setCameraControllerExt(cameraCtrl);

                const selection = viewer.createExtension(SelectionExtension);
                setSelectionExt(selection);

                const { MeasurementsExtension, SectionTool, FilteringExtension } = await import("@speckle/viewer");
                const measurements = viewer.createExtension(MeasurementsExtension);
                const section = viewer.createExtension(SectionTool);
                const filtering = viewer.createExtension(FilteringExtension);

                // Сохраняем в refs
                extensionsRef.current = {
                    measurements,
                    section,
                    selection,
                    filtering,
                    cameraController: cameraCtrl,
                };

                setMeasurementsExt(measurements);
                setSectionExt(section);
                setFilteringExt(filtering);

                // Настройка измерений
                measurements.options = { ...measurements.options, type: MeasurementType.POINT_TO_POINT };
                setMeasurementType("pointToPoint");
                setSnapToVertices(measurements.options.vertexSnap ?? true);

                // События
                const { ViewerEvent } = await import("@speckle/viewer");
                viewer.on(ViewerEvent.ObjectClicked, (event: any) => {
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

                // Загрузка модели
                const loader = new SpeckleLoader(viewer.getWorldTree(), objectUrl, SPECKLE_TOKEN);
                await viewer.loadObject(loader, true);

                // Настройка Section Tool после загрузки
                const bounds = viewer.getRenderer().sceneBox;
                if (bounds && section) {
                    try {
                        const THREE = (window as any).THREE || await import("three").then(m => m.default || m);
                        const size = new THREE.Vector3();
                        bounds.getSize(size);
                        const offset = 0.02 * Math.max(size.x, size.y, size.z);
                        section.setBox(bounds, offset);
                    } catch (e) {
                        console.warn("Section setBox failed:", e);
                    }
                }

                if (cancelled) return;

                viewerRef.current = viewer;
                isInitializedRef.current = true;
                setViewerInstance(viewer);
                viewer.resize();
                setLoading(false);

                console.log("✅ Viewer инициализирован, модель загружена");
            } catch (e: any) {
                console.error("Ошибка:", e);
                setError(e?.message || "Не загрузилось");
                setLoading(false);
            }
        };

        initViewer();

        return () => {
            cancelled = true;
            // НЕ dispose viewer при смене commitId — только при размонтировании компонента
        };
    }, [commitId, streamId]);

    // Cleanup при размонтировании
    useEffect(() => {
        return () => {
            viewerRef.current?.dispose?.();
            viewerRef.current = null;
            isInitializedRef.current = false;
            if (containerRef.current) containerRef.current.innerHTML = "";
        };
    }, []);

    /**
     * Перезагрузить модель в существующем viewer
     */
    const reloadModel = async (objectId: string) => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        try {
            setLoading(true);
            setError(null);

            // Выгрузить все объекты
            await viewer.unloadAll();

            const { SpeckleLoader } = await import("@speckle/viewer");
            const objectUrl = `${SPECKLE_SERVER}/streams/${streamId}/objects/${objectId}`;
            const loader = new SpeckleLoader(viewer.getWorldTree(), objectUrl, SPECKLE_TOKEN);

            await viewer.loadObject(loader, true);

            // Обновить section box
            const bounds = viewer.getRenderer().sceneBox;
            const section = extensionsRef.current?.section;
            if (bounds && section) {
                try {
                    const THREE = (window as any).THREE || await import("three").then(m => m.default || m);
                    const size = new THREE.Vector3();
                    bounds.getSize(size);
                    const offset = 0.02 * Math.max(size.x, size.y, size.z);
                    section.setBox(bounds, offset);
                } catch (e) {
                    console.warn("Section setBox failed:", e);
                }
            }

            viewer.resize();
            setLoading(false);

            console.log("✅ Модель перезагружена:", objectId.slice(0, 8) + "...");
        } catch (e: any) {
            console.error("Ошибка перезагрузки модели:", e);
            setError(e?.message || "Не удалось загрузить модель");
            setLoading(false);
        }
    };

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
        const viewer = viewerRef.current;
        if (!viewer) return;

        try {
            const { CameraController } = await import("@speckle/viewer");
            const cameraController = viewer.getExtension(CameraController);

            if (!cameraController) return;

            const sceneBox = viewer.getRenderer().sceneBox;
            if (sceneBox) {
                cameraController.setCameraView(sceneBox, true, 1.2);
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
                selectionExt.enabled = false;
                setSelectedElement(null);
            } else {
                measurementsExt.enabled = false;
                setMeasurementsPanelVisible(false);
                selectionExt.enabled = true;
            }

            return nextActive;
        });
    };

    const handleSection = () => {
        const viewer = viewerRef.current;
        if (!sectionExt || !viewer) return;

        setSectionActive(prev => {
            const nextActive = !prev;
            sectionExt.enabled = nextActive;
            sectionExt.visible = nextActive;
            viewer.requestRender();
            return nextActive;
        });
    };

    const handleCameraView = async (view: "top" | "front" | "side" | "iso") => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        try {
            const { CameraController } = await import("@speckle/viewer");
            const cameraController = viewer.getExtension(CameraController);
            if (!cameraController) return;

            const viewMap = {
                top: "top",
                front: "front",
                side: "right",
                iso: "3d",
            } as const;

            cameraController.setCameraView(viewMap[view], true);
            viewer.requestRender();
        } catch (err) {
            console.warn("Camera view failed:", err);
        }
    };

    const updateMeasurementOptions = (newOptions: {
        type?: number;
        vertexSnap?: boolean;
        chain?: boolean;
        units?: string;
        precision?: number;
    }) => {
        const viewer = viewerRef.current;
        if (!measurementsExt || !viewer) return;

        const current = measurementsExt.options;
        measurementsExt.options = { ...current, ...newOptions };
        measurementsExt.removeMeasurement();
        viewer.requestRender();
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
    };

    const handleSnapChange = (snap: boolean) => {
        setSnapToVertices(snap);
        updateMeasurementOptions({ vertexSnap: snap });
    };

    const handleChainChange = (chain: boolean) => {
        setChainMeasurements(chain);
        updateMeasurementOptions({ chain: chain });
    };

    const handleUnitsChange = (units: string) => {
        setUnits(units);
        updateMeasurementOptions({ units: units });
    };

    const handlePrecisionChange = (precision: number) => {
        setPrecision(precision);
        updateMeasurementOptions({ precision: precision });
    };

    const handleClearAllMeasurements = () => {
        if (measurementsExt) {
            measurementsExt.clearMeasurements();
        }
    };

    /**
     * Обработчик выбора версии из ModelsPanel - перезагружает модель
     */
    const handleSelectVersion = useCallback((objectId: string) => {
        if (objectId === commitId) return; // Уже загружена
        setCommitId(objectId);
    }, [commitId]);

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
                                onToggleSceneExplorer={() => setSceneExplorerVisible(v => !v)}
                                onToggleFiltering={() => setFilteringPanelVisible(v => !v)}
                                onToggleModels={() => setModelsPanelVisible(v => !v)}
                                sceneExplorerActive={sceneExplorerVisible}
                                filteringActive={filteringPanelVisible}
                                modelsActive={modelsPanelVisible}
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

                            <SceneExplorerPanel
                                visible={sceneExplorerVisible}
                                onClose={() => setSceneExplorerVisible(false)}
                                viewerInstance={viewerRef.current}
                                filteringExt={filteringExt}
                                selectionExt={selectionExt}
                                cameraController={cameraControllerExt}
                            />

                            <FilteringPanel
                                visible={filteringPanelVisible}
                                onClose={() => setFilteringPanelVisible(false)}
                                viewerInstance={viewerRef.current}
                                filteringExt={filteringExt}
                                cameraController={cameraControllerExt}
                            />

                            <ModelsPanel
                                visible={modelsPanelVisible}
                                onClose={() => setModelsPanelVisible(false)}
                                speckleServer={SPECKLE_SERVER}
                                token={SPECKLE_TOKEN}
                                streamId={streamId || ""}
                                currentObjectId={commitId}
                                onSelectObjectId={handleSelectVersion}
                                onSetStreamName={(name) => setStreamName(name)}
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