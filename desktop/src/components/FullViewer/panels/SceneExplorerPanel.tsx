import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Button, Input, Space, Tree, ConfigProvider, theme } from "antd";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any;

interface SceneExplorerPanelProps {
    visible: boolean;
    onClose: () => void;
    viewerInstance: any;
    filteringExt: any;
    selectionExt?: any;
    cameraController?: any;
}

/**
 * Технические типы геометрии - пропускаем (dive)
 */
const GEOMETRY_TYPES = new Set([
    // Геометрия
    "Brep", "Mesh", "Point", "Line", "Polyline", "Curve", "Surface",
    // Tekla типы
    "Beam", "PolyBeam", "ContourPlate", "BoltArray", "Fitting", "Cut", "Chamfer", "Weld",
    // Другие
    "Objects", "Base", "Geometry"
]);

/**
 * Типы которые полностью исключаем (skip)
 */
const SKIP_TYPES = new Set([
    "RenderMaterial", "Transform", "DisplayStyle",
    "BooleanPart", "BooleanObject", "Boolean"
]);

/**
 * Имена которые полностью исключаем (skip)
 */
const SKIP_NAMES = new Set([
    "BooleanPart", "CutPlane", "Boolean", "BooleanObject",
    "Weld", "Fitting", "Cut", "Chamfer"
]);

/**
 * Проверить, нужно ли показывать узел
 */
function getNodeDecision(node: AnyNode): "show" | "skip" | "dive" {
    const raw = node?.model?.raw;
    if (!raw) return "dive";

    const name = raw?.name;
    const speckleType = raw?.speckle_type || "";

    // Извлекаем тип
    const typeParts = speckleType.split(".");
    const lastType = typeParts[typeParts.length - 1] || "";

    // Полностью пропускаем
    if (SKIP_TYPES.has(lastType)) return "skip";
    if (lastType.includes("Boolean")) return "skip";

    // Нет имени - идём глубже
    if (!name || typeof name !== "string") return "dive";

    const trimmedName = name.trim();
    if (!trimmedName) return "dive";

    // Пропускаем URL
    if (trimmedName.startsWith("http://") || trimmedName.startsWith("https://")) return "dive";

    // Пропускаем ROOT
    if (trimmedName === "ROOT") return "dive";

    // Пропускаем имена из SKIP_NAMES
    if (SKIP_NAMES.has(trimmedName)) return "skip";

    // Если имя == геометрический тип - dive
    if (GEOMETRY_TYPES.has(trimmedName)) return "dive";
    if (GEOMETRY_TYPES.has(lastType)) return "dive";

    return "show";
}

/**
 * Получить дочерние узлы
 */
function getChildren(node: AnyNode): AnyNode[] {
    return (node?.children || node?.__children || []) as AnyNode[];
}

/**
 * Собрать все object ids из поддерева
 */
function collectSubtreeObjectIds(root: AnyNode): string[] {
    const out: string[] = [];
    const stack: AnyNode[] = [root];

    while (stack.length) {
        const n = stack.pop();
        const objectId = n?.model?.id;
        if (objectId) out.push(objectId);

        const ch = getChildren(n);
        for (const c of ch) stack.push(c);
    }

    return Array.from(new Set(out));
}

/**
 * Собрать все значимые листовые элементы (для группировки по name)
 */
interface LeafElement {
    node: AnyNode;
    name: string;
    id: string;
}

function collectLeafElements(node: AnyNode, depth: number = 0): LeafElement[] {
    if (depth > 15) return [];

    const decision = getNodeDecision(node);

    if (decision === "skip") return [];

    const children = getChildren(node);

    if (decision === "show") {
        const raw = node?.model?.raw;
        const name = raw?.name?.trim() || "";
        const id = node?.model?.id || "";

        // Если есть дети - это контейнер, идём глубже
        if (children.length > 0) {
            const childResults: LeafElement[] = [];
            for (const child of children) {
                childResults.push(...collectLeafElements(child, depth + 1));
            }
            // Если нашли дочерние элементы - возвращаем их
            if (childResults.length > 0) return childResults;
        }

        // Это листовой элемент
        return [{ node, name, id }];
    }

    // dive - собираем из детей
    const results: LeafElement[] = [];
    for (const child of children) {
        results.push(...collectLeafElements(child, depth + 1));
    }
    return results;
}

