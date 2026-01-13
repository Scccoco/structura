import { useEffect, useRef, useState } from "react";
import { Card, Spin, Alert } from "antd";

export const ViewerPage = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let cancelled = false;
        let viewer: any = null;

        const init = async () => {
            try {
                setLoading(true);
                setError(null);

                const { Viewer, CameraController, SpeckleLoader, FilteringExtension } = await import("@speckle/viewer");

                const objectUrl = "http://localhost:3001/streams/87db0c5f50/objects/e16d04cc7f79b2d9cbe6b8d561faaed5";

                const authToken = "";

                viewer = new Viewer(containerRef.current!, {
                    showStats: true,
                    environmentSrc: null as any, // Cast to any to fix TS error (required prop but we want null)
                    verbose: true,
                });

                await viewer.init();

                viewer.createExtension(CameraController);
                // const selection = viewer.createExtension(SelectionExtension); // Unused
                const filtering = viewer.createExtension(FilteringExtension);

                const loader = new SpeckleLoader(viewer.getWorldTree(), objectUrl, authToken);
                await viewer.loadObject(loader, true);

                if (cancelled) return;

                console.log("Модель загружена. Собираем IDs и красим в красный...");

                const allObjectIds: string[] = [];

                function collectIds(node: any) {
                    if (node?.model?.id) {
                        allObjectIds.push(node.model.id);
                    }
                    if (node?.children && Array.isArray(node.children)) {
                        node.children.forEach(collectIds);
                    }
                }

                const root = viewer.getWorldTree().root;
                if (root) {
                    collectIds(root);
                }

                console.log(`Найдено объектов: ${allObjectIds.length}`);

                if (allObjectIds.length > 0) {
                    filtering.setUserObjectColors([
                        {
                            objectIds: allObjectIds,
                            color: "#ff0000"
                        }
                    ]);

                    console.log("Красный цвет применен ко всем объектам");
                } else {
                    console.warn("IDs не найдены");
                }

                // Зум на модель - несколько раз с задержкой, чтобы точно сфокусировалось
                const doZoom = () => {
                    try {
                        viewer.zoom();  // Без аргументов - зум на весь extents
                        console.log("Зум выполнен (viewer.zoom())");
                    } catch (err) {
                        console.warn("viewer.zoom не сработал:", err);
                    }
                };

                doZoom();
                setTimeout(doZoom, 500);
                setTimeout(doZoom, 1500);
                setTimeout(doZoom, 3000);
                setTimeout(doZoom, 5000);

                viewer.resize();

                setLoading(false);
            } catch (e: any) {
                console.error("Ошибка:", e);
                setError(e?.message || "Не загрузилось");
                setLoading(false);
            }
        };

        init();

        return () => {
            cancelled = true;
            viewer?.dispose?.();
            if (containerRef.current) containerRef.current.innerHTML = "";
        };
    }, []);

    if (error) {
        return (
            <Alert
                message="Ошибка"
                description={<p style={{ whiteSpace: "pre-line" }}>{error}</p>}
                type="error"
                showIcon
            />
        );
    }

    return (
        <Card title="Тест - модель должна появиться и стать красной">
            {loading && (
                <div style={{ textAlign: "center", padding: "80px 16px" }}>
                    <Spin size="large" />
                    <p style={{ marginTop: 16 }}>Загрузка и фокус камеры...</p>
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
                }}
            />
        </Card>
    );
};