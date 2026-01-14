import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Spin, Alert, Typography } from "antd";

const { Title } = Typography;

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

export const ViewerPage = () => {
    const { streamId } = useParams<{ streamId: string }>();
    const containerRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commitId, setCommitId] = useState<string | null>(null);
    const [streamName, setStreamName] = useState<string>("");

    // Fetch latest commit when streamId changes
    useEffect(() => {
        if (!streamId) return;
        fetchLatestCommit();
    }, [streamId]);

    // Initialize viewer when commitId is ready
    useEffect(() => {
        if (!commitId || !containerRef.current) return;

        let cancelled = false;
        let viewer: any = null;

        const initViewer = async () => {
            try {
                setLoading(true);
                setError(null);

                const { Viewer, CameraController, SpeckleLoader, FilteringExtension } = await import("@speckle/viewer");

                const objectUrl = `${SPECKLE_SERVER}/streams/${streamId}/objects/${commitId}`;

                viewer = new Viewer(containerRef.current!, {
                    showStats: true,
                    environmentSrc: null as any,
                    verbose: true,
                });

                await viewer.init();

                viewer.createExtension(CameraController);
                const filtering = viewer.createExtension(FilteringExtension);

                const loader = new SpeckleLoader(viewer.getWorldTree(), objectUrl, SPECKLE_TOKEN);
                await viewer.loadObject(loader, true);

                if (cancelled) return;

                console.log("Модель загружена");

                // Collect all object IDs and color them red
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
                    console.log("Красный цвет применен");
                }

                // Zoom to model
                const doZoom = () => {
                    try {
                        viewer.zoom();
                        console.log("Зум выполнен");
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
                console.error("Ошибка загрузки модели:", e);
                setError(e?.message || "Не удалось загрузить модель");
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
        <Card title={streamName || `Модель: ${streamId}`}>
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
                }}
            />
        </Card>
    );
};