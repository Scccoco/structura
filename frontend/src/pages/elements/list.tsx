import { List, useTable, EditButton } from "@refinedev/antd";
import { Table, Tag, Space } from "antd";

export const ElementList = () => {
    const { tableProps } = useTable({
        resource: "elements",
        sorters: {
            initial: [{ field: "created_at", order: "desc" }]
        }
    });

    const statusColors: Record<string, string> = {
        not_started: "red",
        in_progress: "orange",
        completed: "green"
    };

    const statusLabels: Record<string, string> = {
        not_started: "Не начато",
        in_progress: "В работе",
        completed: "Завершено"
    };

    return (
        <List>
            <Table {...tableProps} rowKey="guid">
                <Table.Column
                    dataIndex="guid"
                    title="GUID"
                    width={250}
                />
                <Table.Column
                    dataIndex="element_type"
                    title="Тип элемента"
                />
                <Table.Column
                    dataIndex="element_name"
                    title="Название"
                />
                <Table.Column
                    dataIndex="status"
                    title="Статус"
                    render={(value: string) => (
                        <Tag color={statusColors[value]}>
                            {statusLabels[value]}
                        </Tag>
                    )}
                />
                <Table.Column
                    dataIndex="created_at"
                    title="Создан"
                    render={(value) => new Date(value).toLocaleString('ru-RU')}
                />
                <Table.Column
                    title="Действия"
                    render={(_, record: any) => (
                        <Space>
                            <EditButton hideText size="small" recordItemId={record.guid} />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
