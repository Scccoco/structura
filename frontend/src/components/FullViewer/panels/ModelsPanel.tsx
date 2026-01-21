import React, { useEffect, useState, useCallback } from "react";
import { Button, Spin, Checkbox, Space, Alert } from "antd";

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

    // Diff functionality
    onStartDiff?: (commitA: string, commitB: string) => void;
    onStopDiff?: () => void;
    diffMode?: boolean;
    diffCommitA?: string | null;
    diffCommitB?: string | null;
    diffStats?: { added: number; removed: number; modified: number; unchanged: number } | null;
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
    onStartDiff,
    onStopDiff,
    diffMode = false,
    diffCommitA,
    diffCommitB,
    diffStats,
}) => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<CommitItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Для выбора коммитов для diff
    const [selectedForDiff, setSelectedForDiff] = useState<Set<string>>(new Set());

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
                if (!stream) throw new Error("Проект не найден");

                onSetStreamName?.(stream.name);

                const commits = stream.commits?.items || [];
                setItems(commits);
            } catch (e: any) {
                setError(e?.message || "Ошибка загрузки версий");
            } finally {
                setLoading(false);
            }
        };

        fetchCommits();
    }, [visible, streamId, speckleServer, token, onSetStreamName]);

    // Переключение выбора для diff
    const toggleDiffSelection = useCallback((objectId: string) => {
        setSelectedForDiff(prev => {
            const next = new Set(prev);
            if (next.has(objectId)) {
                next.delete(objectId);
            } else {
                // Максимум 2 для сравнения
                if (next.size >= 2) {
                    // Удаляем первый, добавляем новый
                    const first = next.values().next().value;
                    if (first) next.delete(first);
                }
                next.add(objectId);
            }
            return next;
        });
    }, []);

    // Запустить сравнение
    // urlA = "current" (старая версия), urlB = "incoming" (новая версия)
    // items[0] = самая новая, items[N-1] = самая старая
    const handleStartDiff = useCallback(() => {
        const selected = Array.from(selectedForDiff);
        if (selected.length !== 2 || !onStartDiff) return;

        // Найти индексы выбранных версий
        const indexA = items.findIndex(c => c.referencedObject === selected[0]);
        const indexB = items.findIndex(c => c.referencedObject === selected[1]);

        // Больший индекс = старее (items отсортированы по дате DESC)
        // A должен быть старый (больший индекс), B должен быть новый (меньший индекс)
        let olderCommit: string;
        let newerCommit: string;

        if (indexA > indexB) {
            olderCommit = selected[0]; // A старше
            newerCommit = selected[1];
        } else {
            olderCommit = selected[1]; // B старше
            newerCommit = selected[0];
        }

        console.log("Diff: A(старая)=", olderCommit.slice(0, 8), ", B(новая)=", newerCommit.slice(0, 8));
        onStartDiff(olderCommit, newerCommit);
    }, [selectedForDiff, onStartDiff, items]);

    // Остановить сравнение
    const handleStopDiff = useCallback(() => {
        onStopDiff?.();
        setSelectedForDiff(new Set());
    }, [onStopDiff]);

    if (!visible) return null;

    const canDiff = selectedForDiff.size === 2 && onStartDiff;
    const hasDiffSupport = !!onStartDiff;

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
                width: 380,
                background: "white",
                borderRadius: 10,
                padding: 12,
                boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                maxHeight: "70vh",
                overflow: "auto",
            }}
        >
            {/* Заголовок */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>🗂 История версий</div>
                <button
                    onClick={onClose}
                    style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18 }}
                >
                    ×
                </button>
            </div>

            {/* Diff Mode Banner */}
            {diffMode && (
                <Alert
                    type="warning"
                    message="Режим сравнения"
                    description={
                        <div style={{ fontSize: 12 }}>
                            <div style={{ marginBottom: 8 }}>
                                🟢 Добавленные · 🟡 Изменённые · 🔴 Удалённые · ⚪ Без изменений
                            </div>
                            {diffStats && (
                                <div style={{
                                    background: '#fff',
                                    padding: 8,
                                    borderRadius: 4,
                                    marginBottom: 8
                                }}>
                                    <strong>Статистика:</strong>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
                                        <span>🟢 Добавлено: <b>{diffStats.added}</b></span>
                                        <span>🔴 Удалено: <b>{diffStats.removed}</b></span>
                                        <span>🟡 Изменено: <b>{diffStats.modified}</b></span>
                                        <span>⚪ Без изм.: <b>{diffStats.unchanged}</b></span>
                                    </div>
                                </div>
                            )}
                            <Button size="small" onClick={handleStopDiff}>
                                Завершить сравнение
                            </Button>
                        </div>
                    }
                    style={{ marginBottom: 10 }}
                />
            )}

            {/* Diff Controls */}
            {!diffMode && hasDiffSupport && (
                <div style={{
                    marginBottom: 10,
                    padding: 8,
                    background: "#f5f5f5",
                    borderRadius: 6,
                    fontSize: 12
                }}>
                    <div style={{ marginBottom: 6, color: "#666" }}>
                        Выберите 2 версии для сравнения:
                    </div>
                    <Space>
                        <Button
                            size="small"
                            type="primary"
                            onClick={handleStartDiff}
                            disabled={!canDiff}
                        >
                            🔀 Сравнить ({selectedForDiff.size}/2)
                        </Button>
                        {selectedForDiff.size > 0 && (
                            <Button size="small" onClick={() => setSelectedForDiff(new Set())}>
                                Сбросить
                            </Button>
                        )}
                    </Space>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{ padding: 20, textAlign: "center" }}>
                    <Spin />
                    <div style={{ marginTop: 8, color: "#666" }}>Загрузка версий...</div>
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
                const isSelectedForDiff = selectedForDiff.has(commit.referencedObject);
                const isDiffA = diffCommitA === commit.referencedObject;
                const isDiffB = diffCommitB === commit.referencedObject;

                return (
                    <div
                        key={commit.id}
                        style={{
                            border: "1px solid #eee",
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 8,
                            background: isActive
                                ? "rgba(24, 144, 255, 0.08)"
                                : isSelectedForDiff
                                    ? "rgba(250, 140, 22, 0.08)"
                                    : "white",
                            borderColor: isActive
                                ? "#1890ff"
                                : isSelectedForDiff
                                    ? "#fa8c16"
                                    : "#eee",
                        }}
                    >
                        {/* Header with Checkbox */}
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                            {!diffMode && hasDiffSupport && (
                                <Checkbox
                                    checked={isSelectedForDiff}
                                    onChange={() => toggleDiffSelection(commit.referencedObject)}
                                    style={{ marginRight: 8 }}
                                />
                            )}
                            <div style={{ fontWeight: 600, flex: 1, color: isActive ? "#1890ff" : "#333" }}>
                                {isLatest && isActive
                                    ? "✓ Последняя (просматривается)"
                                    : isLatest
                                        ? "Последняя версия"
                                        : isActive
                                            ? "✓ Просматривается"
                                            : `Версия #${items.length - index}`}
                                {isDiffA && <span style={{ color: "#fa541c", marginLeft: 6 }}>A</span>}
                                {isDiffB && <span style={{ color: "#52c41a", marginLeft: 6 }}>B</span>}
                            </div>
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
                        {!diffMode && (
                            <Button
                                size="small"
                                type={isActive ? "default" : "primary"}
                                onClick={() => onSelectObjectId(commit.referencedObject)}
                                disabled={isActive}
                            >
                                {isActive ? "Уже просматривается" : "Открыть"}
                            </Button>
                        )}
                    </div>
                );
            })}

            {/* Empty State */}
            {!loading && !error && items.length === 0 && (
                <div style={{ color: "#999", textAlign: "center", padding: 20 }}>
                    Версии не найдены
                </div>
            )}
        </div>
    );
};
