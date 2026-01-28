-- ============================================
-- Structura Most (Мост) Database Schema
-- Схема для элементов модели моста
-- PostgreSQL 15+
-- ============================================

-- 1. Таблица проектов (связь со Speckle Stream)
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
    id SERIAL PRIMARY KEY,
    speckle_stream_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.projects IS 'Проекты Моста, связанные со Speckle Stream';

CREATE INDEX IF NOT EXISTS idx_projects_stream_id ON public.projects(speckle_stream_id);

-- 2. Таблица элементов (синхронизация из Speckle)
-- ============================================
CREATE TABLE IF NOT EXISTS public.elements (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Идентификаторы
    guid VARCHAR(100) UNIQUE NOT NULL,      -- applicationId из Speckle (ключ синхронизации)
    speckle_object_id VARCHAR(100),         -- Speckle hash ID объекта
    
    -- Метаданные элемента
    name VARCHAR(200),
    element_type VARCHAR(100),               -- IFC Class / Tekla Type
    profile VARCHAR(200),
    material VARCHAR(200),
    
    -- Физические характеристики
    weight_kg DECIMAL(10,3),
    volume_m3 DECIMAL(10,5),
    length_m DECIMAL(10,3),
    
    -- Бизнес-данные
    status VARCHAR(50) DEFAULT 'new',        -- new, in_progress, done
    sync_status VARCHAR(20) DEFAULT 'active', -- active, deleted
    
    -- Все остальные свойства
    properties JSONB,
    
    -- Мета
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.elements IS 'Элементы модели, синхронизированные из Speckle';

CREATE INDEX IF NOT EXISTS idx_elements_guid ON public.elements(guid);
CREATE INDEX IF NOT EXISTS idx_elements_project_id ON public.elements(project_id);
CREATE INDEX IF NOT EXISTS idx_elements_status ON public.elements(status);
CREATE INDEX IF NOT EXISTS idx_elements_sync_status ON public.elements(sync_status);
CREATE INDEX IF NOT EXISTS idx_elements_speckle_object_id ON public.elements(speckle_object_id);

-- 3. История изменений статусов (аудит)
-- ============================================
CREATE TABLE IF NOT EXISTS public.element_status_log (
    id SERIAL PRIMARY KEY,
    element_id INT REFERENCES public.elements(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by VARCHAR(100) DEFAULT 'system',
    changed_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.element_status_log IS 'История изменений статусов элементов';

CREATE INDEX IF NOT EXISTS idx_status_log_element_id ON public.element_status_log(element_id);
CREATE INDEX IF NOT EXISTS idx_status_log_changed_at ON public.element_status_log(changed_at DESC);

-- 4. Триггер для updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_elements_updated_at ON public.elements;
CREATE TRIGGER trg_elements_updated_at
    BEFORE UPDATE ON public.elements
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

-- 5. Триггер для логирования изменений статуса
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.element_status_log (element_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, 'web_anon');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_elements_status_log ON public.elements;
CREATE TRIGGER trg_elements_status_log
    AFTER UPDATE ON public.elements
    FOR EACH ROW EXECUTE FUNCTION public.fn_log_status_change();

-- 6. Права доступа для PostgREST (роль web_anon)
-- ============================================
-- Проекты: только чтение
GRANT SELECT ON public.projects TO web_anon;

-- Элементы: чтение + создание + обновление (для синхронизации)
GRANT SELECT, INSERT, UPDATE ON public.elements TO web_anon;

-- История: только чтение
GRANT SELECT ON public.element_status_log TO web_anon;

-- Sequences для INSERT
GRANT USAGE, SELECT ON public.projects_id_seq TO web_anon;
GRANT USAGE, SELECT ON public.elements_id_seq TO web_anon;
GRANT USAGE, SELECT ON public.element_status_log_id_seq TO web_anon;

-- 7. Витрина v_elements (денормализованная)
-- ============================================
CREATE OR REPLACE VIEW public.v_elements AS
SELECT
    e.id,
    e.guid,
    e.speckle_object_id,
    e.name,
    e.element_type,
    e.profile,
    e.material,
    e.weight_kg,
    e.status,
    e.sync_status,
    p.name AS project_name,
    p.speckle_stream_id,
    e.created_at,
    e.updated_at
FROM public.elements e
LEFT JOIN public.projects p ON p.id = e.project_id
WHERE e.sync_status = 'active';

COMMENT ON VIEW public.v_elements IS 'Витрина элементов с информацией о проекте';

GRANT SELECT ON public.v_elements TO web_anon;

-- Готово!
SELECT 'Most schema created successfully!' AS status;
