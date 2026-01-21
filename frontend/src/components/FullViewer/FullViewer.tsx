import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Card, Spin, Alert } from "antd";
import { ViewerToolbar } from "./panels/ViewerToolbar";
import { MeasurementsPanel } from "./panels/MeasurementsPanel";
import { SceneExplorerPanel } from "./panels/SceneExplorerPanel";
import { ModelsPanel } from "./panels/ModelsPanel";
import { SelectInfoPanel } from "./panels/SelectInfoPanel";
import { FilterPanel } from "./panels/FilterPanel";
import { DefaultViewerParams } from "@speckle/viewer";

const SPECKLE_SERVER = "https://speckle.structura-most.ru";
const SPECKLE_TOKEN = "95184e89f7abe8d350cc6bb70ce69b606dba95b7bf"; // ZMK token

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

// Props interface for reusable component
export interface FullViewerProps {
    streamId: string;
    token?: string;
    height?: string | number;
    showToolbar?: boolean;
    onReady?: (viewer: any) => void;
    onObjectSelect?: (element: any) => void;
    onAssemblyMapReady?: (assemblyMap: Map<string, string[]>) => void; // assemblyGuid → objectIds[]
}

// AssemblyMap type: ST_ASSEMBLY_GUID → [objectIds]
export type AssemblyMap = Map<string, string[]>;

export interface FullViewerRef {
    getViewer: () => any;
    reloadModel: (objectId: string) => Promise<void>;
    fitToView: () => void;
    highlightObjects: (objectIds: string[]) => void;
    fitToObjects: (objectIds: string[]) => void;
    selectAssembly: (assemblyGuid: string) => void;
    colorByStatus: (statusColors: { assemblyGuid: string; color: number }[]) => void;
    getAssemblyMap: () => AssemblyMap;
    resetSelection: () => void;
}

