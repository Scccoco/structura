import { Refine } from "@refinedev/core";
import { RefineThemes, ThemedLayoutV2, notificationProvider } from "@refinedev/antd";
import routerProvider from "@refinedev/react-router-v6";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";

import "@refinedev/antd/dist/reset.css";

import { ElementList } from "./pages/elements/list";
import { ElementEdit } from "./pages/elements/edit";
import { DashboardPage } from "./pages/dashboard";
import { ViewerPage } from "./pages/viewer";

const API_URL = "http://localhost:3002";

// Кастомный data provider для работы с GUID и PostgREST
const customDataProvider = {
    getList: async ({ resource, pagination, sorters, filters }: any) => {
        const url = new URL(`${API_URL}/${resource}`);

        // Pagination
        const { current = 1, pageSize = 10 } = pagination ?? {};
        const offset = (current - 1) * pageSize;
        url.searchParams.append("limit", String(pageSize));
        url.searchParams.append("offset", String(offset));

        // Sorting
        if (sorters && sorters.length > 0) {
            const sort = sorters.map((item: any) =>
                `${item.field}.${item.order === "asc" ? "asc" : "desc"}`
            ).join(",");
            url.searchParams.append("order", sort);
        }

        const response = await fetch(url.toString());
        const data = await response.json();

        // Get total count from Content-Range header
        const total = parseInt(response.headers.get("content-range")?.split("/")[1] || String(data.length));

        return { data, total };
    },

    getOne: async ({ resource, id }: any) => {
        const url = `${API_URL}/${resource}?guid=eq.${id}`;
        const response = await fetch(url);
        const data = await response.json();
        return { data: data[0] };
    },

    create: async ({ resource, variables }: any) => {
        const response = await fetch(`${API_URL}/${resource}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Prefer": "return=representation" },
            body: JSON.stringify(variables)
        });
        const data = await response.json();
        return { data: data[0] };
    },

    update: async ({ resource, id, variables }: any) => {
        const url = `${API_URL}/${resource}?guid=eq.${id}`;
        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Prefer": "return=representation" },
            body: JSON.stringify(variables)
        });
        const data = await response.json();
        return { data: data[0] };
    },

    deleteOne: async ({ resource, id }: any) => {
        const url = `${API_URL}/${resource}?guid=eq.${id}`;
        const response = await fetch(url, {
            method: "DELETE",
            headers: { "Prefer": "return=representation" }
        });
        const data = await response.json();
        return { data: data[0] };
    },

    getApiUrl: () => API_URL,
};

function App() {
    return (
        <BrowserRouter>
            <ConfigProvider
                locale={ruRU}
                theme={RefineThemes.Blue}
            >
                <AntdApp>
                    <Refine
                        dataProvider={customDataProvider}
                        routerProvider={routerProvider}
                        notificationProvider={notificationProvider}
                        resources={[
                            {
                                name: "elements",
                                list: "/elements",
                                edit: "/elements/:id",
                                meta: {
                                    label: "Элементы модели"
                                }
                            },
                            {
                                name: "viewer",
                                list: "/viewer",
                                meta: {
                                    label: "3D Модель"
                                }
                            }
                        ]}
                        options={{
                            syncWithLocation: true,
                            warnWhenUnsavedChanges: true,
                        }}
                    >
                        <ThemedLayoutV2>
                            <Routes>
                                <Route index element={<DashboardPage />} />
                                <Route path="/elements">
                                    <Route index element={<ElementList />} />
                                    <Route path=":id" element={<ElementEdit />} />
                                </Route>
                                <Route path="/viewer" element={<ViewerPage />} />
                            </Routes>
                        </ThemedLayoutV2>
                    </Refine>
                </AntdApp>
            </ConfigProvider>
        </BrowserRouter>
    );
}

export default App;
