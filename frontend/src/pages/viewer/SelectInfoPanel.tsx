import React, { useState, useEffect, useMemo } from "react";
import { Descriptions, Button, Modal, Checkbox, Input, Empty, Tag, Tooltip, Collapse } from "antd";
import { SettingOutlined, CloseOutlined, SearchOutlined, CopyOutlined, EditOutlined } from "@ant-design/icons";

// Ключи для localStorage
const STORAGE_KEY = "viewer_model_attributes";
const LABELS_STORAGE_KEY = "viewer_model_attribute_labels";

// Атрибуты по умолчанию для отображения (из Tekla Report)
const DEFAULT_VISIBLE_ATTRIBUTES = [
    "speckle_type",
    "name",
    "NAME",
    "PHASE",
    "WIDTH",
    "HEIGHT",
    "LENGTH",
    "VOLUME",
    "WEIGHT",
    "AREA",
    "PREFIX",
    "PROFILE_TYPE",
    "MATERIAL_TYPE",
    "ASSEMBLY_POS",
    "MOST_level_1",
    "MOST_level_2",
    "MOST_level_3",
    "MOST_classification"
];

// Атрибуты которые скрываем (технические)
const HIDDEN_ATTRIBUTES = [
    "id",
    "applicationId",
    "totalChildrenCount",
    "__closure",
    "displayStyle",
    "renderMaterial",
    "displayValue",
    "referencedId"
];

// Группы вложенных объектов для распаковки
const NESTED_GROUPS = ["Report", "User Defined Attributes", "properties"];

interface FlattenedAttribute {
    key: string;           // Уникальный ключ для React
    name: string;          // Отображаемое имя
    value: any;            // Значение
    units?: string;        // Единицы измерения (если есть)
    group?: string;        // Группа (Report, User Defined Attributes, etc.)
    originalKey: string;   // Оригинальный ключ
}

interface SelectInfoPanelProps {
    selectedElement: {
        id: string;
        type: string;
        properties: Record<string, any>;
    } | null;
    onClose: () => void;
}

/**
 * Распаковывает вложенные объекты в плоский список атрибутов
 */
function flattenProperties(props: Record<string, any>): FlattenedAttribute[] {
    const result: FlattenedAttribute[] = [];

    if (!props) return result;

    // Рекурсивная функция для обработки вложенных объектов
    const processObject = (obj: Record<string, any>, parentGroup?: string) => {
        Object.entries(obj).forEach(([key, value]) => {
            // Пропускаем скрытые атрибуты
            if (HIDDEN_ATTRIBUTES.includes(key)) return;

            // Если это объект `properties` верхнего уровня — рекурсивно обрабатываем его содержимое
            if (key === "properties" && typeof value === "object" && value !== null && !Array.isArray(value)) {
                processObject(value, undefined); // Обрабатываем содержимое properties
                return;
            }

            // Проверяем, это вложенная группа (Report, User Defined Attributes)?
            if (NESTED_GROUPS.includes(key) && typeof value === "object" && value !== null && !Array.isArray(value)) {
                // Распаковываем вложенную группу
                Object.entries(value).forEach(([nestedKey, nestedValue]: [string, any]) => {
                    if (HIDDEN_ATTRIBUTES.includes(nestedKey)) return;

                    // Проверяем формат {name, value, units}
                    if (
                        typeof nestedValue === "object" &&
                        nestedValue !== null &&
                        "value" in nestedValue
                    ) {
                        result.push({
                            key: `${key}.${nestedKey}`,
                            name: nestedValue.name || nestedKey,
                            value: nestedValue.value,
                            units: nestedValue.units,
                            group: key,  // Группа = Report или User Defined Attributes
                            originalKey: nestedKey
                        });
                    } else {
                        // Простое значение
                        result.push({
                            key: `${key}.${nestedKey}`,
                            name: nestedKey,
                            value: nestedValue,
                            group: key,
                            originalKey: nestedKey
                        });
                    }
                });
            } else if (
                // Корневой атрибут с форматом {name, value, units}
                typeof value === "object" &&
                value !== null &&
                !Array.isArray(value) &&
                "value" in value &&
                Object.keys(value).length <= 4
            ) {
                result.push({
                    key: key,
                    name: value.name || key,
                    value: value.value,
                    units: value.units,
                    group: parentGroup || "Основные",
                    originalKey: key
                });
            } else if (
                // Простой атрибут (не объект или массив)
                typeof value !== "object" ||
                value === null ||
                Array.isArray(value)
            ) {
                result.push({
                    key: key,
                    name: key,
                    value: value,
                    group: parentGroup || "Основные",
                    originalKey: key
                });
            }
            // Сложные объекты пропускаем
        });
    };

    processObject(props);

    return result;
}

