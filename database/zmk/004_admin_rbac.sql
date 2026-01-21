-- ============================================
-- ZMK Admin: Users & RBAC
-- Пользователи, сессии, роли
-- ============================================

-- 1. Расширение для UUID и криптографии
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Таблица пользователей
CREATE TABLE IF NOT EXISTS zmk.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('viewer', 'user', 'bim_manager', 'manager', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON zmk.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON zmk.users(role);

COMMENT ON TABLE zmk.users IS 'Пользователи системы';

-- 3. Таблица сессий
CREATE TABLE IF NOT EXISTS zmk.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL REFERENCES zmk.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON zmk.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON zmk.sessions(expires_at);

COMMENT ON TABLE zmk.sessions IS 'Активные сессии пользователей';

-- 4. Роли PostgreSQL для PostgREST
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'zmk_viewer') THEN
        CREATE ROLE zmk_viewer NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'zmk_bim') THEN
        CREATE ROLE zmk_bim NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'zmk_manager') THEN
        CREATE ROLE zmk_manager NOLOGIN;
    END IF;
END
$$;

-- 5. Права для ролей

-- zmk_viewer: только чтение
GRANT USAGE ON SCHEMA zmk TO zmk_viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA zmk TO zmk_viewer;

-- zmk_user: + ввод бизнес-данных (уже существует)
-- (права даны в 001_init_zmk.sql)

-- zmk_bim: + синхронизация моделей
GRANT USAGE ON SCHEMA zmk TO zmk_bim;
GRANT SELECT ON ALL TABLES IN SCHEMA zmk TO zmk_bim;
GRANT INSERT, UPDATE ON zmk.assemblies TO zmk_bim;
GRANT INSERT, UPDATE ON zmk.sync_snapshots TO zmk_bim;
GRANT INSERT ON zmk.guid_mappings TO zmk_bim;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA zmk TO zmk_bim;

-- zmk_manager: все в проекте (кроме users)
GRANT USAGE ON SCHEMA zmk TO zmk_manager;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA zmk TO zmk_manager;
REVOKE ALL ON zmk.users FROM zmk_manager;
GRANT SELECT ON zmk.users TO zmk_manager;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA zmk TO zmk_manager;

-- zmk_admin: полный доступ (уже есть права через zmk_user, добавим users)
-- Примечание: zmk_admin = zmk_user + управление пользователями

-- 6. Функция регистрации
CREATE OR REPLACE FUNCTION zmk.register_user(
    p_email VARCHAR(255),
    p_password VARCHAR(255),
    p_name VARCHAR(255) DEFAULT NULL,
    p_role VARCHAR(50) DEFAULT 'viewer'
) RETURNS JSON AS $$
DECLARE
    new_user zmk.users;
BEGIN
    INSERT INTO zmk.users (email, password_hash, name, role)
    VALUES (p_email, crypt(p_password, gen_salt('bf')), p_name, p_role)
    RETURNING * INTO new_user;
    
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', new_user.id,
            'email', new_user.email,
            'name', new_user.name,
            'role', new_user.role
        )
    );
EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'Email already exists');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Функция логина
CREATE OR REPLACE FUNCTION zmk.login(
    p_email VARCHAR(255),
    p_password VARCHAR(255)
) RETURNS JSON AS $$
DECLARE
    found_user zmk.users;
BEGIN
    SELECT * INTO found_user
    FROM zmk.users
    WHERE email = p_email 
      AND password_hash = crypt(p_password, password_hash)
      AND is_active = true;
    
    IF found_user.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid credentials');
    END IF;
    
    -- Обновить last_login
    UPDATE zmk.users SET last_login = NOW() WHERE id = found_user.id;
    
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', found_user.id,
            'email', found_user.email,
            'name', found_user.name,
            'role', found_user.role
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Функция получения текущего пользователя (по JWT)
CREATE OR REPLACE FUNCTION zmk.get_me() RETURNS JSON AS $$
DECLARE
    user_role TEXT;
BEGIN
    user_role := current_setting('request.jwt.claims', true)::json->>'role';
    
    RETURN json_build_object(
        'role', user_role,
        'authenticated', user_role IS NOT NULL AND user_role != 'zmk_anon'
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Права на функции
GRANT EXECUTE ON FUNCTION zmk.login TO zmk_anon;
GRANT EXECUTE ON FUNCTION zmk.register_user TO zmk_user, zmk_manager;
GRANT EXECUTE ON FUNCTION zmk.get_me TO zmk_anon, zmk_viewer, zmk_user, zmk_bim, zmk_manager;

-- 10. Создать админа по умолчанию
INSERT INTO zmk.users (email, password_hash, name, role)
VALUES ('admin@structura-most.ru', crypt('admin123', gen_salt('bf')), 'Администратор', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Готово!
SELECT 'ZMK admin tables and RBAC created!' AS status;