export const FullViewer = forwardRef<FullViewerRef, FullViewerProps>(({
    streamId,
    token: _token = SPECKLE_TOKEN,
    height = "calc(100vh - 220px)",
    showToolbar: _showToolbar = true,
    onReady: _onReady,
    onObjectSelect: _onObjectSelect,
    onAssemblyMapReady
}, ref) => {
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

    // AssemblyMap: ST_ASSEMBLY_GUID → [objectIds]
    const assemblyMapRef = useRef<AssemblyMap>(new Map());

    const [measurementsExt, setMeasurementsExt] = useState<any>(null);
    const [sectionExt, setSectionExt] = useState<any>(null);
    const [selectionExt, setSelectionExt] = useState<any>(null);
    const [filteringExt, setFilteringExt] = useState<any>(null);
    const [cameraControllerExt, setCameraControllerExt] = useState<any>(null);
    const [diffExt, setDiffExt] = useState<any>(null); // DifExtension для сравнения

    // Diff mode состояния
    const [diffMode, setDiffMode] = useState(false);
    const [diffCommitA, setDiffCommitA] = useState<string | null>(null);
    const [diffCommitB, setDiffCommitB] = useState<string | null>(null);
    const [diffStats, setDiffStats] = useState<{ added: number; removed: number; modified: number; unchanged: number } | null>(null);

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
    const [modelsPanelVisible, setModelsPanelVisible] = useState(false);
    const [propertyFilterVisible, setPropertyFilterVisible] = useState(false);

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

                // DifExtension для сравнения версий (динамический импорт)
                let diff: any = null;
                try {
                    const viewerModule = await import("@speckle/viewer") as any;
                    const DifExtClass = viewerModule.DifExtension || viewerModule.DiffExtension;
                    if (DifExtClass) {
                        diff = viewer.createExtension(DifExtClass);
                        setDiffExt(diff);
                        console.log("✅ DifExtension создан");
                    } else {
                        console.warn("DifExtension не найден в экспортах @speckle/viewer");
                    }
                } catch (e) {
                    console.warn("DifExtension не доступен:", e);
                }

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

                // Построение карты сборок из WorldTree
                try {
                    const worldTree = viewer.getWorldTree();
                    const newAssemblyMap: AssemblyMap = new Map();

                    worldTree.walk((node: any) => {
                        const raw = node.model?.raw;
                        if (!raw?.id) return true;

                        const uda = raw?.properties?.['User Defined Attributes'];
                        const assemblyGuid = uda?.ST_ASSEMBLY_GUID;

                        if (assemblyGuid) {
                            if (!newAssemblyMap.has(assemblyGuid)) {
                                newAssemblyMap.set(assemblyGuid, []);
                            }
                            newAssemblyMap.get(assemblyGuid)!.push(raw.id);
                        }
                        return true; // continue walking
                    });

                    assemblyMapRef.current = newAssemblyMap;
                    console.log(`📊 AssemblyMap построен: ${newAssemblyMap.size} сборок`);

                    // Callback если задан
                    if (onAssemblyMapReady) {
                        onAssemblyMapReady(newAssemblyMap);
                    }
                } catch (e) {
                    console.warn("Ошибка построения assemblyMap:", e);
                }
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

    /**
     * Запустить Diff между двумя версиями
     * urlA = "текущая" (старая), urlB = "входящая" (новая)
     * Результат показывает что изменилось от A к B
     */
    const startDiff = async (commitA: string, commitB: string) => {
        const viewer = viewerRef.current;
        if (!viewer || !diffExt) {
            console.warn("Viewer или DiffExtension не готовы");
            return;
        }

        try {
            setLoading(true);
            setDiffMode(true);
            setDiffCommitA(commitA);
            setDiffCommitB(commitB);
            setDiffStats(null);

            // A = старая версия (current), B = новая версия (incoming)
            // Diff покажет: что добавлено в B, что удалено из A, что изменилось
            const urlA = `${SPECKLE_SERVER}/streams/${streamId}/objects/${commitA}`;
            const urlB = `${SPECKLE_SERVER}/streams/${streamId}/objects/${commitB}`;

            console.log("Diff начат:", { urlA: urlA.slice(-12), urlB: urlB.slice(-12) });

            // Вызов diff с VisualDiffMode.PLAIN — оригинальные материалы
            // Мы сами будем красить все категории через FilteringExtension
            const { VisualDiffMode } = await import("@speckle/viewer") as any;
            const plainMode = VisualDiffMode?.PLAIN ?? 0;

            const result = await diffExt.diff(urlA, urlB, plainMode, SPECKLE_TOKEN);

            const stats = {
                added: result?.added?.length || 0,
                removed: result?.removed?.length || 0,
                modified: result?.modified?.length || 0,
                unchanged: result?.unchanged?.length || 0,
            };

            console.log("✅ Diff результат:", stats);
            setDiffStats(stats);

            // updateVisualDiff(1) — показываем incoming (новую версию)
            if (diffExt.updateVisualDiff) {
                diffExt.updateVisualDiff(1);
            }

            // Кастомная покраска ВСЕХ категорий через FilteringExtension
            if (filteringExt) {
                try {
                    // Хелпер для извлечения ID из TreeNode
                    const extractIds = (nodes: any[]): string[] => {
                        if (!nodes || !Array.isArray(nodes)) return [];
                        return nodes
                            .map((node: any) =>
                                node?.model?.raw?.id || node?.model?.id || node?.id || node?.raw?.id
                            )
                            .filter((id: string | undefined) => id);
                    };

                    // Цвета (формат: 0xAARRGGBB)
                    // Alpha: FF = непрозрачный, 80 = 50% прозрачность
                    const colors = {
                        unchanged: 0x80808080, // Серый с 50% прозрачностью
                        added: 0xFF00CC00, // Зелёный (непрозрачный)
                        removed: 0xFFCC0000, // Красный (непрозрачный)
                        modified: 0xFFFFAA00, // Жёлтый/оранжевый (непрозрачный)
                    };

                    const colorGroups: Array<{ objectIds: string[], color: number }> = [];

                    // Unchanged — серые с прозрачностью
                    const unchangedIds = extractIds(result?.unchanged || []);
                    if (unchangedIds.length > 0) {
                        colorGroups.push({ objectIds: unchangedIds, color: colors.unchanged });
                        console.log("⚪ Unchanged:", unchangedIds.length);
                    }

                    // Added — зелёные
                    const addedIds = extractIds(result?.added || []);
                    if (addedIds.length > 0) {
                        colorGroups.push({ objectIds: addedIds, color: colors.added });
                        console.log("🟢 Added:", addedIds.length);
                    }

                    // Removed — красные
                    const removedIds = extractIds(result?.removed || []);
                    if (removedIds.length > 0) {
                        colorGroups.push({ objectIds: removedIds, color: colors.removed });
                        console.log("🔴 Removed:", removedIds.length);
                    }

                    // Modified — жёлтые (массив пар [old, new])
                    if (result?.modified && Array.isArray(result.modified)) {
                        const modifiedIds: string[] = [];
                        result.modified.forEach((pair: any[]) => {
                            if (Array.isArray(pair)) {
                                pair.forEach((node: any) => {
                                    const id = node?.model?.raw?.id || node?.model?.id || node?.id || node?.raw?.id;
                                    if (id) modifiedIds.push(id);
                                });
                            }
                        });
                        if (modifiedIds.length > 0) {
                            colorGroups.push({ objectIds: modifiedIds, color: colors.modified });
                            console.log("🟡 Modified:", modifiedIds.length);
                        }
                    }

                    // Применяем все цвета разом
                    if (colorGroups.length > 0) {
                        filteringExt.setUserObjectColors(colorGroups);
                        console.log("✅ Кастомные цвета применены ко всем категориям");
                    }

                } catch (e) {
                    console.warn("Ошибка при покраске объектов:", e);
                }
            }

            viewer.requestRender();
            setLoading(false);
        } catch (e: any) {
            console.error("Ошибка diff:", e);
            setError(e?.message || "Ошибка сравнения версий");
            setLoading(false);
            setDiffMode(false);
            setDiffStats(null);
        }
    };

    /**
     * Остановить Diff
     */
    const stopDiff = async () => {
        const viewer = viewerRef.current;
        if (!viewer || !diffExt) return;

        try {
            await diffExt.undiff();

            // Очистить кастомные цвета
            if (filteringExt) {
                try {
                    // Сбросить кастомные цвета объектов
                    filteringExt.removeUserObjectColors();
                    filteringExt.resetFilters();
                } catch (e) {
                    console.warn("Ошибка сброса цветов:", e);
                }
            }

            setDiffMode(false);
            setDiffCommitA(null);
            setDiffCommitB(null);
            setDiffStats(null);
            viewer.requestRender();
            console.log("✅ Diff отменён");
        } catch (e: any) {
            console.error("Ошибка undiff:", e);
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

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        getViewer: () => viewerRef.current,
        reloadModel: reloadModel,
        fitToView: handleFitToView,
        highlightObjects: (objectIds: string[]) => {
            if (!filteringExt || !viewerRef.current) return;
            try {
                filteringExt.resetFilters();
                if (objectIds.length > 0) {
                    filteringExt.isolateObjects(objectIds);
                }
            } catch (e) {
                console.warn("highlightObjects error:", e);
            }
        },
        fitToObjects: (objectIds: string[]) => {
            if (!filteringExt || objectIds.length === 0) return;
            try {
                // isolateObjects already focuses view on the objects
                filteringExt.isolateObjects(objectIds, undefined, true, true);
            } catch (e) {
                console.warn("fitToObjects error:", e);
            }
        },
        selectAssembly: (assemblyGuid: string) => {
            const objectIds = assemblyMapRef.current.get(assemblyGuid);
            console.log(`🔍 selectAssembly: guid=${assemblyGuid}, objectIds count=${objectIds?.length || 0}`, objectIds?.slice(0, 3));

            if (!objectIds || objectIds.length === 0) {
                console.warn("No objects found for assembly:", assemblyGuid);
                return;
            }
            if (selectionExt) {
                console.log("🔍 Calling selectionExt.selectObjects");
                selectionExt.selectObjects(objectIds);
            }
            if (filteringExt) {
                console.log("🔍 Calling filteringExt.isolateObjects");
                filteringExt.isolateObjects(objectIds, undefined, true, true);
            }
        },
        colorByStatus: (statusColors: { assemblyGuid: string; color: number }[]) => {
            if (!filteringExt) {
                console.warn("colorByStatus: filteringExt not ready");
                return;
            }
            try {
                const colorGroups: { objectIds: string[]; color: string }[] = [];

                // Group by color
                const colorMap = new Map<number, string[]>();
                let totalObjects = 0;

                for (const { assemblyGuid, color } of statusColors) {
                    const objectIds = assemblyMapRef.current.get(assemblyGuid);
                    if (objectIds && objectIds.length > 0) {
                        if (!colorMap.has(color)) {
                            colorMap.set(color, []);
                        }
                        colorMap.get(color)!.push(...objectIds);
                        totalObjects += objectIds.length;
                    }
                }

                console.log(`🔍 colorByStatus: ${colorMap.size} colors, ${totalObjects} total objects`);

                // Convert to format expected by setUserObjectColors
                for (const [color, objectIds] of colorMap.entries()) {
                    // Convert ARGB number to hex string
                    const hexColor = "#" + (color & 0x00FFFFFF).toString(16).padStart(6, "0");
                    colorGroups.push({ objectIds, color: hexColor });
                    console.log(`🔍 Color group: ${hexColor} -> ${objectIds.length} objects`);
                }

                if (colorGroups.length > 0) {
                    console.log("🔍 Calling filteringExt.setUserObjectColors with", colorGroups.length, "groups");
                    filteringExt.setUserObjectColors(colorGroups);
                } else {
                    console.warn("colorByStatus: No color groups to apply");
                }
            } catch (e) {
                console.warn("colorByStatus error:", e);
            }
        },
        getAssemblyMap: () => assemblyMapRef.current,
        resetSelection: () => {
            if (selectionExt) {
                selectionExt.clearSelection();
            }
            if (filteringExt) {
                filteringExt.resetFilters();
            }
            console.log("🔄 Selection and filters reset");
        },
    }));

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
                        height: typeof height === "number" ? `${height}px` : height,
                        minHeight: "400px",
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
                                onToggleModels={() => setModelsPanelVisible(v => !v)}
                                onTogglePropertyFilter={() => setPropertyFilterVisible(v => !v)}
                                sceneExplorerActive={sceneExplorerVisible}
                                modelsActive={modelsPanelVisible}
                                propertyFilterActive={propertyFilterVisible}
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

                            <ModelsPanel
                                visible={modelsPanelVisible}
                                onClose={() => setModelsPanelVisible(false)}
                                speckleServer={SPECKLE_SERVER}
                                token={SPECKLE_TOKEN}
                                streamId={streamId || ""}
                                currentObjectId={commitId}
                                onSelectObjectId={handleSelectVersion}
                                onSetStreamName={(name) => setStreamName(name)}
                                onStartDiff={startDiff}
                                onStopDiff={stopDiff}
                                diffMode={diffMode}
                                diffCommitA={diffCommitA}
                                diffCommitB={diffCommitB}
                                diffStats={diffStats}
                            />

                            {/* Панель фильтрации по свойствам */}
                            <FilterPanel
                                viewer={viewerRef.current}
                                filteringExtension={filteringExt}
                                worldTree={viewerRef.current?.getWorldTree?.()}
                                visible={propertyFilterVisible}
                                onClose={() => setPropertyFilterVisible(false)}
                            />
                        </>
                    )}
                </div>
            </Card>


            {/* Панель информации о выбранном элементе */}
            {!loading && (
                <SelectInfoPanel
                    selectedElement={selectedElement}
                    onClose={() => setSelectedElement(null)}
                />
            )}
        </div>
    );
});

FullViewer.displayName = "FullViewer";

export default FullViewer;