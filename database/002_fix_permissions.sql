-- Исправление прав доступа для PostgREST
-- Выполнить в БД structura

-- 1. Выдать права UPDATE роли web_anon (для анонимного доступа)
GRANT UPDATE ON ALL TABLES IN SCHEMA public TO web_anon;

-- 2. Выдать полные права роли web_user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO web_user;

-- 3. Обновить default privileges для будущих таблиц
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT UPDATE ON TABLES TO web_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO web_user;

-- 4. Проверка прав
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name='elements';