/**
 * Панель информации о выбранном элементе
 * Показывает атрибуты модели из Speckle с возможностью настройки
 */
export const SelectInfoPanel: React.FC<SelectInfoPanelProps> = ({
    selectedElement,
    onClose
}) => {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [visibleAttributes, setVisibleAttributes] = useState<string[]>([]);
    const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
    const [searchFilter, setSearchFilter] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<string[]>(["Report", "User Defined Attributes"]);
    const [editingLabel, setEditingLabel] = useState<string | null>(null);
    const [tempLabelValue, setTempLabelValue] = useState("");

    // Загрузка настроек из localStorage
    useEffect(() => {
        // Загрузка видимых атрибутов
        const savedVisible = localStorage.getItem(STORAGE_KEY);
        if (savedVisible) {
            try {
                setVisibleAttributes(JSON.parse(savedVisible));
            } catch {
                setVisibleAttributes(DEFAULT_VISIBLE_ATTRIBUTES);
            }
        } else {
            setVisibleAttributes(DEFAULT_VISIBLE_ATTRIBUTES);
        }

        // Загрузка кастомных лейблов
        const savedLabels = localStorage.getItem(LABELS_STORAGE_KEY);
        if (savedLabels) {
            try {
                setCustomLabels(JSON.parse(savedLabels));
            } catch {
                setCustomLabels({});
            }
        }
    }, []);

    // Распакованные атрибуты
    const flattenedAttributes = useMemo(() => {
        if (!selectedElement?.properties) return [];
        return flattenProperties(selectedElement.properties);
    }, [selectedElement?.properties]);

    // Все уникальные имена атрибутов (для настроек)
    const allAttributeNames = useMemo(() => {
        return [...new Set(flattenedAttributes.map(attr => attr.name))].sort();
    }, [flattenedAttributes]);

    // Группировка атрибутов
    const groupedAttributes = useMemo(() => {
        const groups: Record<string, FlattenedAttribute[]> = {
            "Основные": [],
            "Report": [],
            "User Defined Attributes": []
        };

        flattenedAttributes
            .filter(attr => visibleAttributes.includes(attr.name) || visibleAttributes.length === 0)
            .filter(attr => {
                if (!searchFilter) return true;
                const lowerFilter = searchFilter.toLowerCase();
                return attr.name.toLowerCase().includes(lowerFilter) ||
                    String(attr.value).toLowerCase().includes(lowerFilter);
            })
            .forEach(attr => {
                const group = attr.group || "Основные";
                if (!groups[group]) groups[group] = [];
                groups[group].push(attr);
            });

        return groups;
    }, [flattenedAttributes, visibleAttributes, searchFilter]);

    // Общее количество отображаемых атрибутов
    const displayedCount = Object.values(groupedAttributes).reduce((sum, arr) => sum + arr.length, 0);

    // Форматирование значения
    const formatValue = (attr: FlattenedAttribute): string => {
        const value = attr.value;
        if (value === null || value === undefined) return "—";
        if (typeof value === "boolean") return value ? "Да" : "Нет";
        if (typeof value === "number") {
            const formatted = Number.isInteger(value) ? String(value) : value.toFixed(3);
            return attr.units ? `${formatted} ${attr.units}` : formatted;
        }
        if (Array.isArray(value)) return `[${value.length} элементов]`;
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    };

    // Копирование значения
    const copyValue = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // Сохранение настроек
    const saveSettings = (attrs: string[]) => {
        setVisibleAttributes(attrs);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(attrs));
    };

    // Сохранение кастомного лейбла
    const saveLabel = (attrName: string, label: string) => {
        const newLabels = { ...customLabels };
        if (label.trim() && label.trim() !== attrName) {
            newLabels[attrName] = label.trim();
        } else {
            delete newLabels[attrName]; // Если лейбл пустой или равен оригиналу — удаляем
        }
        setCustomLabels(newLabels);
        localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(newLabels));
    };

    // Получить отображаемое имя атрибута
    const getDisplayName = (attrName: string): string => {
        return customLabels[attrName] || attrName.replace(/_/g, " ");
    };

    // Сброс настроек
    const resetSettings = () => {
        saveSettings(DEFAULT_VISIBLE_ATTRIBUTES);
    };

    // Сброс всех лейблов
    const resetLabels = () => {
        setCustomLabels({});
        localStorage.removeItem(LABELS_STORAGE_KEY);
    };

    // Показать все атрибуты
    const showAllAttributes = () => {
        saveSettings(allAttributeNames);
    };

    if (!selectedElement) return null;

    const renderAttributeGroup = (groupName: string, attributes: FlattenedAttribute[]) => {
        if (attributes.length === 0) return null;

        return (
            <Collapse.Panel
                key={groupName}
                header={
                    <span style={{ fontSize: 12, fontWeight: 500 }}>
                        {groupName === "Report" ? "📊 Параметры Tekla" :
                            groupName === "User Defined Attributes" ? "📝 Пользовательские атрибуты" :
                                "📐 Основные"}
                        <Tag style={{ marginLeft: 8 }}>{attributes.length}</Tag>
                    </span>
                }
            >
                <Descriptions
                    column={1}
                    size="small"
                    bordered
                    labelStyle={{
                        width: 140,
                        fontSize: 11,
                        padding: "4px 8px",
                        background: "#fafafa"
                    }}
                    contentStyle={{
                        fontSize: 11,
                        padding: "4px 8px",
                        wordBreak: "break-word"
                    }}
                >
                    {attributes.map(attr => (
                        <Descriptions.Item
                            key={attr.key}
                            label={
                                <Tooltip title={`Оригинал: ${attr.originalKey}`}>
                                    <span>{getDisplayName(attr.name)}</span>
                                </Tooltip>
                            }
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>
                                    {formatValue(attr)}
                                </span>
                                <Tooltip title="Копировать">
                                    <CopyOutlined
                                        style={{ cursor: "pointer", color: "#999", fontSize: 10 }}
                                        onClick={() => copyValue(formatValue(attr))}
                                    />
                                </Tooltip>
                            </div>
                        </Descriptions.Item>
                    ))}
                </Descriptions>
            </Collapse.Panel>
        );
    };

    return (
        <div
            style={{
                position: "absolute",
                right: 16,
                top: 80,
                width: 380,
                background: "white",
                borderRadius: 8,
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                overflow: "hidden",
                zIndex: 1000,
            }}
        >
            {/* Заголовок */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: "1px solid #f0f0f0",
                    background: "#fafafa"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 13 }}>📐 Параметры элемента</h4>
                    <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{selectedElement.type.split(".").pop()}</Tag>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                    <Tooltip title="Настройка атрибутов">
                        <Button
                            type="text"
                            size="small"
                            icon={<SettingOutlined />}
                            onClick={() => setSettingsOpen(true)}
                        />
                    </Tooltip>
                    <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={onClose}
                    />
                </div>
            </div>

            {/* Поиск */}
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0" }}>
                <Input
                    size="small"
                    placeholder="Поиск атрибутов..."
                    prefix={<SearchOutlined />}
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    allowClear
                />
            </div>

            {/* ID элемента */}
            <div style={{ padding: "6px 12px", background: "#f5f5f5", fontSize: 11 }}>
                <span style={{ color: "#888" }}>ID: </span>
                <Tooltip title="Копировать ID">
                    <span
                        style={{ cursor: "pointer", fontFamily: "monospace" }}
                        onClick={() => copyValue(selectedElement.id)}
                    >
                        {selectedElement.id.slice(0, 24)}...
                        <CopyOutlined style={{ marginLeft: 4, fontSize: 9 }} />
                    </span>
                </Tooltip>
            </div>

            {/* Список атрибутов по группам */}
            <div
                style={{
                    maxHeight: "calc(100vh - 320px)",
                    overflow: "auto",
                }}
            >
                {displayedCount === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            searchFilter
                                ? "Атрибуты не найдены"
                                : "Нет выбранных атрибутов"
                        }
                        style={{ padding: 20 }}
                    >
                        {!searchFilter && (
                            <Button size="small" onClick={showAllAttributes}>
                                Показать все
                            </Button>
                        )}
                    </Empty>
                ) : (
                    <Collapse
                        defaultActiveKey={expandedGroups}
                        onChange={(keys) => setExpandedGroups(keys as string[])}
                        bordered={false}
                        size="small"
                    >
                        {renderAttributeGroup("Основные", groupedAttributes["Основные"])}
                        {renderAttributeGroup("Report", groupedAttributes["Report"])}
                        {renderAttributeGroup("User Defined Attributes", groupedAttributes["User Defined Attributes"])}
                    </Collapse>
                )}
            </div>

            {/* Счётчик */}
            <div style={{
                padding: "6px 12px",
                borderTop: "1px solid #f0f0f0",
                fontSize: 10,
                color: "#888",
                textAlign: "center"
            }}>
                Показано {displayedCount} из {flattenedAttributes.length} атрибутов
            </div>

            {/* Модальное окно настроек */}
            <Modal
                title="⚙️ Настройка атрибутов"
                open={settingsOpen}
                onCancel={() => {
                    setSettingsOpen(false);
                    setEditingLabel(null);
                }}
                footer={[
                    <Button key="resetLabels" onClick={resetLabels}>
                        Сбросить имена
                    </Button>,
                    <Button key="reset" onClick={resetSettings}>
                        По умолчанию
                    </Button>,
                    <Button key="all" onClick={showAllAttributes}>
                        Выбрать все
                    </Button>,
                    <Button key="none" onClick={() => saveSettings([])}>
                        Очистить
                    </Button>,
                    <Button key="close" type="primary" onClick={() => {
                        setSettingsOpen(false);
                        setEditingLabel(null);
                    }}>
                        Готово
                    </Button>
                ]}
                width={550}
            >
                <p style={{ marginBottom: 12, color: "#666", fontSize: 12 }}>
                    Выберите атрибуты и задайте им понятные имена:
                </p>
                <div style={{ maxHeight: 400, overflow: "auto" }}>
                    {allAttributeNames.map(attrName => (
                        <div
                            key={attrName}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 0",
                                borderBottom: "1px solid #f0f0f0"
                            }}
                        >
                            <Checkbox
                                checked={visibleAttributes.includes(attrName)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        saveSettings([...visibleAttributes, attrName]);
                                    } else {
                                        saveSettings(visibleAttributes.filter(a => a !== attrName));
                                    }
                                }}
                            />

                            {editingLabel === attrName ? (
                                // Режим редактирования
                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                                    <Input
                                        size="small"
                                        value={tempLabelValue}
                                        onChange={(e) => setTempLabelValue(e.target.value)}
                                        placeholder={attrName}
                                        style={{ flex: 1, fontSize: 11 }}
                                        onPressEnter={() => {
                                            saveLabel(attrName, tempLabelValue);
                                            setEditingLabel(null);
                                        }}
                                        autoFocus
                                    />
                                    <Button
                                        size="small"
                                        type="primary"
                                        onClick={() => {
                                            saveLabel(attrName, tempLabelValue);
                                            setEditingLabel(null);
                                        }}
                                    >
                                        ✓
                                    </Button>
                                    <Button
                                        size="small"
                                        onClick={() => setEditingLabel(null)}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            ) : (
                                // Режим просмотра
                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                                            {attrName}
                                        </span>
                                        {customLabels[attrName] && (
                                            <span style={{ fontSize: 10, color: "#1890ff" }}>
                                                → {customLabels[attrName]}
                                            </span>
                                        )}
                                    </div>
                                    <Tooltip title="Изменить отображаемое имя">
                                        <EditOutlined
                                            style={{ cursor: "pointer", color: "#999", fontSize: 12 }}
                                            onClick={() => {
                                                setEditingLabel(attrName);
                                                setTempLabelValue(customLabels[attrName] || "");
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

export default SelectInfoPanel;
