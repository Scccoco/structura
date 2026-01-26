import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Select, Button, Card, Tooltip, Collapse, Empty, Spin, ConfigProvider, theme } from "antd";
import { FilterOutlined, AimOutlined, ReloadOutlined, EyeInvisibleOutlined } from "@ant-design/icons";;

// Интерфейс для объекта модели
interface ModelObject {
    id: string;
    nodeId: string; // ID для FilteringExtension
    name?: string;
    type?: string;
    properties: Record<string, any>;
}

// Интерфейс пропсов
interface FilterPanelProps {
    viewer: any; // Speckle Viewer instance
    filteringExtension: any; // FilteringExtension instance  
    worldTree: any; // WorldTree для обхода объектов
    visible: boolean;
    onClose: () => void;
}

// Вложенные группы для извлечения свойств
const NESTED_GROUPS = ["Report", "User Defined Attributes", "properties"];

// Скрытые технические атрибуты
const HIDDEN_ATTRS = ["id", "applicationId", "totalChildrenCount", "__closure", "displayStyle", "renderMaterial", "displayValue", "referencedId"];

/**
 * Извлекает плоский список свойств из объекта (аналогично SelectInfoPanel)
 */
function extractProperties(raw: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    const processObject = (obj: Record<string, any>, prefix = "") => {
        if (!obj) return;

        Object.entries(obj).forEach(([key, value]) => {
            if (HIDDEN_ATTRS.includes(key)) return;

            // Рекурсивно обрабатываем properties
            if (key === "properties" && typeof value === "object" && value !== null) {
                processObject(value, prefix);
                return;
            }

            // Вложенные группы (Report, User Defined Attributes)
            if (NESTED_GROUPS.includes(key) && typeof value === "object" && value !== null && !Array.isArray(value)) {
                Object.entries(value).forEach(([nestedKey, nestedValue]: [string, any]) => {
                    if (HIDDEN_ATTRS.includes(nestedKey)) return;

                    if (typeof nestedValue === "object" && nestedValue !== null && "value" in nestedValue) {
                        result[nestedKey] = {
                            value: nestedValue.value,
                            units: nestedValue.units,
                            group: key
                        };
                    } else {
                        result[nestedKey] = { value: nestedValue, group: key };
                    }
                });
            }
            // Простое значение с units
            else if (typeof value === "object" && value !== null && "value" in value && !Array.isArray(value)) {
                result[key] = { value: value.value, units: value.units };
            }
            // Простое значение
            else if (typeof value !== "object" || value === null) {
                result[key] = { value };
            }
        });
    };

    processObject(raw);
    return result;
}

/**
 * Конвертирует значение с учётом единиц измерения
 */
function convertValue(value: number, units?: string): { value: number; units: string } {
    if (!units) return { value, units: "" };

    const unitsLower = units.toLowerCase();

    if (unitsLower.includes("cubic millimeter") || unitsLower === "mm³") {
        return { value: value / 1_000_000_000, units: "м³" };
    }
    if (unitsLower.includes("square millimeter") || unitsLower === "mm²") {
        return { value: value / 1_000_000, units: "м²" };
    }
    if (unitsLower === "millimeters" || unitsLower === "mm") {
        return { value: value / 1_000, units: "м" };
    }
    if (unitsLower === "kilograms" || unitsLower === "kg") {
        return value >= 1000
            ? { value: value / 1000, units: "т" }
            : { value, units: "кг" };
    }

    return { value, units };
}

/**
 * Форматирует число для отображения
 */
