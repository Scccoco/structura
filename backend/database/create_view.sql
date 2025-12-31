-- Даем права роли web_anon (которую использует PostgREST) на нашу схему приложения
GRANT USAGE ON SCHEMA structura_app TO web_anon;

-- Разрешаем читать и ОБНОВЛЯТЬ (для смены статуса) таблицу элементов
GRANT SELECT, UPDATE ON structura_app.elements TO web_anon;

-- Если таблица public.elements уже существует (ошибка "is not a view"), удаляем её
DROP TABLE IF EXISTS public.elements CASCADE;

-- Создаем VIEW в схеме public, чтобы PostgREST увидел endpoint /elements
-- Маппим колонки базы (snake_case) в то, что ожидает фронтенд
CREATE OR REPLACE VIEW public.elements AS
SELECT
    speckle_id AS guid,       -- Фронтенд использует 'guid' как ключ
    type AS element_type,     -- Фронтенд ждет 'element_type'
    name AS element_name,     -- Фронтенд ждет 'element_name'
    status,                   -- 'status' совпадает
    created_at
FROM
    structura_app.elements;

-- Разрешаем доступ к VIEW
GRANT SELECT, UPDATE ON public.elements TO web_anon;

-- Нужно явно указать, что guid - это PK для View, чтобы PostgREST позволял делать PATCH/DELETE по ID
-- (В PostgREST для View это делается через комментарии или он сам понимает если view простая)
-- Для простых VIEW над одной таблицей PostgREST обычно справляется сам.
