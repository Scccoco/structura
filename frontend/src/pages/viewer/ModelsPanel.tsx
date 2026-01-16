import React, { useEffect, useState } from "react";
import { Button, Spin } from "antd";

interface CommitItem {
    id: string;
    referencedObject: string;
    message?: string | null;
    createdAt?: string | null;
    authorName?: string | null;
}

interface ModelsPanelProps {
    visible: boolean;
    onClose: () => void;

    speckleServer: string;
    token: string;
    streamId: string;

    currentObjectId: string | null;
    onSelectObjectId: (objectId: string) => void;
    onSetStreamName?: (name: string) => void;
}

const GET_COMMITS_QUERY = `
    query GetCommits($streamId: String!, $limit: Int!) {
        stream(id: $streamId) {
            name
            commits(limit: $limit) {
                items {
                    id
                    referencedObject
                    message
                    createdAt
                    authorName
                }
            }
        }
    }
`;

export const ModelsPanel: React.FC<ModelsPanelProps> = ({
    visible,
    onClose,
    speckleServer,
    token,
    streamId,
    currentObjectId,
    onSelectObjectId,
    onSetStreamName,
}) => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<CommitItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Загрузить коммиты при открытии панели
    useEffect(() => {
        if (!visible) return;
        if (!streamId) return;

        const fetchCommits = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${speckleServer}/graphql`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        query: GET_COMMITS_QUERY,
                        variables: { streamId, limit: 20 },
                    }),
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();
                if (data.errors?.length) throw new Error(data.errors[0].message);

                const stream = data.data?.stream;
                if (!stream) throw new Error("Stream not found");

                onSetStreamName?.(stream.name);

                const commits = stream.commits?.items || [];
                setItems(commits);
            } catch (e: any) {
                setError(e?.message || "Ошибка загрузки коммитов");
            } finally {
                setLoading(false);
            }
        };

        fetchCommits();
    }, [visible, streamId, speckleServer, token, onSetStreamName]);

    if (!visible) return null;

    return (
        <div
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            style={{
                position: "absolute",
                top: 80,
                right: 16,
                zIndex: 10000,
                width: 360,
                background: "white",
                borderRadius: 10,
                padding: 12,
                boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                maxHeight: "70vh",
                overflow: "auto",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>🗂 Models (Commits)</div>
                <button
                    onClick={onClose}
                    style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18 }}
                >
                    ×
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ padding: 20, textAlign: "center" }}>
                    <Spin />
                    <div style={{ marginTop: 8, color: "#666" }}>Загрузка коммитов...</div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{ color: "crimson", padding: 12, background: "#fff5f5", borderRadius: 8 }}>
                    {error}
                </div>
            )}

            {/* Commits List */}
            {!loading && !error && items.map((commit, index) => {
                const isActive = currentObjectId === commit.referencedObject;
                const isLatest = index === 0;

                return (
                    <div
                        key={commit.id}
                        style={{
                            border: "1px solid #eee",
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 8,
                            background: isActive ? "rgba(24, 144, 255, 0.08)" : "white",
                            borderColor: isActive ? "#1890ff" : "#eee",
                        }}
                    >
                        {/* Status Label */}
                        <div style={{ fontWeight: 600, marginBottom: 4, color: isActive ? "#1890ff" : "#333" }}>
                            {isLatest && isActive
                                ? "✓ Последний (просматривается)"
                                : isLatest
                                    ? "Последний коммит"
                                    : isActive
                                        ? "✓ Просматривается"
                                        : `Коммит #${items.length - index}`}
                        </div>

                        {/* Date & Author */}
                        <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                            {commit.createdAt
                                ? new Date(commit.createdAt).toLocaleString("ru-RU")
                                : "Дата неизвестна"}
                            {commit.authorName ? ` · ${commit.authorName}` : ""}
                        </div>

                        {/* Message */}
                        <div style={{ marginBottom: 8, fontSize: 13 }}>
                            {commit.message || "(без сообщения)"}
                        </div>

                        {/* View Button */}
                        <Button
                            size="small"
                            type={isActive ? "default" : "primary"}
                            onClick={() => onSelectObjectId(commit.referencedObject)}
                            disabled={isActive}
                        >
                            {isActive ? "Уже просматривается" : "Открыть"}
                        </Button>
                    </div>
                );
            })}

            {/* Empty State */}
            {!loading && !error && items.length === 0 && (
                <div style={{ color: "#999", textAlign: "center", padding: 20 }}>
                    Коммиты не найдены
                </div>
            )}
        </div>
    );
};
