import React, { useState, useEffect } from 'react';
import { Button, Table, Input, message, Tag } from 'antd';
import {
    FolderOpenOutlined, ReloadOutlined, SearchOutlined, FileOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Act {
    id: string;
    number: string;
    file_path: string;
    work_type: string;
    act_date: string;
    start_date: string;
    end_date: string;
    ks: string;
    ks2: string;
}

interface Props {
    projectId: string;
}

const RegistryContent: React.FC<Props> = ({ projectId }) => {
    const [acts, setActs] = useState<Act[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        loadActs();
    }, [projectId]);

    const loadActs = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.getActs();
                setActs(data);
            }
        } catch (error) {
            message.error('Ошибка загрузки актов');
        }
        setLoading(false);
    };

    const handleScanFolder = async () => {
        if (!window.electronAPI) {
            message.warning('Функция доступна только в desktop-приложении');
            return;
        }

        const folderPath = await window.electronAPI.selectDirectory();
        if (!folderPath) return;

        setLoading(true);
        const hideLoading = message.loading('Сканирование папки...', 0);

        try {
            const result = await window.electronAPI.scanPDFFolder(folderPath);
            hideLoading();

            if (result.success) {
                message.success(`Найдено ${result.count} актов!`);
                await loadActs();
            } else {
                message.error('Ошибка при сканировании');
            }
        } catch (error) {
            hideLoading();
            message.error('Ошибка при сканировании папки');
            console.error(error);
        }
        setLoading(false);
    };

    const handleOpenFile = async (filePath: string) => {
        if (window.electronAPI) {
            await window.electronAPI.openPath(filePath);
        }
    };

    const filteredActs = acts.filter(act =>
        act.number?.toLowerCase().includes(searchText.toLowerCase()) ||
        act.work_type?.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns: ColumnsType<Act> = [
        {
            title: '№ Акта',
            dataIndex: 'number',
            key: 'number',
            width: 150,
            render: (text, record) => (
                <a onClick={() => handleOpenFile(record.file_path)}>
                    <FileOutlined /> {text}
                </a>
            ),
        },
        {
            title: 'Тип работ',
            dataIndex: 'work_type',
            key: 'work_type',
            width: 180,
            render: (text) => text ? <Tag color="blue">{text}</Tag> : '—',
        },
        {
            title: 'Дата акта',
            dataIndex: 'act_date',
            key: 'act_date',
            width: 120,
        },
        {
            title: 'Начало',
            dataIndex: 'start_date',
            key: 'start_date',
            width: 110,
        },
        {
            title: 'Окончание',
            dataIndex: 'end_date',
            key: 'end_date',
            width: 110,
        },
        {
            title: 'КС',
            dataIndex: 'ks',
            key: 'ks',
            width: 100,
        },
    ];

    return (
        <div className="aid-content">
            {/* Toolbar */}
            <div className="aid-toolbar">
                <Input
                    placeholder="Поиск по номеру или типу работ..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ width: 300 }}
                />
                <div className="toolbar-actions">
                    <Button
                        type="primary"
                        icon={<FolderOpenOutlined />}
                        onClick={handleScanFolder}
                    >
                        Сканировать папку
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadActs}
                        loading={loading}
                    >
                        Обновить
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="aid-table-wrapper">
                <Table
                    columns={columns}
                    dataSource={filteredActs}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20, showTotal: (t) => `Всего: ${t}` }}
                    scroll={{ x: 900 }}
                    size="middle"
                />
            </div>
        </div>
    );
};

export default RegistryContent;
