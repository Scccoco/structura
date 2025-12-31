-- Создаем отдельную схему для нашего приложения, чтобы не смешивать с данными Speckle
CREATE SCHEMA IF NOT EXISTS structura_app;

-- Таблица Проектов (связь со Speckle Stream)
CREATE TABLE IF NOT EXISTS structura_app.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    speckle_stream_id TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица Моделей/Версий (связь со Speckle Commit/Object)
CREATE TABLE IF NOT EXISTS structura_app.models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES structura_app.projects(id) ON DELETE CASCADE,
    speckle_branch_name TEXT NOT NULL, -- например 'main'
    speckle_commit_id TEXT NOT NULL,   -- ID коммита (Object ID корневого объекта версии)
    speckle_model_id TEXT,             -- ID ветки (Model ID)
    version_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Уникальность: в одном проекте один и тот же коммит не должен дублироваться
    UNIQUE(project_id, speckle_commit_id)
);

-- Таблица Элементов (Балки, Колонны и т.д.)
CREATE TABLE IF NOT EXISTS structura_app.elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES structura_app.models(id) ON DELETE CASCADE,
    
    -- Идентификаторы из Speckle/IFC
    speckle_id TEXT NOT NULL,  -- Hash ID геометрии speckle
    global_id TEXT,            -- IfcGlobalId (ApplicationId)
    
    -- Метаданные
    name TEXT,
    type TEXT,                 -- IFC Class (e.g. IFCBEAM)
    category TEXT,             -- Группировка (e.g. Structural)
    
    -- Бизнес-данные (то, ради чего все затевалось)
    status TEXT DEFAULT 'new', -- new, construction, done
    cost NUMERIC(15, 2),
    volume NUMERIC(10, 3),
    
    properties JSONB,          -- Все остальные свойства
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для ускорения поиска
CREATE INDEX IF NOT EXISTS idx_elements_model_id ON structura_app.elements(model_id);
CREATE INDEX IF NOT EXISTS idx_elements_speckle_id ON structura_app.elements(speckle_id);
CREATE INDEX IF NOT EXISTS idx_elements_global_id ON structura_app.elements(global_id);
CREATE INDEX IF NOT EXISTS idx_projects_stream_id ON structura_app.projects(speckle_stream_id);
