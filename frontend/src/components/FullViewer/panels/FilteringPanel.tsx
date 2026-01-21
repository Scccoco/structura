import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button, Input, Select, Space } from "antd";

interface FilteringPanelProps {
    visible: boolean;
    onClose: () => void;
    viewerInstance: any;
    filteringExt: any;
    cameraController?: any;
}

// Индекс: property -> value -> objectIds[]
type IndexMap = Map<string, Map<string, string[]>>;

/**
 * Технические свойства которые скрываем
 */
const SKIP_PROPERTIES = new Set([
    "id", "speckle_type", "totalChildrenCount", "applicationId",
    "units", "referencedId", "renderMaterial", "displayStyle",
    "__closure", "__tree", "__subtreeId", "__parents"
]);

/**
 * Паттерны технических свойств
 */
function isSkipProperty(key: string): boolean {
    if (SKIP_PROPERTIES.has(key)) return true;
    if (key.startsWith("__")) return true;
    if (key.startsWith("@")) return true;
    if (key.includes("closure")) return true;
    if (key.includes("Closure")) return true;
    return false;
}

/**
 * Человекочитаемые названия свойств
 */
const PROPERTY_LABELS: Record<string, string> = {
    "name": "Имя",
    "category": "Категория",
    "type": "Тип",
    "level": "Уровень",
    "material": "Материал",
    "profile": "Профиль",
    "area": "Площадь",
    "volume": "Объём",
    "height": "Высота",
    "width": "Ширина",
    "length": "Длина",
    "thickness": "Толщина",
    "elementId": "ID элемента",
    "family": "Семейство",
    "phase": "Фаза",
    "mark": "Марка",
    "class": "Класс (Tekla)",
    "part_prefix": "Префикс (Tekla)",
    "assembly_pos": "Позиция сборки (Tekla)",
};

function getPropertyLabel(key: string): string {
    return PROPERTY_LABELS[key] || key;
}

/**
 * Проверить, является ли значение примитивом
 */
function isPrimitive(v: any): boolean {
    const t = typeof v;
    return v == null || t === "string" || t === "number" || t === "boolean";
}

/**
 * Индексировать объект raw по свойствам
 */
function indexRawObject(raw: any, objectId: string, index: IndexMap) {
    if (!raw || typeof raw !== "object") return;

    const push = (key: string, val: any) => {
        // Пропускаем технические свойства
        if (isSkipProperty(key)) return;
        if (!isPrimitive(val)) return;

        const v = val == null ? "null" : String(val);
        // Пропускаем пустые значения и слишком длинные
        if (!v.trim() || v.length > 100) return;

        if (!index.has(key)) index.set(key, new Map());
        const valMap = index.get(key)!;

        if (!valMap.has(v)) valMap.set(v, []);
        valMap.get(v)!.push(objectId);
    };

    for (const [k, v] of Object.entries(raw)) {
        if (isSkipProperty(k)) continue;

        if (isPrimitive(v)) {
            push(k, v);
            continue;
        }

        // Вложенные объекты (один уровень) - без технических
        if (v && typeof v === "object" && !Array.isArray(v)) {
            for (const [k2, v2] of Object.entries(v)) {
                if (!isSkipProperty(k2) && isPrimitive(v2)) {
                    push(`${k}.${k2}`, v2);
                }
            }
        }
    }
}

