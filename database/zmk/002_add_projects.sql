-- ============================================
-- ZMK Projects Table
-- Подпроекты = модели из Speckle stream
-- ============================================

-- Таблица проектов
CREATE TABLE IF NOT EXISTS zmk.projects (
    id SERIAL PRIMARY KEY,
    speckle_model_id VARCHAR(100) UNIQUE,  -- ID модели в Speckle
    speckle_branch_name VARCHAR(200),       -- Название ветки
    name VARCHAR(500) NOT NULL,             -- Название проекта
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_speckle_model ON zmk.projects(speckle_model_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON zmk.projects(status);

COMMENT ON TABLE zmk.projects IS 'Подпроекты ЗМК (каждая модель = отдельный подпроект)';

-- Добавить project_id в assemblies
ALTER TABLE zmk.assemblies 
ADD COLUMN IF NOT EXISTS project_id INT REFERENCES zmk.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assemblies_project_id ON zmk.assemblies(project_id);

-- Триггер updated_at для projects
DROP TRIGGER IF EXISTS trg_projects_updated_at ON zmk.projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON zmk.projects
    FOR EACH ROW EXECUTE FUNCTION zmk.fn_update_timestamp();

-- Обновить view v_program с project_id
DROP VIEW IF EXISTS zmk.v_program;
CREATE VIEW zmk.v_program AS
SELECT
    a.id,
    a.project_id,
    p.name AS project_name,
    a.main_part_guid,
    a.assembly_guid,
    a.dwg_no,
    a.mark,
    a.axes,
    a.name,
    a.weight_model_t,
    a.weight_weld_t,
    a.weight_total_t,
    a.speckle_stream_id,
    a.speckle_commit_id,
    -- Этапы (дата)
    MAX(CASE WHEN sv.stage_code = 'kmd_date' THEN sv.value_date END) AS kmd_date,
    MAX(CASE WHEN sv.stage_code = 'ship_plan' THEN sv.value_date END) AS ship_plan,
    MAX(CASE WHEN sv.stage_code = 'ship_fact' THEN sv.value_date END) AS ship_fact,
    MAX(CASE WHEN sv.stage_code = 'manufacture_date' THEN sv.value_date END) AS manufacture_date,
    MAX(CASE WHEN sv.stage_code = 'mount_fact' THEN sv.value_date END) AS mount_fact,
    -- ПДО этапы
    MAX(CASE WHEN sv.stage_code = 'rascexovka' THEN sv.value_date END) AS rascexovka,
    MAX(CASE WHEN sv.stage_code = 'prod_start' THEN sv.value_date END) AS prod_start,
    MAX(CASE WHEN sv.stage_code = 'assembly_weld' THEN sv.value_date END) AS assembly_weld,
    MAX(CASE WHEN sv.stage_code = 'akz' THEN sv.value_date END) AS akz,
    MAX(CASE WHEN sv.stage_code = 'sgp' THEN sv.value_date END) AS sgp,
    MAX(CASE WHEN sv.stage_code = 'rework' THEN sv.value_date END) AS rework,
    MAX(CASE WHEN sv.stage_code = 'sgp2' THEN sv.value_date END) AS sgp2,
    -- Этапы (текст)
    MAX(CASE WHEN sv.stage_code = 'kmd_dev' THEN sv.value_text END) AS kmd_dev,
    MAX(CASE WHEN sv.stage_code = 'ship_wg' THEN sv.value_text END) AS ship_wg,
    MAX(CASE WHEN sv.stage_code = 'tekla_status' THEN sv.value_text END) AS tekla_status,
    MAX(CASE WHEN sv.stage_code = 'ogk_status' THEN sv.value_text END) AS ogk_status,
    MAX(CASE WHEN sv.stage_code = 'notice_6' THEN sv.value_text END) AS notice_6,
    -- Мета
    a.created_at,
    a.updated_at
FROM zmk.assemblies a
LEFT JOIN zmk.projects p ON p.id = a.project_id
LEFT JOIN zmk.stage_values sv ON sv.assembly_id = a.id
GROUP BY a.id, p.name;

-- Права
GRANT SELECT ON zmk.projects TO zmk_anon, zmk_user;
GRANT INSERT, UPDATE, DELETE ON zmk.projects TO zmk_user;
GRANT USAGE, SELECT ON zmk.projects_id_seq TO zmk_user;

-- Тестовый проект
INSERT INTO zmk.projects (speckle_model_id, name, description)
VALUES ('test-model-001', 'Тестовый проект ЗМК', 'Демонстрационный проект')
ON CONFLICT (speckle_model_id) DO NOTHING;

-- Привязать тестовые сборки к проекту
UPDATE zmk.assemblies SET project_id = (SELECT id FROM zmk.projects LIMIT 1) WHERE project_id IS NULL;

SELECT 'ZMK projects table created!' AS status;
