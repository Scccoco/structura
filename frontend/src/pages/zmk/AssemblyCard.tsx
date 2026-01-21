/**
 * ЗМК - Карточка сборки
 * /zmk/assemblies/:id
 */
import React, { useState, useEffect } from "react";
import {
    Typography, Space, Button, message, Input, DatePicker,
    Spin, Row, Col, Modal, Select, Descriptions, Tag
} from "antd";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    ArrowLeftOutlined, HomeOutlined,
    PlusOutlined, FileOutlined, BuildOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { dataProviderZmk } from "../../providers/dataProviderZmk";
import "./zmk.css";

const { Title, Text } = Typography;

interface StageDefinition {
    code: string;
    name: string;
    data_type: "text" | "date";
    sort_order: number;
}

interface StageValue {
    stage_code: string;
    value_text: string | null;
    value_date: string | null;
}

interface FileLink {
    id: number;
    url: string;
    filename: string;
    kind: string;
}

export const ZmkAssemblyCard: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [assembly, setAssembly] = useState<any>(null);
    const [stages, setStages] = useState<StageDefinition[]>([]);
    const [stageValues, setStageValues] = useState<StageValue[]>([]);
    const [files, setFiles] = useState<FileLink[]>([]);
    const [addFileModal, setAddFileModal] = useState(false);
    const [newFile, setNewFile] = useState({ url: "", kind: "other" });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Get assembly
                const asmResult = await dataProviderZmk.getOne({ resource: "assemblies", id });
                setAssembly(asmResult.data);

                // Get stage definitions
                const stagesResult = await dataProviderZmk.getList({
                    resource: "stage_definitions",
                    pagination: { current: 1, pageSize: 100 },
                    sorters: [{ field: "sort_order", order: "asc" }],
                });
                setStages(stagesResult.data);

                // Get stage values
                const valuesResult = await dataProviderZmk.getList({
                    resource: "stage_values",
                    pagination: { current: 1, pageSize: 100 },
                    filters: [{ field: "assembly_id", operator: "eq", value: id }],
                });
                setStageValues(valuesResult.data);

                // Get files (note: result used for future join with files table)
                await dataProviderZmk.getList({
                    resource: "assembly_files",
                    pagination: { current: 1, pageSize: 100 },
                    filters: [{ field: "assembly_id", operator: "eq", value: id }],
                });
                // TODO: join with files table
                setFiles([]);

            } catch (error) {
                console.error("Fetch error:", error);
                message.error("Ошибка загрузки");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    // Get stage value
    const getStageValue = (code: string) => {
        const sv = stageValues.find(v => v.stage_code === code);
        return sv;
    };

    // Save stage value
    const handleStageChange = async (code: string, value: string | null, isDate: boolean) => {
        try {
            await dataProviderZmk.upsertStageValue({
                assembly_id: Number(id),
                stage_code: code,
                value_date: isDate ? value || undefined : undefined,
                value_text: !isDate ? value || undefined : undefined,
                updated_by: "web",
            });
            message.success("Сохранено");
            // Update local state
            setStageValues(prev => {
                const exists = prev.find(v => v.stage_code === code);
                if (exists) {
                    return prev.map(v => v.stage_code === code
                        ? { ...v, value_date: isDate ? value : v.value_date, value_text: !isDate ? value : v.value_text }
                        : v
                    );
                } else {
                    return [...prev, {
                        stage_code: code,
                        value_date: isDate ? value : null,
                        value_text: !isDate ? value : null
                    }];
                }
            });
        } catch (error) {
            console.error("Save error:", error);
            message.error("Ошибка сохранения");
        }
    };

    // Add file
    const handleAddFile = async () => {
        if (!newFile.url) {
            message.warning("Укажите ссылку");
            return;
        }
        try {
            // Create file record
            const fileResult = await dataProviderZmk.create({
                resource: "files",
                variables: {
                    url: newFile.url,
                    filename: newFile.url.split("/").pop() || "file",
                    kind: newFile.kind,
                },
            });
            // Create link
            await dataProviderZmk.create({
                resource: "assembly_files",
                variables: {
                    assembly_id: Number(id),
                    file_id: fileResult.data.id,
                },
            });
            message.success("Файл добавлен");
            setAddFileModal(false);
            setNewFile({ url: "", kind: "other" });
            // Reload files
        } catch (error) {
            console.error("Add file error:", error);
            message.error("Ошибка");
        }
    };

    if (loading) {
        return (
            <div className="zmk-container" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!assembly) {
        return (
            <div className="zmk-container">
                <Title level={3} style={{ color: "#fff" }}>Сборка не найдена</Title>
                <Button onClick={() => navigate("/zmk/program")}>Назад</Button>
            </div>
        );
    }

    return (
        <div className="zmk-container">
            <div className="zmk-content">
                {/* Breadcrumb */}
                <div className="zmk-breadcrumb">
                    <Link to="/"><HomeOutlined /> Главная</Link>
                    <span> / </span>
                    <Link to="/zmk/program">ЗМК</Link>
                    <span> / </span>
                    <span className="current">{assembly.mark || assembly.dwg_no}</span>
                </div>

                {/* Back */}
                <a
                    className="zmk-back-link"
                    onClick={() => navigate("/zmk/program")}
                    style={{ cursor: "pointer" }}
                >
                    <ArrowLeftOutlined /> К программе
                </a>

                <Row gutter={24}>
                    {/* Left column - Info */}
                    <Col span={16}>
                        {/* Passport */}
                        <div className="zmk-card">
                            <div className="zmk-card-header">
                                <div className="zmk-card-title">
                                    <BuildOutlined /> Паспорт сборки
                                </div>
                                <Tag color="blue">{assembly.dwg_no}</Tag>
                            </div>
                            <div className="zmk-card-body">
                                <Descriptions column={2} size="small" labelStyle={{ color: "rgba(255,255,255,0.5)" }} contentStyle={{ color: "#fff" }}>
                                    <Descriptions.Item label="GUID main">{assembly.main_part_guid || "—"}</Descriptions.Item>
                                    <Descriptions.Item label="GUID assembly">{assembly.assembly_guid || "—"}</Descriptions.Item>
                                    <Descriptions.Item label="DWG">{assembly.dwg_no}</Descriptions.Item>
                                    <Descriptions.Item label="Марка">{assembly.mark}</Descriptions.Item>
                                    <Descriptions.Item label="Оси">{assembly.axes}</Descriptions.Item>
                                    <Descriptions.Item label="Наименование">{assembly.name}</Descriptions.Item>
                                    <Descriptions.Item label="Вес модель (т)">{assembly.weight_model_t?.toFixed(3) || "—"}</Descriptions.Item>
                                    <Descriptions.Item label="Вес наплавка (т)">{assembly.weight_weld_t?.toFixed(3) || "—"}</Descriptions.Item>
                                    <Descriptions.Item label="Вес итого (т)" span={2}>
                                        <span style={{ fontSize: 18, fontWeight: 700, color: "#3b82f6" }}>
                                            {assembly.weight_total_t?.toFixed(3) || "—"}
                                        </span>
                                    </Descriptions.Item>
                                </Descriptions>
                            </div>
                        </div>

                        {/* Stages */}
                        <div className="zmk-card">
                            <div className="zmk-card-header">
                                <div className="zmk-card-title">📋 Этапы производства</div>
                            </div>
                            <div className="zmk-card-body">
                                <div className="zmk-stages-grid">
                                    {stages.map(stage => {
                                        const val = getStageValue(stage.code);
                                        return (
                                            <div key={stage.code} className="zmk-stage-item">
                                                <div className="zmk-stage-label">{stage.name}</div>
                                                {stage.data_type === "date" ? (
                                                    <DatePicker
                                                        size="small"
                                                        value={val?.value_date ? dayjs(val.value_date) : null}
                                                        onChange={(date) => handleStageChange(stage.code, date?.format("YYYY-MM-DD") || null, true)}
                                                        format="DD.MM.YYYY"
                                                        style={{ width: "100%" }}
                                                    />
                                                ) : (
                                                    <Input
                                                        size="small"
                                                        value={val?.value_text || ""}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== (val?.value_text || "")) {
                                                                handleStageChange(stage.code, e.target.value || null, false);
                                                            }
                                                        }}
                                                        placeholder="—"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Files */}
                        <div className="zmk-card">
                            <div className="zmk-card-header">
                                <div className="zmk-card-title">📎 Файлы</div>
                                <Button
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() => setAddFileModal(true)}
                                >
                                    Добавить
                                </Button>
                            </div>
                            <div className="zmk-card-body">
                                {files.length === 0 ? (
                                    <Text style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Нет прикреплённых файлов
                                    </Text>
                                ) : (
                                    <div className="zmk-files-list">
                                        {files.map(f => (
                                            <div key={f.id} className="zmk-file-item">
                                                <Space>
                                                    <FileOutlined />
                                                    <a href={f.url} target="_blank" rel="noopener noreferrer">
                                                        {f.filename}
                                                    </a>
                                                    <Tag>{f.kind}</Tag>
                                                </Space>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Col>

                    {/* Right column - Viewer */}
                    <Col span={8}>
                        <div className="zmk-viewer-container">
                            <div className="zmk-viewer-header">
                                <span style={{ color: "#fff", fontWeight: 600 }}>🏗️ 3D Вид</span>
                            </div>
                            <div
                                style={{
                                    width: "100%",
                                    height: 400,
                                    background: "#0a0a0f",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {!assembly.speckle_stream_id ? (
                                    <Text style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Не задан stream/commit для этой сборки
                                    </Text>
                                ) : (
                                    <Text style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Загрузка модели...
                                    </Text>
                                )}
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Add File Modal */}
                <Modal
                    title="Добавить файл"
                    open={addFileModal}
                    onCancel={() => setAddFileModal(false)}
                    onOk={handleAddFile}
                    okText="Добавить"
                    cancelText="Отмена"
                >
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <div>
                            <Text>Ссылка (Nextcloud / URL):</Text>
                            <Input
                                value={newFile.url}
                                onChange={(e) => setNewFile(f => ({ ...f, url: e.target.value }))}
                                placeholder="https://cloud.example.com/..."
                            />
                        </div>
                        <div>
                            <Text>Тип:</Text>
                            <Select
                                value={newFile.kind}
                                onChange={(v) => setNewFile(f => ({ ...f, kind: v }))}
                                style={{ width: "100%" }}
                                options={[
                                    { value: "ogk_act", label: "Акт ОГК" },
                                    { value: "shipment_doc", label: "Накладная" },
                                    { value: "notice", label: "Извещение" },
                                    { value: "photo", label: "Фото" },
                                    { value: "other", label: "Другое" },
                                ]}
                            />
                        </div>
                    </Space>
                </Modal>
            </div>
        </div>
    );
};

export default ZmkAssemblyCard;