/**
 * Построить дерево с группировкой по имени
 */
function buildGroupedTree(rootNode: AnyNode, search: string): any[] {
    const s = search.trim().toLowerCase();

    // 1. Собираем все листовые элементы
    const leaves = collectLeafElements(rootNode);

    // 2. Группируем по name
    const groups = new Map<string, LeafElement[]>();

    for (const leaf of leaves) {
        const key = leaf.name || "Без имени";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(leaf);
    }

    // 3. Строим дерево из групп
    const treeNodes: any[] = [];

    for (const [name, elements] of groups) {
        // Пропускаем технические имена
        if (SKIP_NAMES.has(name)) continue;

        // Фильтр поиска
        if (s && !name.toLowerCase().includes(s)) continue;

        const count = elements.length;
        const groupKey = `group__${name}`;

        // Если только 1 элемент - показываем без вложенности
        if (count === 1) {
            const el = elements[0];
            treeNodes.push({
                key: `leaf__${el.id}`,
                title: (
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span style={{ fontWeight: 500 }}>{name}</span>
                        <span style={{ color: "#999", fontSize: 12, marginLeft: 8 }}>(1)</span>
                    </div>
                ),
                nodeRef: el.node,
                children: [],
            });
        } else {
            // Группа с несколькими элементами
            const childNodes = elements.map((el, idx) => ({
                key: `leaf__${el.id}__${idx}`,
                title: (
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span style={{ color: "#666" }}>#{idx + 1}</span>
                        <span style={{ color: "#999", fontSize: 11 }}>{el.id.slice(0, 8)}...</span>
                    </div>
                ),
                nodeRef: el.node,
                isLeaf: true,
            }));

            // Создаём виртуальную группу
            treeNodes.push({
                key: groupKey,
                title: (
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span style={{ fontWeight: 600 }}>{name}</span>
                        <span style={{ color: "#1890ff", fontSize: 12, marginLeft: 8 }}>({count})</span>
                    </div>
                ),
                // Для группы nodeRef указывает на первый элемент, но ids берутся из всех
                nodeRef: { __isGroup: true, elements },
                children: childNodes,
            });
        }
    }

    // Сортируем по количеству (большие группы сверху)
    treeNodes.sort((a, b) => {
        const countA = a.nodeRef?.elements?.length ?? 1;
        const countB = b.nodeRef?.elements?.length ?? 1;
        return countB - countA;
    });

    return treeNodes;
}

/**
 * Получить IDs для группы или одиночного элемента
 */
function getIdsForNode(nodeRef: any): string[] {
    if (!nodeRef) return [];

    // Виртуальная группа
    if (nodeRef.__isGroup && nodeRef.elements) {
        return nodeRef.elements.map((el: LeafElement) => el.id);
    }

    // Обычный узел
    return collectSubtreeObjectIds(nodeRef);
}

