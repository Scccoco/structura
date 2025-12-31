import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const ElementEdit = () => {
    const { formProps, saveButtonProps, queryResult } = useForm({
        meta: {
            idField: "guid"
        }
    });

    return (
        <Edit saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="GUID">
                    <span>{queryResult?.data?.data.guid}</span>
                </Form.Item>

                <Form.Item label="Тип элемента">
                    <span>{queryResult?.data?.data.element_type}</span>
                </Form.Item>

                <Form.Item label="Название">
                    <span>{queryResult?.data?.data.element_name}</span>
                </Form.Item>

                <Form.Item
                    label="Статус"
                    name="status"
                    rules={[{ required: true, message: "Выберите статус" }]}
                >
                    <Select>
                        <Select.Option value="not_started">Не начато</Select.Option>
                        <Select.Option value="in_progress">В работе</Select.Option>
                        <Select.Option value="completed">Завершено</Select.Option>
                    </Select>
                </Form.Item>
            </Form>
        </Edit>
    );
};
