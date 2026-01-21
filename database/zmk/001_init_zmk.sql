-- ============================================
-- ZMK Module Database Schema
-- Завод металлоконструкций
-- PostgreSQL 15+
-- ============================================

-- 1. Создание схемы
-- ============================================
CREATE SCHEMA IF NOT EXISTS zmk;

-- 2. Роли для PostgREST
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'zmk_anon') THEN
    CREATE ROLE zmk_anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'zmk_user') THEN
    CREATE ROLE zmk_user NOLOGIN;
  END IF;
END
$$;

-- 3. Таблица сборок
-- ============================================
CREATE TABLE IF NOT EXISTS zmk.assemblies (
    id SERIAL PRIMARY KEY,
    main_part_guid VARCHAR(100) UNIQUE,
    assembly_guid VARCHAR(100),
    dwg_no VARCHAR(100),
    mark VARCHAR(100),
    axes VARCHAR(100),
    name VARCHAR(500),
    weight_model_t DECIMAL(10,3),
    weight_weld_t DECIMAL(10,3),
    weight_total_t DECIMAL(10,3),
    speckle_stream_id VARCHAR(100),
    speckle_commit_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assemblies_main_part_guid ON zmk.assemblies(main_part_guid);
CREATE INDEX IF NOT EXISTS idx_assemblies_assembly_guid ON zmk.assemblies(assembly_guid);
CREATE INDEX IF NOT EXISTS idx_assemblies_dwg_no ON zmk.assemblies(dwg_no);

COMMENT ON TABLE zmk.assemblies IS 'Сборки ЗМК с GUID из Tekla/Speckle';

-- 4. Справочник этапов
-- ============================================
CREATE TABLE IF NOT EXISTS zmk.stage_definitions (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('text', 'date')),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE zmk.stage_definitions IS 'Справочник этапов производства';

-- Заполнение справочника этапов
INSERT INTO zmk.stage_definitions (code, name, data_type, sort_order) VALUES
    ('kmd_dev', 'Разработка КМД', 'text', 10),
    ('kmd_date', 'КМД', 'date', 11),
    ('ship_plan', 'Дата отгрузки (план)', 'date', 20),
    ('ship_fact', 'Дата отгрузки (факт)', 'date', 21),
    ('ship_wg', 'Дата отгрузки (WG)', 'text', 22),
    ('manufacture_date', 'Изготовление', 'date', 30),
    ('mount_fact', 'Дата монтажа (факт)', 'date', 40),
    ('tekla_status', 'Статус Tekla', 'text', 50),
    ('ogk_status', 'Статус ОГК', 'text', 60),
    ('notice_6', 'Извещение 6', 'text', 61),
    -- ПДО этапы
    ('rascexovka', 'Расцеховка', 'date', 70),
    ('prod_start', 'Запуск в произ-во', 'date', 71),
    ('assembly_weld', 'Сборка сварка', 'date', 72),
    ('akz', 'АКЗ', 'date', 73),
    ('sgp', 'СГП', 'date', 74),
    ('rework', 'Доработка', 'date', 75),
    ('sgp2', 'СГП2', 'date', 76)
ON CONFLICT (code) DO NOTHING;

-- 5. Значения этапов
-- ============================================
CREATE TABLE IF NOT EXISTS zmk.stage_values (
    id SERIAL PRIMARY KEY,
    assembly_id INT NOT NULL REFERENCES zmk.assemblies(id) ON DELETE CASCADE,
    stage_code VARCHAR(50) NOT NULL REFERENCES zmk.stage_definitions(code),
    value_text VARCHAR(500),
    value_date DATE,
    updated_by VARCHAR(100) DEFAULT 'manual',
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (assembly_id, stage_code)
);

CREATE INDEX IF NOT EXISTS idx_stage_values_assembly_id ON zmk.stage_values(assembly_id);

COMMENT ON TABLE zmk.stage_values IS 'Значения этапов для сборок';

-- 6. Файлы
-- ============================================
CREATE TABLE IF NOT EXISTS zmk.files (
    id SERIAL PRIMARY KEY,
    url VARCHAR(1000) NOT NULL,
    filename VARCHAR(500),
    kind VARCHAR(50) CHECK (kind IN ('ogk_act', 'shipment_doc', 'notice', 'photo', 'other')),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'manual'
);

CREATE TABLE IF NOT EXISTS zmk.assembly_files (
    id SERIAL PRIMARY KEY,
    assembly_id INT NOT NULL REFERENCES zmk.assemblies(id) ON DELETE CASCADE,
    file_id INT NOT NULL REFERENCES zmk.files(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (assembly_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_assembly_files_assembly_id ON zmk.assembly_files(assembly_id);

-- 7. Аудит
-- ============================================
CREATE TABLE IF NOT EXISTS zmk.audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(20) NOT NULL,
    entity_id VARCHAR(200),
    payload JSONB,
    actor VARCHAR(100) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON zmk.audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON zmk.audit_log(created_at DESC);

-- 8. Триггер аудита для stage_values
-- ============================================
CREATE OR REPLACE FUNCTION zmk.fn_audit_stage_values()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO zmk.audit_log (action, entity_id, payload, actor)
    VALUES (
        TG_OP,
        NEW.assembly_id || ':' || NEW.stage_code,
        jsonb_build_object(
            'assembly_id', NEW.assembly_id,
            'stage_code', NEW.stage_code,
            'value_text', NEW.value_text,
            'value_date', NEW.value_date
        ),
        COALESCE(NEW.updated_by, 'system')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_stage_values ON zmk.stage_values;
CREATE TRIGGER trg_audit_stage_values
    AFTER INSERT OR UPDATE ON zmk.stage_values
    FOR EACH ROW EXECUTE FUNCTION zmk.fn_audit_stage_values();

-- 9. Триггер updated_at
-- ============================================
CREATE OR REPLACE FUNCTION zmk.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assemblies_updated_at ON zmk.assemblies;
CREATE TRIGGER trg_assemblies_updated_at
    BEFORE UPDATE ON zmk.assemblies
    FOR EACH ROW EXECUTE FUNCTION zmk.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_stage_values_updated_at ON zmk.stage_values;
CREATE TRIGGER trg_stage_values_updated_at
    BEFORE UPDATE ON zmk.stage_values
    FOR EACH ROW EXECUTE FUNCTION zmk.fn_update_timestamp();

-- 10. Витрина v_program
-- ============================================
CREATE OR REPLACE VIEW zmk.v_program AS
SELECT
    a.id,
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
LEFT JOIN zmk.stage_values sv ON sv.assembly_id = a.id
GROUP BY a.id;

COMMENT ON VIEW zmk.v_program IS 'Витрина производственной программы ЗМК';

-- 11. RPC для upsert этапов
-- ============================================
CREATE OR REPLACE FUNCTION zmk.upsert_stage_value(
    p_assembly_id INT,
    p_stage_code VARCHAR(50),
    p_value_text VARCHAR(500) DEFAULT NULL,
    p_value_date DATE DEFAULT NULL,
    p_updated_by VARCHAR(100) DEFAULT 'manual'
) RETURNS zmk.stage_values AS $$
DECLARE
    result zmk.stage_values;
BEGIN
    INSERT INTO zmk.stage_values (assembly_id, stage_code, value_text, value_date, updated_by)
    VALUES (p_assembly_id, p_stage_code, p_value_text, p_value_date, p_updated_by)
    ON CONFLICT (assembly_id, stage_code) DO UPDATE SET
        value_text = COALESCE(EXCLUDED.value_text, zmk.stage_values.value_text),
        value_date = COALESCE(EXCLUDED.value_date, zmk.stage_values.value_date),
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    RETURNING * INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 12. Права доступа
-- ============================================
GRANT USAGE ON SCHEMA zmk TO zmk_anon, zmk_user;

-- Чтение для всех
GRANT SELECT ON ALL TABLES IN SCHEMA zmk TO zmk_anon;
GRANT SELECT ON ALL TABLES IN SCHEMA zmk TO zmk_user;

-- Запись только для zmk_user
GRANT INSERT, UPDATE, DELETE ON zmk.assemblies TO zmk_user;
GRANT INSERT, UPDATE, DELETE ON zmk.stage_values TO zmk_user;
GRANT INSERT, UPDATE, DELETE ON zmk.files TO zmk_user;
GRANT INSERT, UPDATE, DELETE ON zmk.assembly_files TO zmk_user;
GRANT INSERT ON zmk.audit_log TO zmk_user;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA zmk TO zmk_user;

-- RPC
GRANT EXECUTE ON FUNCTION zmk.upsert_stage_value TO zmk_user;

-- Auto-grant для новых объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA zmk GRANT SELECT ON TABLES TO zmk_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA zmk GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zmk_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA zmk GRANT USAGE, SELECT ON SEQUENCES TO zmk_user;

-- 13. Тестовые данные
-- ============================================
INSERT INTO zmk.assemblies (main_part_guid, assembly_guid, dwg_no, mark, axes, name, weight_model_t, weight_weld_t, weight_total_t)
VALUES
    ('test-main-001', 'test-asm-001', 'КМ-001', 'БМ-1', 'А-Б/1-2', 'Балка монтажная', 1.250, 0.050, 1.300),
    ('test-main-002', 'test-asm-002', 'КМ-001', 'БМ-2', 'Б-В/2-3', 'Балка монтажная', 1.180, 0.045, 1.225),
    ('test-main-003', 'test-asm-003', 'КМ-002', 'К-1', 'А/1', 'Колонна', 2.500, 0.100, 2.600)
ON CONFLICT (main_part_guid) DO NOTHING;

-- Тестовые этапы
INSERT INTO zmk.stage_values (assembly_id, stage_code, value_text, value_date, updated_by)
SELECT a.id, 'tekla_status', 'Approved', NULL, 'init'
FROM zmk.assemblies a WHERE a.main_part_guid = 'test-main-001'
ON CONFLICT DO NOTHING;

INSERT INTO zmk.stage_values (assembly_id, stage_code, value_text, value_date, updated_by)
SELECT a.id, 'kmd_date', NULL, '2026-01-15', 'init'
FROM zmk.assemblies a WHERE a.main_part_guid = 'test-main-001'
ON CONFLICT DO NOTHING;

-- Готово!
SELECT 'ZMK schema created successfully!' AS status;
