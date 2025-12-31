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

                const { Viewer, CameraController, SpeckleLoader, SelectionExtension, FilteringExtension } = await import("@speckle/viewer");

                // ВАЖНО: грузим напрямую object endpoint на сервере (3001),
                // чтобы не было попыток лезть на 3000/graphql и ловить CORS.
                const objectUrl =
                    "http://localhost:3001/streams/87db0c5f50/objects/e16d04cc7f79b2d9cbe6b8d561faaed5";

                // Токен. Для приватного проекта обязателен.
                const authToken = (import.meta as any).env?.VITE_SPECKLE_TOKEN || "";

                viewer = new Viewer(containerRef.current!, {
                    showStats: false,
                    environmentSrc: null,
                    verbose: false,
                    keepGeometryData: true,
                });

                await viewer.init();

                const camera = viewer.createExtension(CameraController);
                const selection = viewer.createExtension(SelectionExtension);
                const filtering = viewer.createExtension(FilteringExtension);

                // Грузим объект
                const loader = new SpeckleLoader(viewer.getWorldTree(), objectUrl, authToken);
                await viewer.loadObject(loader, true);

                if (cancelled) return;

                console.log("✅ Модель загружена. Синхронизация с Speckle Adapter...");

                // ИНТЕГРАЦИЯ С БЭКЕНДОМ
                // Запрашиваем карту GUID -> SpeckleID
                try {
                    const streamId = "87db0c5f50";
                    const modelId = "aa4f480934";

                    // Запрашиваем статусы из нашей базы
                    const response = await fetch(`http://localhost:8090/project-data/${streamId}/${modelId}`);
                    const data = await response.json();

                    console.log("📊 Project Statuses:", data);

                    if (data.items && Array.isArray(data.items)) {
                        const statusGroups: Record<string, string[]> = {};

                        // Собираем ID по группам
                        data.items.forEach((item: any) => {
                            const status = item.status || 'new';
                            if (!statusGroups[status]) statusGroups[status] = [];
                            // Важно: используем speckle_id, так как Speckle Viewer работает с ним
                            statusGroups[status].push(item.speckle_id);
                        });

                        // ЦВЕТОВАЯ ЛЕГЕНДА: согласовано с edit.tsx
                        const statusColors: Record<string, number> = {
                            'not_started': 0xADD8E6,  // LightBlue (Не начато)
                            'in_progress': 0xFFA500,  // Orange (В работе)
                            'completed': 0x00FF00,    // Green (Завершено)
                            'new': 0xADD8E6           // Fallback for legacy
                        };

                        // Применяем цвета
                        Object.keys(statusGroups).forEach(status => {
                            const ids = statusGroups[status];
                            const color = statusColors[status] || 0x808080;

                            console.log(`🎨 Status '${status}': ${ids.length} элементов -> Color ${color.toString(16)}`);
                            filtering.setColor(ids, color);
                        });

                        if (data.items.length === 0) {
                            console.warn("⚠️ База данных вернула 0 элементов. Вы делали /sync?");
                        }
                    }
                } catch (err) {
                    console.error("❌ Ошибка связи с адаптером:", err);
                }


                // Ресайз после загрузки
                viewer.resize();

                // Фокус камеры. Делаем несколько попыток с задержкой,
                // потому что объем/дерево часто догружается асинхронно.
                const tryFit = () => {
                    try {
                        camera?.fitToView?.();
                    } catch { }
                };

                tryFit();
                setTimeout(tryFit, 250);
                setTimeout(tryFit, 800);
                setTimeout(tryFit, 1500);

                setLoading(false);
            } catch (e: any) {
                console.error(e);
                setError(e?.message || "Не удалось инициализировать Viewer");
                setLoading(false);
            }
        };

        init();

        return () => {
            cancelled = true;
            try {
                viewer?.dispose?.();
            } catch { }
            try {
                if (containerRef.current) containerRef.current.innerHTML = "";
            } catch { }
        };
    }, []);

    if (error) {
        return (
            <Alert
                message="Ошибка загрузки 3D модели"
                description={<p style={{ whiteSpace: "pre-line" }}>{error}</p>}
                type="error"
                showIcon
            />
        );
    }

    return (
        <Card title="BIM Модель (Speckle Viewer)">
            {loading && (
                <div style={{ textAlign: "center", padding: "80px 16px" }}>
                    <Spin size="large" />
                    <p style={{ marginTop: 16 }}>Загрузка 3D модели...</p>
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
                    background: "#fff",
                    opacity: loading ? 0.25 : 1,
                }}
            />
        </Card>
    );
};
