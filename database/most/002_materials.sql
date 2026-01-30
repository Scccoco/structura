-- Materials table for storing data from Excel (З_900_10_Материалы_Все)
-- Each row is linked to a BIM element GUID for integration with Speckle

CREATE TABLE IF NOT EXISTS public.materials (
    id SERIAL PRIMARY KEY,
    guid TEXT NOT NULL,                    -- связь с elements.guid / applicationId
    name TEXT,                             -- Имя элемента
    position TEXT,                         -- Позиция (ПП-5.1, Б1.1)
    floor TEXT,                            -- Этаж
    base_volume_model NUMERIC,             -- БазовыйОбъемМодель (м³)
    estimate_number TEXT,                  -- НомерСметы
    section TEXT,                          -- Раздел сметы
    estimate_construction TEXT,            -- КонструкцияСметы (ключ агрегации)
    construction_1c TEXT,                  -- Конструкция1С
    source TEXT NOT NULL,                  -- 'РД', 'Смета', '1С'
    material_name TEXT,                    -- Наименование материала
    material_type TEXT,                    -- 'Бетон', 'арматура'
    quantity NUMERIC,                      -- Количество
    unit TEXT,                             -- ЕдИзм ('м3', 'кг')
    document TEXT,                         -- Документ-источник
    created_at TIMESTAMPTZ DEFAULT NOW(),
    project_id INTEGER REFERENCES public.projects(id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_materials_guid ON public.materials(guid);
CREATE INDEX IF NOT EXISTS idx_materials_source ON public.materials(source);
CREATE INDEX IF NOT EXISTS idx_materials_construction ON public.materials(estimate_construction);
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(material_type);
CREATE INDEX IF NOT EXISTS idx_materials_project ON public.materials(project_id);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Policy for reading
DROP POLICY IF EXISTS "materials_read" ON public.materials;
CREATE POLICY "materials_read" ON public.materials FOR SELECT USING (true);

-- Policy for writing
DROP POLICY IF EXISTS "materials_write" ON public.materials;
CREATE POLICY "materials_write" ON public.materials FOR INSERT WITH CHECK (true);
CREATE POLICY "materials_update" ON public.materials FOR UPDATE USING (true);
CREATE POLICY "materials_delete" ON public.materials FOR DELETE USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO web_anon;
GRANT USAGE, SELECT ON SEQUENCE public.materials_id_seq TO web_anon;

-- Comments
COMMENT ON TABLE public.materials IS 'Materials data from Excel (З_900_10_Материалы_Все) - РД, Смета, 1С sources';
COMMENT ON COLUMN public.materials.guid IS 'Link to elements.guid / Speckle applicationId';
COMMENT ON COLUMN public.materials.estimate_construction IS 'КонструкцияСметы - main aggregation key for dashboard';
COMMENT ON COLUMN public.materials.source IS 'Data source: РД, Смета, or 1С';
