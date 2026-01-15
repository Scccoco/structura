import React, { useRef } from "react";
import { Radio, Checkbox, Select, Slider, Button, Space } from "antd";

interface MeasurementsPanelProps {
    visible: boolean;
    onClose: () => void;
    measurementType: "pointToPoint" | "perpendicular" | "area" | "point";
    onTypeChange: (type: "pointToPoint" | "perpendicular" | "area" | "point") => void;
    snapToVertices: boolean;
    onSnapChange: (snap: boolean) => void;
    chainMeasurements: boolean;
    onChainChange: (chain: boolean) => void;
    units: string;
    onUnitsChange: (units: string) => void;
    precision: number;
    onPrecisionChange: (precision: number) => void;
    onClearAll: () => void;
}

export const MeasurementsPanel = ({
    visible,
    onClose,
    measurementType,
    onTypeChange,
    snapToVertices,
    onSnapChange,
    chainMeasurements,
    onChainChange,
    units,
    onUnitsChange,
    precision,
    onPrecisionChange,
    onClearAll,
}: MeasurementsPanelProps) => {
    if (!visible) return null;

    // Локальный ref для getPopupContainer (надёжнее forwarded ref - ChatGPT fix)
    const panelDivRef = useRef<HTMLDivElement>(null);
    const getContainer = () => panelDivRef.current ?? document.body;

    // Pointer events вместо mouse (для touchscreen/pen - ChatGPT fix)
    const stopPointerPropagation = (e: React.PointerEvent) => {
        e.stopPropagation();
    };

    return (
        <div
            ref={panelDivRef}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            style={{
                position: "absolute",
                top: 100,
                left: 16,
                zIndex: 10000,
                background: "white",
                borderRadius: 8,
                padding: 16,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                width: 300,
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h4 style={{ margin: 0 }}>Режим Измерений</h4>
                <button
                    onClick={onClose}
                    style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        fontSize: 20,
                    }}
                >
                    ×
                </button>
            </div>

            {/* Measurement Type */}
            <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 500, marginBottom: 8 }}>Тип Измерения</p>
                <Radio.Group value={measurementType} onChange={(e) => onTypeChange(e.target.value)}>
                    <Space direction="vertical">
                        <Radio value="pointToPoint">
                            <span>📐 Между точками</span>
                            <div style={{ fontSize: 12, color: "#888", marginLeft: 24 }}>
                                Измерение между двумя точками
                            </div>
                        </Radio>

                        <Radio value="perpendicular">
                            <span>⊥ Перпендикуляр</span>
                            <div style={{ fontSize: 12, color: "#888", marginLeft: 24 }}>
                                Измерение под 90° углом
                            </div>
                        </Radio>

                        <Radio value="area">
                            <span>▢ Площадь</span>
                            <div style={{ fontSize: 12, color: "#888", marginLeft: 24 }}>
                                Площадь между точками
                            </div>
                        </Radio>

                        <Radio value="point">
                            <span>📍 Координаты точки</span>
                            <div style={{ fontSize: 12, color: "#888", marginLeft: 24 }}>
                                Координаты XYZ точки
                            </div>
                        </Radio>
                    </Space>
                </Radio.Group>
            </div>

            {/* Options */}
            <div style={{ marginBottom: 16 }}>
                <Checkbox checked={snapToVertices} onChange={(e) => onSnapChange(e.target.checked)}>
                    Привязка к вершинам
                </Checkbox>
            </div>

            <div style={{ marginBottom: 16 }}>
                <Checkbox checked={chainMeasurements} onChange={(e) => onChainChange(e.target.checked)}>
                    Цепные измерения
                </Checkbox>
            </div>

            {/* Units */}
            <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 500, marginBottom: 8 }}>Единицы</p>
                <Select
                    value={units}
                    onChange={onUnitsChange}
                    getPopupContainer={getContainer}
                    style={{ width: "100%" }}
                >
                    <Select.Option value="m">Метры (m)</Select.Option>
                    <Select.Option value="mm">Миллиметры (mm)</Select.Option>
                    <Select.Option value="cm">Сантиметры (cm)</Select.Option>
                    <Select.Option value="ft">Футы (ft)</Select.Option>
                    <Select.Option value="in">Дюймы (in)</Select.Option>
                </Select>
            </div>

            {/* Precision */}
            <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 500, marginBottom: 8 }}>
                    Точность: {precision}
                </p>
                <div
                    onPointerDown={stopPointerPropagation}
                    onPointerMove={stopPointerPropagation}
                    onPointerUp={stopPointerPropagation}
                >
                    <Slider
                        min={0}
                        max={6}
                        value={precision}
                        onChange={onPrecisionChange}
                    />
                </div>
            </div>

            {/* Delete All */}
            <Button danger onClick={onClearAll} block>
                Удалить все измерения
            </Button>
        </div>
    );
};
