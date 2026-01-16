import { Button, Space, Dropdown } from "antd";
import type { MenuProps } from "antd";

interface ViewerToolbarProps {
    onFit: () => void;
    onMeasure: () => void;
    onSection: () => void;
    onCameraView: (view: "top" | "front" | "side" | "iso") => void;

    // Новые панели
    onToggleSceneExplorer: () => void;
    onToggleFiltering: () => void;
    onToggleModels: () => void;

    measureActive: boolean;
    sectionActive: boolean;

    // Состояния новых панелей
    sceneExplorerActive: boolean;
    filteringActive: boolean;
    modelsActive: boolean;
}

export const ViewerToolbar = ({
    onFit,
    onMeasure,
    onSection,
    onCameraView,
    onToggleSceneExplorer,
    onToggleFiltering,
    onToggleModels,
    measureActive,
    sectionActive,
    sceneExplorerActive,
    filteringActive,
    modelsActive,
}: ViewerToolbarProps) => {
    const cameraViewsMenu: MenuProps["items"] = [
        { key: "top", label: "Вид сверху" },
        { key: "front", label: "Вид спереди" },
        { key: "side", label: "Вид сбоку" },
        { key: "iso", label: "Изометрия" },
    ];

    const handleMenuClick: MenuProps["onClick"] = (e) => {
        onCameraView(e.key as "top" | "front" | "side" | "iso");
    };

    return (
        <div
            style={{
                position: "absolute",
                top: 16,
                left: 16,
                zIndex: 1000,
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: 8,
                padding: "8px 12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
        >
            <Space wrap>
                <Button onClick={onFit}>🔍 Вписать</Button>

                <Button
                    type={measureActive ? "primary" : "default"}
                    onClick={onMeasure}
                >
                    📏 Измерения
                </Button>

                <Button
                    type={sectionActive ? "primary" : "default"}
                    onClick={onSection}
                >
                    ✂️ Сечения
                </Button>

                <Dropdown
                    menu={{ items: cameraViewsMenu, onClick: handleMenuClick }}
                    placement="bottomLeft"
                >
                    <Button>📷 Виды ▼</Button>
                </Dropdown>

                {/* Панели Speckle - локализовано */}
                <Button
                    type={sceneExplorerActive ? "primary" : "default"}
                    onClick={onToggleSceneExplorer}
                >
                    🌳 Проводник
                </Button>

                <Button
                    type={filteringActive ? "primary" : "default"}
                    onClick={onToggleFiltering}
                >
                    🧪 Фильтры
                </Button>

                <Button
                    type={modelsActive ? "primary" : "default"}
                    onClick={onToggleModels}
                >
                    🗂 Модели
                </Button>
            </Space>
        </div>
    );
};
