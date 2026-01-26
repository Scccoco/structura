import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Tag, message } from 'antd';
import {
    SearchOutlined, CheckCircleOutlined,
    ClockCircleOutlined, MinusCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Typography } from 'antd';

const { Text } = Typography;

interface Element {
    guid: string;
    project_id: string;
    position: string;
    name: string;
    material: string;
    level: string;
    volume: number;
    axes: string;
    status: string;
}

const STATUS_OPTIONS = [
    { value: 'Не закрыт', label: 'Не закрыт', color: 'default' },
    { value: 'Закрыт частично', label: 'Закрыт частично', color: 'warning' },
    { value: 'Закрыт полностью', label: 'Закрыт полностью', color: 'success' },
];

interface Props {
    projectId: string;
}

const ElementsContent: React.FC<Props> = ({ projectId }) => {
    const [elements, setElements] = useState<Element[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    useEffect(() => {
        loadElements();
    }, [projectId]);

    const loadElements = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.getElementsByProject(projectId);
                setElements(data);
            }
        } catch (error) {
            message.error('Ошибка загрузки элементов');
        }
        setLoading(false);
    };

    const handleStatusChange = async (guid: string, newStatus: string) => {
        if (window.electronAPI) {
            await window.electronAPI.updateElementStatus(guid, newStatus);
            setElements(prev => prev.map(el =>
                el.guid === guid ? { ...el, status: newStatus } : el
            ));
            message.success('Статус обновлён');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Закрыт полностью': return <CheckCircleOutlined style={{ color: '#22c55e' }} />;
            case 'Закрыт частично': return <ClockCircleOutlined style={{ color: '#f59e0b' }} />;
            default: return <MinusCircleOutlined style={{ color: '#6b7280' }} />;
        }
    };

    const filteredElements = elements.filter(el => {
        const matchesSearch =
            el.name?.toLowerCase().includes(searchText.toLowerCase()) ||
            el.position?.toLowerCase().includes(searchText.toLowerCase());
        const matchesStatus = !statusFilter || el.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const columns: ColumnsType<Element> = [
        { title: 'Позиция', dataIndex: 'position', key: 'position', width: 120 },
        { title: 'Имя', dataIndex: 'name', key: 'name', width: 180, render: (t) => <strong>{t}</strong> },
        { title: 'Материал', dataIndex: 'material', key: 'material', width: 100 },
        { title: 'Этаж', dataIndex: 'level', key: 'level', width: 90 },
        { title: 'Объём', dataIndex: 'volume', key: 'volume', width: 90, render: (v) => v ? `${v.toFixed(2)}` : '—' },
        {
            title: 'Статус',
            dataIndex: 'status',
            key: 'status',
            width: 180,
            render: (status, record) => (
                <Select
                    value={status || 'Не закрыт'}
                    size="small"
                    style={{ width: 160 }}
                    onChange={(val) => handleStatusChange(record.guid, val)}
                >
                    {STATUS_OPTIONS.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>
                            {getStatusIcon(opt.value)} {opt.label}
                        </Select.Option>
                    ))}
                </Select>
            ),
        },
    ];

    const stats = {
        total: elements.length,
        closed: elements.filter(e => e.status === 'Закрыт полностью').length,
        partial: elements.filter(e => e.status === 'Закрыт частично').length,
    };

    return (
        <div className="aid-content">
            {/* Stats */}
            <div className="aid-stats">
                <div className="stat-item">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Всего</span>
                </div>
                <div className="stat-item success">
                    <span className="stat-value">{stats.closed}</span>
                    <span className="stat-label">Закрыто</span>
                </div>
                <div className="stat-item warning">
                    <span className="stat-value">{stats.partial}</span>
                    <span className="stat-label">Частично</span>
                </div>
            </div>

            {/* Filters */}
            <div className="aid-toolbar">
                <Input
                    placeholder="Поиск..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 250 }}
                />
                <Select
                    placeholder="Фильтр по статусу"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    allowClear
                    style={{ width: 180 }}
                >
                    {STATUS_OPTIONS.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>
                            <Tag color={opt.color}>{opt.label}</Tag>
                        </Select.Option>
                    ))}
                </Select>
            </div>

            {/* Table */}
            <div className="aid-table-wrapper">
                <Table
                    columns={columns}
                    dataSource={filteredElements}
                    rowKey="guid"
                    loading={loading}
                    pagination={{ pageSize: 50 }}
                    scroll={{ x: 900 }}
                    size="small"
                />
            </div>
        </div>
    );
};

export default ElementsContent;
