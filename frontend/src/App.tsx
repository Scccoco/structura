import { Refine } from "@refinedev/core";
import { RefineThemes, ThemedLayoutV2, notificationProvider } from "@refinedev/antd";
import routerProvider from "@refinedev/react-router-v6";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";

import "@refinedev/antd/dist/reset.css";

import { ElementList } from "./pages/elements/list";
import { ElementEdit } from "./pages/elements/edit";
import { DashboardPage } from "./pages/dashboard";
import { LandingPage } from "./pages/landing";
import { ProjectList } from "./pages/projects/list";
import { ProjectViewer } from "./pages/projects/ProjectViewer";

// Demo pages
import { DemoIndex } from "./pages/demo";
import { AuthorDashboard } from "./pages/demo/author/Dashboard";
import { CreateEvent } from "./pages/demo/author/CreateEvent";
import { ValidatorDashboard } from "./pages/demo/validator/Dashboard";
import { EventCard } from "./pages/demo/validator/EventCard";
import { BimLinking } from "./pages/demo/validator/BimLinking";
import { ManagerDashboard } from "./pages/demo/manager/Dashboard";

// ZMK pages (isolated module)
import { ZmkProgram, ZmkAssemblyCard, ZmkAudit, ZmkProjects } from "./pages/zmk";

// Auth pages
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

function parseTotalFromContentRange(contentRange: string | null, fallback: number) {
    if (!contentRange) return fallback;
    // format: 0-9/1234  or */1234
    const parts = contentRange.split("/");
    if (parts.length !== 2) return fallback;
    const totalStr = parts[1];
    const total = Number(totalStr);
    return Number.isFinite(total) ? total : fallback;
}

// Кастомный data provider для PostgREST
const customDataProvider = {
    getList: async ({ resource, pagination, sorters }: any) => {
        const url = new URL(`${API_URL}/${resource}`);

        const { current = 1, pageSize = 10 } = pagination ?? {};
        const offset = (current - 1) * pageSize;

        // PostgREST pagination
        url.searchParams.set("limit", String(pageSize));
        url.searchParams.set("offset", String(offset));

        // Sorting
        if (sorters && sorters.length > 0) {
            const sort = sorters
                .map((item: any) => `${item.field}.${item.order === "asc" ? "asc" : "desc"}`)
                .join(",");
            url.searchParams.set("order", sort);
        }

        const response = await fetch(url.toString(), {
            headers: {
                // Ключевой момент: просим посчитать total
                Prefer: "count=exact",
            },
        });

        if (!response.ok) {
            // Если мы запросили страницу, которой больше нет (например, удалили данные)
            if (response.status === 416) {
                // Пытаемся достать реальное количество из заголовка, если есть
                const cr = response.headers.get("content-range");
                const total = parseTotalFromContentRange(cr, 0);
                return { data: [], total };
            }

            const text = await response.text();
            throw new Error(`getList failed: ${response.status} ${text}`);
        }

        const data = await response.json();

        const total = parseTotalFromContentRange(
            response.headers.get("content-range"),
            Array.isArray(data) ? data.length : 0
        );

        return { data, total };
    },

    getOne: async ({ resource, id }: any) => {
        const url = `${API_URL}/${resource}?guid=eq.${id}`;
        const response = await fetch(url, {
            headers: {
                Prefer: "count=exact",
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`getOne failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return { data: data[0] };
    },

    create: async ({ resource, variables }: any) => {
        const response = await fetch(`${API_URL}/${resource}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Prefer: "return=representation",
            },
            body: JSON.stringify(variables),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`create failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return { data: data[0] };
    },

    update: async ({ resource, id, variables }: any) => {
        const url = `${API_URL}/${resource}?guid=eq.${id}`;
        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Prefer: "return=representation",
            },
            body: JSON.stringify(variables),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`update failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return { data: data[0] };
    },

    deleteOne: async ({ resource, id }: any) => {
        const url = `${API_URL}/${resource}?guid=eq.${id}`;
        const response = await fetch(url, {
            method: "DELETE",
            headers: {
                Prefer: "return=representation",
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`deleteOne failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return { data: data[0] };
    },

    getApiUrl: () => API_URL,
};

function App() {
    return (
        <BrowserRouter>
            <ConfigProvider locale={ruRU} theme={RefineThemes.Blue}>
                <AntdApp>
                    <Refine
                        dataProvider={customDataProvider}
                        routerProvider={routerProvider}
                        notificationProvider={notificationProvider}
                        resources={[
                            {
                                name: "projects",
                                list: "/projects",
                                meta: { label: "Проекты" },
                            },
                            {
                                name: "elements",
                                list: "/elements",
                                edit: "/elements/:id",
                                meta: { label: "Элементы модели" },
                            },
                        ]}
                        options={{
                            syncWithLocation: true,
                            warnWhenUnsavedChanges: true,
                        }}
                    >
                        <Routes>
                            <Route path="/" element={<LandingPage />} />

                            {/* Projects Routes - без ThemedLayoutV2 (убрана боковая панель) */}
                            <Route path="/projects" element={<ProjectList />} />
                            <Route path="/projects/:streamId/viewer" element={<ProjectViewer />} />

                            {/* Elements - с ThemedLayoutV2 (стандартный CRUD) */}
                            <Route
                                element={
                                    <ThemedLayoutV2>
                                        <Outlet />
                                    </ThemedLayoutV2>
                                }
                            >
                                <Route path="/dashboard" element={<DashboardPage />} />
                                <Route path="/elements">
                                    <Route index element={<ElementList />} />
                                    <Route path=":id" element={<ElementEdit />} />
                                </Route>
                            </Route>

                            {/* Demo Routes - без ThemedLayoutV2 */}
                            <Route path="/demo" element={<DemoIndex />} />
                            <Route path="/demo/author" element={<AuthorDashboard />} />
                            <Route path="/demo/author/create" element={<CreateEvent />} />
                            <Route path="/demo/validator" element={<ValidatorDashboard />} />
                            <Route path="/demo/validator/event/:eventId" element={<EventCard />} />
                            <Route path="/demo/validator/link/:eventId" element={<BimLinking />} />
                            <Route path="/demo/manager" element={<ManagerDashboard />} />

                            {/* ZMK Routes - изолированный модуль ЗМК */}
                            <Route path="/zmk" element={<ZmkProjects />} />
                            <Route path="/zmk/projects" element={<ZmkProjects />} />
                            <Route path="/zmk/projects/:projectId" element={<ZmkProgram />} />
                            <Route path="/zmk/program" element={<ZmkProgram />} />
                            <Route path="/zmk/assemblies/:id" element={<ZmkAssemblyCard />} />
                            <Route path="/zmk/audit" element={<ZmkAudit />} />

                            {/* Auth Routes */}
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/admin/users" element={<AdminDashboard />} />
                        </Routes>
                    </Refine>
                </AntdApp>
            </ConfigProvider>
        </BrowserRouter>
    );
}

export default App;