export const SceneExplorerPanel: React.FC<SceneExplorerPanelProps> = ({
    visible,
    onClose,
    viewerInstance,
    filteringExt,
    selectionExt,
    cameraController,
}) => {
    const [root, setRoot] = useState<AnyNode | null>(null);
    const [search, setSearch] = useState("");
    const [selectedNodeRef, setSelectedNodeRef] = useState<any>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Получить корень WorldTree
    useEffect(() => {
        if (!visible) return;
        if (!viewerInstance) return;

        const wt = viewerInstance.getWorldTree?.();
        const r = wt?.root || wt?.getRoot?.() || null;
        setRoot(r);
    }, [visible, viewerInstance]);

    // Построить данные дерева с группировкой
    const treeData = useMemo(() => {
        if (!root) return [];
        return buildGroupedTree(root, search);
    }, [root, search]);

    // Выбор узла с выделением в модели
    const handleSelect = useCallback((_: any, info: any) => {
        const nodeRef = info?.node?.nodeRef ?? null;
        setSelectedNodeRef(nodeRef);

        if (nodeRef && selectionExt && viewerInstance) {
            const ids = getIdsForNode(nodeRef);
            if (ids.length > 0) {
                try {
                    selectionExt.clearSelection?.();
                    selectionExt.selectObjects?.(ids);
                    viewerInstance.requestRender?.();
                } catch (e) {
                    console.warn("Selection failed:", e);
                }
            }
        }
    }, [selectionExt, viewerInstance]);

    // Camera Rotation Control
    const handlePointerEnter = useCallback(() => {
        cameraController?.disableRotations?.();
    }, [cameraController]);

    const handlePointerLeave = useCallback(() => {
        cameraController?.enableRotations?.();
    }, [cameraController]);

    useEffect(() => {
        if (!visible && cameraController?.enableRotations) {
            cameraController.enableRotations();
        }
    }, [visible, cameraController]);

    if (!visible) return null;

    const ensureReady = () => {
        if (!filteringExt) throw new Error("FilteringExtension не готов");
        if (!viewerInstance) throw new Error("Viewer не готов");
    };

    const idsFromSelected = (): string[] => {
        return getIdsForNode(selectedNodeRef);
    };

    const handleIsolate = () => {
        ensureReady();
        const ids = idsFromSelected();
        if (!ids.length) return;
        filteringExt.isolateObjects(ids, "scene-explorer", true, true);
        viewerInstance.requestRender?.();
    };

    const handleUnIsolate = () => {
        ensureReady();
        const ids = idsFromSelected();
        if (!ids.length) return;
        filteringExt.unIsolateObjects(ids, "scene-explorer", true, true);
        viewerInstance.requestRender?.();
    };

    const handleHide = () => {
        ensureReady();
        const ids = idsFromSelected();
        if (!ids.length) return;
        filteringExt.hideObjects(ids, "scene-explorer", true, false);
        viewerInstance.requestRender?.();
    };

    const handleShow = () => {
        ensureReady();
        const ids = idsFromSelected();
        if (!ids.length) return;
        filteringExt.showObjects(ids, "scene-explorer", true);
        viewerInstance.requestRender?.();
    };

    const handleReset = () => {
        ensureReady();
        filteringExt.resetFilters();
        viewerInstance.requestRender?.();
    };

    const selectedCount = idsFromSelected().length;
    const selectedName = selectedNodeRef?.elements
        ? `${selectedNodeRef.elements.length} объектов`
        : selectedNodeRef?.model?.raw?.name || "элемент";

    return (
        <ConfigProvider theme={{
            algorithm: theme.defaultAlgorithm,
            token: {
                colorBgContainer: '#ffffff',
                colorBgElevated: '#ffffff',
                colorText: '#000000',
                colorTextSecondary: '#666666',
                colorBorder: '#d9d9d9',
                colorPrimary: '#1890ff',
            }
        }}>
            <div
                ref={panelRef}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                style={{
                    position: "absolute",
                    top: 80,
                    left: 16,
                    zIndex: 10000,
                    width: 380,
                    background: "white",
                    borderRadius: 10,
                    padding: 12,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 600 }}>🌳 Проводник сцены</div>
                    <button
                        onClick={onClose}
                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18 }}
                    >
                        ×
                    </button>
                </div>

                <Input
                    placeholder="Поиск по имени..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ marginBottom: 10 }}
                />

                <Space wrap style={{ marginBottom: 10 }}>
                    <Button size="small" onClick={handleIsolate} disabled={!selectedNodeRef}>
                        Изолировать
                    </Button>
                    <Button size="small" onClick={handleUnIsolate} disabled={!selectedNodeRef}>
                        Снять изоляцию
                    </Button>
                    <Button size="small" onClick={handleHide} disabled={!selectedNodeRef}>
                        Скрыть
                    </Button>
                    <Button size="small" onClick={handleShow} disabled={!selectedNodeRef}>
                        Показать
                    </Button>
                    <Button size="small" danger onClick={handleReset}>
                        Сброс
                    </Button>
                </Space>

                <div style={{ maxHeight: "55vh", overflow: "auto", border: "1px solid #eee", borderRadius: 8, padding: 6 }}>
                    {treeData.length > 0 ? (
                        <Tree
                            treeData={treeData}
                            onSelect={handleSelect}
                            showLine={{ showLeafIcon: false }}
                        />
                    ) : (
                        <div style={{ color: "#999", textAlign: "center", padding: 20 }}>
                            {root ? "Нет результатов" : "Загрузка..."}
                        </div>
                    )}
                </div>

                {selectedNodeRef && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                        ✓ Выбрано: {selectedName} ({selectedCount} ID)
                    </div>
                )}

                <div style={{ marginTop: 4, fontSize: 11, color: "#999" }}>
                    Всего групп: {treeData.length}
                </div>
            </div>
        </ConfigProvider>
    );
};
