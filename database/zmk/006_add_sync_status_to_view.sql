-- Migration 006: Add sync_status to v_program view
-- Это позволит фильтровать удалённые сборки через API
-- Выполнить на production сервере

DROP VIEW IF EXISTS zmk.v_program;
CREATE VIEW zmk.v_program AS
SELECT
    a.id,
    a.project_id,
    p.name AS project_name,
    a.main_part_guid,
    a.assembly_guid,
    a.mark,
    a.axes,
    a.name,
    a.weight_model_t,
    a.weight_weld_t,
    a.weight_total_t,
    a.work_status,
    a.sync_status,  -- ДОБАВЛЕНО: для фильтрации удалённых сборок
    a.speckle_stream_id,
    a.speckle_commit_id,
    a.speckle_object_id,
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
GRANT SELECT ON zmk.v_program TO zmk_anon, zmk_viewer, zmk_user, zmk_bim, zmk_manager;

SELECT 'v_program view updated with sync_status column!' AS status;
