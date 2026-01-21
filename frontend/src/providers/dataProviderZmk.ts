/**
 * Data Provider для модуля ЗМК
 * Работает только со схемой zmk через /api-zmk endpoint
 */

const ZMK_API_URL = import.meta.env.VITE_ZMK_API_URL || "/api-zmk";

function parseTotalFromContentRange(contentRange: string | null, fallback: number) {
    if (!contentRange) return fallback;
    const parts = contentRange.split("/");
    if (parts.length !== 2) return fallback;
    const totalStr = parts[1];
    const total = Number(totalStr);
    return Number.isFinite(total) ? total : fallback;
}

export const dataProviderZmk = {
    getList: async ({ resource, pagination, sorters, filters }: any) => {
        const url = new URL(`${ZMK_API_URL}/${resource}`, window.location.origin);

        const { current = 1, pageSize = 50 } = pagination ?? {};
        const offset = (current - 1) * pageSize;

        url.searchParams.set("limit", String(pageSize));
        url.searchParams.set("offset", String(offset));

        // Sorting
        if (sorters && sorters.length > 0) {
            const sort = sorters
                .map((item: any) => `${item.field}.${item.order === "asc" ? "asc" : "desc"}`)
                .join(",");
            url.searchParams.set("order", sort);
        }

        // Filtering (PostgREST syntax)
        if (filters && filters.length > 0) {
            for (const filter of filters) {
                if (filter.value !== undefined && filter.value !== null && filter.value !== "") {
                    const operator = filter.operator || "eq";
                    const pgOp = operator === "contains" ? "ilike" : operator;
                    const value = operator === "contains" ? `*${filter.value}*` : filter.value;
                    url.searchParams.set(filter.field, `${pgOp}.${value}`);
                }
            }
        }

        const response = await fetch(url.toString(), {
            headers: { Prefer: "count=exact" },
        });

        if (!response.ok) {
            if (response.status === 416) {
                const cr = response.headers.get("content-range");
                const total = parseTotalFromContentRange(cr, 0);
                return { data: [], total };
            }
            const text = await response.text();
            throw new Error(`ZMK getList failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        const total = parseTotalFromContentRange(
            response.headers.get("content-range"),
            Array.isArray(data) ? data.length : 0
        );

        return { data, total };
    },

    getOne: async ({ resource, id }: any) => {
        const url = `${ZMK_API_URL}/${resource}?id=eq.${id}`;
        const response = await fetch(url, {
            headers: { Prefer: "count=exact" },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`ZMK getOne failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return { data: data[0] };
    },

    create: async ({ resource, variables }: any) => {
        const response = await fetch(`${ZMK_API_URL}/${resource}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Prefer: "return=representation",
            },
            body: JSON.stringify(variables),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`ZMK create failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return { data: data[0] };
    },

    update: async ({ resource, id, variables }: any) => {
        const url = `${ZMK_API_URL}/${resource}?id=eq.${id}`;
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
            throw new Error(`ZMK update failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return { data: data[0] };
    },

    deleteOne: async ({ resource, id }: any) => {
        const url = `${ZMK_API_URL}/${resource}?id=eq.${id}`;
        const response = await fetch(url, {
            method: "DELETE",
            headers: { Prefer: "return=representation" },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`ZMK deleteOne failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return { data: data[0] };
    },

    // Custom: Upsert stage value
    upsertStageValue: async (params: {
        assembly_id: number;
        stage_code: string;
        value_text?: string;
        value_date?: string;
        updated_by?: string;
    }) => {
        const response = await fetch(`${ZMK_API_URL}/rpc/upsert_stage_value`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Prefer: "return=representation",
            },
            body: JSON.stringify({
                p_assembly_id: params.assembly_id,
                p_stage_code: params.stage_code,
                p_value_text: params.value_text || null,
                p_value_date: params.value_date || null,
                p_updated_by: params.updated_by || "web",
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`ZMK upsertStageValue failed: ${response.status} ${text}`);
        }

        return await response.json();
    },

    getApiUrl: () => ZMK_API_URL,
};

export default dataProviderZmk;
