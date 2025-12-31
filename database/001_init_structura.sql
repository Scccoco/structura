-- Digital Twin Database Schema
-- База данных: structura
-- PostgreSQL 15+

-- ============================================
-- 1. Создание базы данных и схем
-- ============================================

-- Создать БД (если еще не создана)
-- Выполнить: CREATE DATABASE structura;
-- Затем подключиться: \c structura

-- Создать схему для аутентификации Supabase
CREATE SCHEMA IF NOT EXISTS auth;

-- ============================================
-- 2. Создание ролей для PostgREST
-- ============================================

-- Анонимная роль (только SELECT)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'web_anon') THEN
    CREATE ROLE web_anon NOLOGIN;
  END IF;
END
$$;

-- Аутентифицированная роль (CRUD)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'web_user') THEN
    CREATE ROLE web_user NOLOGIN;
  END IF;
END
$$;

-- Роль для сервисов (полный доступ)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;

-- ============================================
-- 3. Основные таблицы для MVP теста
-- ============================================

-- Таблица элементов модели
CREATE TABLE IF NOT EXISTS public.elements (
    guid VARCHAR(100) PRIMARY KEY,
    element_type VARCHAR(50),
    element_name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.elements IS 'Элементы BIM модели с GUID из Speckle';
COMMENT ON COLUMN public.elements.guid IS 'Уникальный идентификатор элемента из Speckle (applicationId)';
COMMENT ON COLUMN public.elements.status IS 'Статус выполнения: not_started, in_progress, completed';

-- Индекс для быстрого поиска по статусу
CREATE INDEX IF NOT EXISTS idx_elements_status ON public.elements(status);
CREATE INDEX IF NOT EXISTS idx_elements_type ON public.elements(element_type);

-- ============================================
-- 4. Триггер для автообновления updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_elements_updated_at
    BEFORE UPDATE ON public.elements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Права доступа для ролей
-- ============================================

-- Анонимная роль - только чтение
GRANT USAGE ON SCHEMA public TO web_anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO web_anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO web_anon;

-- Аутентифицированная роль - CRUD
GRANT USAGE ON SCHEMA public TO web_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO web_user;

-- Сервисная роль - полный доступ
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Автоматическая выдача прав для новых объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO web_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO web_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;

-- ============================================
-- 6. Тестовые данные (опционально)
-- ============================================

-- Вставить 5 тестовых элементов для проверки
INSERT INTO public.elements (guid, element_type, element_name, status) VALUES
    ('test-guid-001', 'Column', 'Колонна K-1', 'not_started'),
    ('test-guid-002', 'Beam', 'Балка B-1', 'in_progress'),
    ('test-guid-003', 'Slab', 'Плита П-1', 'completed'),
    ('test-guid-004', 'Column', 'Колонна K-2', 'not_started'),
    ('test-guid-005', 'Beam', 'Балка B-2', 'in_progress')
ON CONFLICT (guid) DO NOTHING;

-- ============================================
-- 7. Проверка созданных объектов
-- ============================================

-- Проверить таблицы
\dt

-- Проверить роли
\du

-- Проверить данные
SELECT * FROM public.elements;

-- Готово!