function formatNumber(value: number): string {
    if (value === 0) return "0";
    if (Math.abs(value) < 0.001) return value.toExponential(2);
    if (Math.abs(value) < 10) return value.toFixed(3);
    if (Math.abs(value) < 1000) return value.toFixed(2);
    return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

/**
 * Панель фильтрации объектов по свойствам
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
    viewer: _viewer, // не используется напрямую, но может понадобиться
    filteringExtension,
    worldTree,
    visible,
    onClose
}) => {
    // Состояния
    const [loading, setLoading] = useState(false);
    const [allObjects, setAllObjects] = useState<ModelObject[]>([]);
    const [filterProperty, setFilterProperty] = useState<string | null>(null);
    const [filterValues, setFilterValues] = useState<string[]>([]);
    const [selectedValues, setSelectedValues] = useState<string[]>([]);
    const [aggregateProperty, setAggregateProperty] = useState<string | null>(null);
    const [isIsolated, setIsIsolated] = useState(false);

    /**
     * Собрать все объекты из WorldTree
     */
    const collectObjects = useCallback(() => {
        if (!worldTree) return;

        setLoading(true);
        const objects: ModelObject[] = [];

        try {
            // Обход дерева объектов
            const walk = (node: any) => {
                if (node?.model?.raw) {
                    const raw = node.model.raw;
                    objects.push({
                        id: raw.id || node.model.id,
                        nodeId: node.model.id,
                        name: raw.name,
                        type: raw.speckle_type,
                        properties: extractProperties(raw)
                    });
                }

                // Рекурсивно обходим детей
                if (node?.children) {
                    for (const child of node.children) {
                        walk(child);
                    }
                }
            };

            // Начинаем с корня
            const root = worldTree.root;
            if (root) {
                walk(root);
            }
        } catch (e) {
            console.error("Error collecting objects:", e);
        }

        setAllObjects(objects);
        setLoading(false);
    }, [worldTree]);

    // Собираем объекты при открытии панели
    useEffect(() => {
        if (visible && worldTree && allObjects.length === 0) {
            collectObjects();
        }
    }, [visible, worldTree, allObjects.length, collectObjects]);

    /**
     * Список всех доступных свойств
     */
    const availableProperties = useMemo(() => {
        const propSet = new Set<string>();

        allObjects.forEach(obj => {
            Object.keys(obj.properties).forEach(key => {
                propSet.add(key);
            });
        });

        return Array.from(propSet).sort();
    }, [allObjects]);

    /**
     * Числовые свойства (для агрегации)
     */
    const numericProperties = useMemo(() => {
        return availableProperties.filter(prop => {
            // Проверяем, есть ли хотя бы один объект с числовым значением
            return allObjects.some(obj => {
                const val = obj.properties[prop]?.value;
                return typeof val === "number";
            });
        });
    }, [availableProperties, allObjects]);

    /**
     * Уникальные значения для выбранного свойства фильтра
     */
    useEffect(() => {
        if (!filterProperty) {
            setFilterValues([]);
            return;
        }

        const values = new Set<string>();
        allObjects.forEach(obj => {
            const prop = obj.properties[filterProperty];
            if (prop?.value !== undefined && prop?.value !== null) {
                values.add(String(prop.value));
            }
        });

        setFilterValues(Array.from(values).sort());
        setSelectedValues([]); // Сброс выбранных значений
    }, [filterProperty, allObjects]);

    /**
     * Отфильтрованные объекты
     */
    const filteredObjects = useMemo(() => {
        if (!filterProperty || selectedValues.length === 0) {
            return allObjects;
        }

        return allObjects.filter(obj => {
            const prop = obj.properties[filterProperty];
            if (!prop) return false;
            return selectedValues.includes(String(prop.value));
        });
    }, [allObjects, filterProperty, selectedValues]);

    /**
     * Агрегированная сумма
     */
    const aggregatedSum = useMemo(() => {
        if (!aggregateProperty) return null;

        let sum = 0;
        let units = "";

        filteredObjects.forEach(obj => {
            const prop = obj.properties[aggregateProperty];
            if (prop && typeof prop.value === "number") {
                sum += prop.value;
                if (!units && prop.units) units = prop.units;
            }
        });

        // Конвертируем единицы
        const converted = convertValue(sum, units);
        return {
            value: converted.value,
            units: converted.units,
            formatted: formatNumber(converted.value)
        };
    }, [filteredObjects, aggregateProperty]);

    /**
     * Изолировать отфильтрованные объекты
     */
    const handleIsolate = useCallback(() => {
        if (!filteringExtension) return;

        const ids = filteredObjects.map(o => o.nodeId);

        if (ids.length > 0) {
            filteringExtension.isolateObjects(ids);
            setIsIsolated(true);
        }
    }, [filteringExtension, filteredObjects]);

    /**
     * Сбросить изоляцию
     */
    const handleReset = useCallback(() => {
        if (!filteringExtension) return;

        filteringExtension.resetFilters();
        setIsIsolated(false);
    }, [filteringExtension]);

    /**
     * Скрыть отфильтрованные объекты
     */
    const handleHide = useCallback(() => {
        if (!filteringExtension) return;

        const ids = filteredObjects.map(o => o.nodeId);

        if (ids.length > 0) {
            filteringExtension.hideObjects(ids);
        }
    }, [filteringExtension, filteredObjects]);

    /**
     * Полный сброс
     */
    const handleFullReset = useCallback(() => {
        setFilterProperty(null);
        setSelectedValues([]);
        setAggregateProperty(null);
        handleReset();
    }, [handleReset]);

    // Используем handleFullReset в будущем
    void handleFullReset;

    if (!visible) return null;

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
            <Card
                title={
                    <span>
                        <FilterOutlined style={{ marginRight: 8 }} />
                        Фильтр по свойствам
                    </span>
                }
                size="small"
                style={{
                    width: 320,
                    position: "absolute",
                    left: 16,
                    top: 80,
                    zIndex: 1000,
                    maxHeight: "calc(100vh - 120px)",
                    overflow: "auto",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
                extra={
                    <Button type="text" size="small" onClick={onClose}>✕</Button>
                }
            >
                {loading ? (
                    <div style={{ textAlign: "center", padding: 20 }}>
                        <Spin tip="Загрузка объектов..." />
                    </div>
                ) : allObjects.length === 0 ? (
                    <Empty description="Объекты не найдены" />
                ) : (
                    <>
                        {/* Статистика */}
                        <div style={{ marginBottom: 16, padding: 8, background: "#f5f5f5", borderRadius: 4 }}>
                            <small style={{ color: "#666" }}>
                                Всего объектов: <strong>{allObjects.length}</strong>
                                {filterProperty && selectedValues.length > 0 && (
                                    <> | Отфильтровано: <strong>{filteredObjects.length}</strong></>
                                )}
                            </small>
                        </div>

                        {/* Фильтр по свойству */}
                        <Collapse
                            defaultActiveKey={["filter"]}
                            size="small"
                            style={{ marginBottom: 12 }}
                        >
                            <Collapse.Panel
                                header="🔍 Фильтр"
                                key="filter"
                            >
                                <div style={{ marginBottom: 8 }}>
                                    <small style={{ color: "#666" }}>Свойство:</small>
                                    <Select
                                        style={{ width: "100%" }}
                                        placeholder="Выберите свойство"
                                        value={filterProperty}
                                        onChange={setFilterProperty}
                                        allowClear
                                        showSearch
                                        options={availableProperties.map(p => ({ label: p, value: p }))}
                                    />
                                </div>

                                {filterProperty && filterValues.length > 0 && (
                                    <div>
                                        <small style={{ color: "#666" }}>Значение:</small>
                                        <Select
                                            style={{ width: "100%" }}
                                            placeholder="Выберите значения"
                                            mode="multiple"
                                            value={selectedValues}
                                            onChange={setSelectedValues}
                                            options={filterValues.map(v => ({ label: v, value: v }))}
                                            maxTagCount={2}
                                        />
                                    </div>
                                )}
                            </Collapse.Panel>

                            {/* Агрегация */}
                            <Collapse.Panel
                                header="📊 Агрегация (сумма)"
                                key="aggregate"
                            >
                                <div style={{ marginBottom: 8 }}>
                                    <small style={{ color: "#666" }}>Суммировать свойство:</small>
                                    <Select
                                        style={{ width: "100%" }}
                                        placeholder="Выберите числовое свойство"
                                        value={aggregateProperty}
                                        onChange={setAggregateProperty}
                                        allowClear
                                        showSearch
                                        options={numericProperties.map(p => ({ label: p, value: p }))}
                                    />
                                </div>

                                {aggregatedSum && (
                                    <div style={{
                                        padding: 12,
                                        background: "#e6f7ff",
                                        borderRadius: 4,
                                        textAlign: "center"
                                    }}>
                                        <div style={{ fontSize: 24, fontWeight: "bold", color: "#1890ff" }}>
                                            {aggregatedSum.formatted}
                                        </div>
                                        <div style={{ fontSize: 12, color: "#666" }}>
                                            {aggregatedSum.units} ({aggregateProperty})
                                        </div>
                                    </div>
                                )}
                            </Collapse.Panel>
                        </Collapse>

                        {/* Кнопки действий */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Tooltip title="Изолировать (показать только отфильтрованные)">
                                <Button
                                    type={isIsolated ? "primary" : "default"}
                                    icon={<AimOutlined />}
                                    onClick={handleIsolate}
                                    disabled={filteredObjects.length === 0 || filteredObjects.length === allObjects.length}
                                >
                                    Изолировать
                                </Button>
                            </Tooltip>

                            <Tooltip title="Скрыть отфильтрованные">
                                <Button
                                    icon={<EyeInvisibleOutlined />}
                                    onClick={handleHide}
                                    disabled={filteredObjects.length === 0}
                                >
                                    Скрыть
                                </Button>
                            </Tooltip>

                            <Tooltip title="Показать все объекты">
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={handleReset}
                                >
                                    Показать все
                                </Button>
                            </Tooltip>
                        </div>

                        {/* Обновить данные */}
                        <div style={{ marginTop: 12, textAlign: "center" }}>
                            <Button
                                type="link"
                                size="small"
                                onClick={collectObjects}
                            >
                                🔄 Обновить список объектов
                            </Button>
                        </div>
                    </>
                )}
            </Card>
        </ConfigProvider>
    );
};

export default FilterPanel;
