/**
 * SpeckleViewer - 3D Viewer для Speckle моделей
 */
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Spin, Alert, Space, Button, Tooltip } from "antd";
import { ExpandOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";

// Speckle config
const SPECKLE_SERVER = "https://speckle.structura-most.ru";
const SPECKLE_TOKEN = "b47015ff123fc23131070342b14043c1b8a657dfb7"; // Token for model 69b5048b92

const DefaultViewerParams = {
    showStats: false,
    verbose: false,
};

export interface SpeckleViewerRef {
    highlightObjects: (objectIds: string[]) => void;
    fitToObjects: (objectIds: string[]) => void;
    fitToView: () => void;
    setCamera: (view: "top" | "front" | "side" | "iso") => void;
    getViewer: () => any;
}

interface SpeckleViewerProps {
    streamId: string;
    modelId?: string;
    commitId?: string;
    height?: string | number;
    showToolbar?: boolean;
    highlightObjectIds?: string[];
    onObjectSelect?: (objectId: string, properties: any) => void;
    onLoad?: () => void;
    onError?: (error: string) => void;
}

export const SpeckleViewer = forwardRef<SpeckleViewerRef, SpeckleViewerProps>(({
    streamId,
    modelId,
    commitId: propCommitId,
    height = 400,
    showToolbar = true,
    highlightObjectIds,
    onObjectSelect,
    onLoad,
    onError
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const extensionsRef = useRef<any>(null);
    const isInitializedRef = useRef(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commitId, setCommitId] = useState<string | null>(propCommitId || null);

    // Fetch latest commit if not provided
    const fetchLatestCommit = useCallback(async () => {
        if (propCommitId) {
            setCommitId(propCommitId);
            return;
        }

        try {
            const query = modelId
                ? `query { project(id: "${streamId}") { model(id: "${modelId}") { versions(limit: 1) { items { id referencedObject } } } } }`
                : `query { project(id: "${streamId}") { models(limit: 1) { items { versions(limit: 1) { items { id referencedObject } } } } } }`;

            const response = await fetch(`${SPECKLE_SERVER}/graphql`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${SPECKLE_TOKEN}`,
                },
                body: JSON.stringify({ query }),
            });

            const data = await response.json();

            let refObject: string | null = null;
            if (modelId && data.data?.project?.model?.versions?.items?.[0]) {
                refObject = data.data.project.model.versions.items[0].referencedObject;
            } else if (data.data?.project?.models?.items?.[0]?.versions?.items?.[0]) {
                refObject = data.data.project.models.items[0].versions.items[0].referencedObject;
            }

            if (refObject) {
                setCommitId(refObject);
            } else {
                setError("Не удалось получить модель");
            }
        } catch (e: any) {
            setError(e.message);
            onError?.(e.message);
        }
    }, [streamId, modelId, propCommitId]);

    // Initialize viewer
    const initViewer = useCallback(async () => {
        if (!commitId || !containerRef.current || isInitializedRef.current) return;

        try {
            setLoading(true);
            setError(null);

            const { Viewer, CameraController, SpeckleLoader, SelectionExtension } = await import("@speckle/viewer");

            const objectUrl = `${SPECKLE_SERVER}/streams/${streamId}/objects/${commitId}`;

            const viewer = new Viewer(containerRef.current, DefaultViewerParams as any);
            await viewer.init();

            const cameraCtrl = viewer.createExtension(CameraController);
            const selection = viewer.createExtension(SelectionExtension);

            const { FilteringExtension } = await import("@speckle/viewer");
            const filtering = viewer.createExtension(FilteringExtension);

            extensionsRef.current = {
                cameraController: cameraCtrl,
                selection,
                filtering,
            };

            // Selection callback
            (viewer as any).on("select", (selectionInfo: any) => {
                if (selectionInfo?.hits?.length > 0) {
                    const hit = selectionInfo.hits[0];
                    onObjectSelect?.(hit.node?.model?.raw?.id, hit.node?.model?.raw);
                }
            });

            // Load model
            const loader = new SpeckleLoader(viewer.getWorldTree(), objectUrl, SPECKLE_TOKEN);
            await viewer.loadObject(loader, true);

            viewerRef.current = viewer;
            isInitializedRef.current = true;
            setLoading(false);
            onLoad?.();

        } catch (e: any) {
            console.error("SpeckleViewer init error:", e);
            setError(e.message);
            setLoading(false);
            onError?.(e.message);
        }
    }, [commitId, streamId, onObjectSelect, onLoad, onError]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        highlightObjects: (objectIds: string[]) => {
            if (!extensionsRef.current?.filtering || !viewerRef.current) return;
            try {
                extensionsRef.current.filtering.resetFilters();
                if (objectIds.length > 0) {
                    extensionsRef.current.filtering.isolateObjects(objectIds);
                }
            } catch (e) {
                console.warn("highlightObjects error:", e);
            }
        },
        fitToObjects: (objectIds: string[]) => {
            if (!viewerRef.current || objectIds.length === 0) return;
            try {
                viewerRef.current.zoom(objectIds);
            } catch (e) {
                console.warn("fitToObjects error:", e);
            }
        },
        fitToView: () => {
            if (!extensionsRef.current?.cameraController) return;
            extensionsRef.current.cameraController.setCameraView([], true, 1);
        },
        setCamera: (view: "top" | "front" | "side" | "iso") => {
            if (!extensionsRef.current?.cameraController) return;
            const views: Record<string, any> = {
                top: { position: { x: 0, y: 100, z: 0 }, target: { x: 0, y: 0, z: 0 } },
                front: { position: { x: 0, y: 0, z: 100 }, target: { x: 0, y: 0, z: 0 } },
                side: { position: { x: 100, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
                iso: { position: { x: 50, y: 50, z: 50 }, target: { x: 0, y: 0, z: 0 } },
            };
            extensionsRef.current.cameraController.setCameraView(views[view], true);
        },
        getViewer: () => viewerRef.current,
    }));

    // Effects
    useEffect(() => {
        fetchLatestCommit();
    }, [streamId, modelId, propCommitId]);

    useEffect(() => {
        if (commitId) initViewer();
    }, [commitId, initViewer]);

    // Highlight objects when highlightObjectIds changes
    useEffect(() => {
        if (highlightObjectIds && isInitializedRef.current && extensionsRef.current?.filtering) {
            try {
                extensionsRef.current.filtering.resetFilters();
                if (highlightObjectIds.length > 0) {
                    extensionsRef.current.filtering.isolateObjects(highlightObjectIds);
                }
            } catch (e) {
                console.warn("Auto-highlight error:", e);
            }
        }
    }, [highlightObjectIds]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (viewerRef.current) {
                try {
                    viewerRef.current.dispose();
                } catch (e) {
                    console.warn("Viewer dispose error:", e);
                }
            }
        };
    }, []);

    return (
        <div style={{ position: "relative", height, width: "100%" }}>
            {loading && (
                <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.7)",
                    zIndex: 10,
                }}>
                    <Spin size="large" tip="Загрузка модели..." />
                </div>
            )}
            {error && (
                <Alert
                    type="error"
                    message="Ошибка загрузки"
                    description={error}
                    style={{ margin: 16 }}
                />
            )}
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    background: "#1a1a1a",
                    borderRadius: 8,
                }}
            />
            {showToolbar && !loading && !error && (
                <div style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    zIndex: 5,
                }}>
                    <Space>
                        <Tooltip title="Показать всё">
                            <Button
                                size="small"
                                icon={<ExpandOutlined />}
                                onClick={() => extensionsRef.current?.cameraController?.setCameraView([], true, 1)}
                            />
                        </Tooltip>
                        <Tooltip title="Вид сверху">
                            <Button
                                size="small"
                                icon={<VerticalAlignTopOutlined />}
                                onClick={() => {
                                    extensionsRef.current?.cameraController?.setCameraView(
                                        { position: { x: 0, y: 100, z: 0 }, target: { x: 0, y: 0, z: 0 } },
                                        true
                                    );
                                }}
                            />
                        </Tooltip>
                    </Space>
                </div>
            )}
        </div>
    );
});

SpeckleViewer.displayName = "SpeckleViewer";

export default SpeckleViewer;