export const FilteringPanel: React.FC<FilteringPanelProps> = ({
    visible,
    onClose,
    viewerInstance,
    filteringExt,
    cameraController,
}) => {
    const [index, setIndex] = useState<IndexMap>(new Map());
    const [keySearch, setKeySearch] = useState("");
    const [valueSearch, setValueSearch] = useState("");

    const [selectedKey, setSelectedKey] = useState<string>("");
    const [selectedValue, setSelectedValue] = useState<string>("");

    const buildingRef = useRef(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Построить индекс при открытии панели
    useEffect(() => {
        if (!visible) return;
        if (!viewerInstance) return;
        if (buildingRef.current) return;

        buildingRef.current = true;

        const wt = viewerInstance.getWorldTree?.();
        const root = wt?.root || wt?.getRoot?.();
        if (!root) {
            buildingRef.current = false;
            return;
        }

        const idx: IndexMap = new Map();
        const stack: any[] = [root];

        // Обход дерева
        while (stack.length) {
            const n = stack.pop();
            const objectId = n?.model?.id;
            const raw = n?.model?.raw;

            if (objectId && raw) {
                indexRawObject(raw, objectId, idx);
            }

            const children = (n?.children || n?.__children || []) as any[];
            for (const ch of children) stack.push(ch);
        }

        // Удалить дубликаты ids
        for (const [, valMap] of idx) {
            for (const [v, ids] of valMap) {
                valMap.set(v, Array.from(new Set(ids)));
            }
        }

        setIndex(idx);
        buildingRef.current = false;
    }, [visible, viewerInstance]);

    // Все ключи (property names) — только не-технические
    const allKeys = useMemo(() => {
        return Array.from(index.keys())
            .filter(k => !isSkipProperty(k))
            .sort((a, b) => getPropertyLabel(a).localeCompare(getPropertyLabel(b)));
    }, [index]);

    // Отфильтрованные ключи по поиску
    const filteredKeys = useMemo(() => {
        const s = keySearch.trim().toLowerCase();
        if (!s) return allKeys;
        return allKeys.filter((k) => {
            const label = getPropertyLabel(k).toLowerCase();
            return label.includes(s) || k.toLowerCase().includes(s);
        });
    }, [allKeys, keySearch]);

    // Значения для выбранного ключа
    const valuesForKey = useMemo(() => {
        if (!selectedKey) return [];
        const valMap = index.get(selectedKey);
        if (!valMap) return [];

        const values = Array.from(valMap.keys());
        const s = valueSearch.trim().toLowerCase();

        const filtered = !s ? values : values.filter((v) => v.toLowerCase().includes(s));
        return filtered.sort();
    }, [index, selectedKey, valueSearch]);

    // IDs для текущего выбора
    const idsForSelection = useMemo(() => {
        if (!selectedKey || !selectedValue) return [];
        const valMap = index.get(selectedKey);
        return valMap?.get(selectedValue) || [];
    }, [index, selectedKey, selectedValue]);

    // Camera Rotation Control
    const handlePanelEnter = useCallback(() => {
        cameraController?.disableRotations?.();
    }, [cameraController]);

    const handlePanelLeave = useCallback(() => {
        cameraController?.enableRotations?.();
    }, [cameraController]);

    // getPopupContainer для Select - чтобы dropdown был внутри панели
    const getPopupContainer = useCallback(() => {
        return panelRef.current || document.body;
    }, []);

    if (!visible) return null;

    const ensureReady = () => {
        if (!filteringExt) throw new Error("FilteringExtension не готов");
        if (!viewerInstance) throw new Error("Viewer не готов");
    };

    const handleIsolate = () => {
        ensureReady();
        if (!idsForSelection.length) return;
        filteringExt.isolateObjects(idsForSelection, "filters-panel", true, true);
        viewerInstance.requestRender?.();
    };

    const handleHide = () => {
        ensureReady();
        if (!idsForSelection.length) return;
        filteringExt.hideObjects(idsForSelection, "filters-panel", true, false);
        viewerInstance.requestRender?.();
    };

    const handleReset = () => {
        ensureReady();
        filteringExt.resetFilters();
        viewerInstance.requestRender?.();
    };

    return (
        <div
            ref={panelRef}
            onPointerEnter={handlePanelEnter}
            onPointerLeave={handlePanelLeave}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            style={{
                position: "absolute",
                top: 80,
                left: 420,
                zIndex: 10000,
                width: 380,
                background: "white",
                borderRadius: 10,
                padding: 12,
                boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                overflow: "visible", // Для dropdown
            }}
        >
            {/* Заголовок */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>🧪 Фильтры по свойствам</div>
                <button
                    onClick={onClose}
                    style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18 }}
                >
                    ×
                </button>
            </div>

            {/* Поиск свойства */}
            <Input
                placeholder="Поиск свойства..."
                value={keySearch}
                onChange={(e) => setKeySearch(e.target.value)}
                style={{ marginBottom: 10 }}
            />

            {/* Выбор свойства */}
            <Select
                value={selectedKey || undefined}
                onChange={(v) => {
                    setSelectedKey(v);
                    setSelectedValue("");
                    setValueSearch("");
                }}
                placeholder="Выберите свойство"
                style={{ width: "100%", marginBottom: 10 }}
                showSearch
                filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={filteredKeys.map((k) => ({
                    label: getPropertyLabel(k),
                    value: k
                }))}
                getPopupContainer={getPopupContainer}
                dropdownStyle={{ zIndex: 10001 }}
            />

            {/* Поиск значения */}
            <Input
                placeholder="Поиск значения..."
                value={valueSearch}
                onChange={(e) => setValueSearch(e.target.value)}
                disabled={!selectedKey}
                style={{ marginBottom: 10 }}
            />

            {/* Выбор значения */}
            <Select
                value={selectedValue || undefined}
                onChange={setSelectedValue}
                placeholder="Выберите значение"
                disabled={!selectedKey}
                style={{ width: "100%", marginBottom: 10 }}
                showSearch
                filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={valuesForKey.map((v) => {
                    const count = index.get(selectedKey!)?.get(v)?.length ?? 0;
                    return { label: `${v} (${count})`, value: v };
                })}
                getPopupContainer={getPopupContainer}
                dropdownStyle={{ zIndex: 10001 }}
            />

            {/* Кнопки действий */}
            <Space wrap>
                <Button onClick={handleIsolate} disabled={!idsForSelection.length}>
                    Изолировать
                </Button>
                <Button onClick={handleHide} disabled={!idsForSelection.length}>
                    Скрыть
                </Button>
                <Button danger onClick={handleReset}>
                    Сброс
                </Button>
            </Space>

            {/* Информация */}
            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                Найдено объектов: {idsForSelection.length}
            </div>
            <div style={{ fontSize: 11, color: "#999" }}>
                Доступных свойств: {allKeys.length}
            </div>
        </div>
    );
};
