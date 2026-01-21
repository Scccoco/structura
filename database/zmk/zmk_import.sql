-- ============================================
-- ZMK Data Import Script
-- Импорт данных из Excel/CSV в схему zmk
-- ============================================

-- Шаг 1: Создать staging таблицу
-- ============================================
DROP TABLE IF EXISTS zmk.import_staging;
CREATE TABLE zmk.import_staging (
    main_part_guid VARCHAR(100),
    assembly_guid VARCHAR(100),
    dwg_no VARCHAR(100),
    mark VARCHAR(100),
    axes VARCHAR(100),
    name VARCHAR(500),
    weight_model_t DECIMAL(10,3),
    weight_weld_t DECIMAL(10,3),
    weight_total_t DECIMAL(10,3)
);

-- Шаг 2: Загрузить CSV в staging
-- ============================================
-- ВАЖНО: Выполнить на сервере PostgreSQL
-- Формат CSV: main_part_guid;assembly_guid;dwg_no;mark;axes;name;weight_model_t;weight_weld_t;weight_total_t
-- Кодировка: UTF-8, разделитель: точка с запятой (;)

-- Вариант A: Через COPY (требует доступ к файловой системе сервера)
-- COPY zmk.import_staging FROM '/path/to/data.csv' WITH (FORMAT CSV, HEADER TRUE, DELIMITER ';');

-- Вариант B: Через psql \copy (выполнять из командной строки)
-- \copy zmk.import_staging FROM 'C:/data/zmk_export.csv' WITH (FORMAT CSV, HEADER TRUE, DELIMITER ';', ENCODING 'UTF8');

-- Шаг 3: Вставить данные в основную таблицу
-- ============================================
INSERT INTO zmk.assemblies (
    main_part_guid,
    assembly_guid,
    dwg_no,
    mark,
    axes,
    name,
    weight_model_t,
    weight_weld_t,
    weight_total_t
)
SELECT
    main_part_guid,
    assembly_guid,
    dwg_no,
    mark,
    axes,
    name,
    weight_model_t,
    weight_weld_t,
    weight_total_t
FROM zmk.import_staging
ON CONFLICT (main_part_guid) DO UPDATE SET
    assembly_guid = EXCLUDED.assembly_guid,
    dwg_no = EXCLUDED.dwg_no,
    mark = EXCLUDED.mark,
    axes = EXCLUDED.axes,
    name = EXCLUDED.name,
    weight_model_t = EXCLUDED.weight_model_t,
    weight_weld_t = EXCLUDED.weight_weld_t,
    weight_total_t = EXCLUDED.weight_total_t,
    updated_at = NOW();

-- Шаг 4: Проверить результат
-- ============================================
SELECT COUNT(*) AS imported_count FROM zmk.assemblies;
SELECT * FROM zmk.assemblies LIMIT 10;

-- Шаг 5: Очистить staging (опционально)
-- ============================================
-- DROP TABLE zmk.import_staging;

-- ============================================
-- АЛЬТЕРНАТИВА: Импорт из Tekla через SQL
-- ============================================
-- Если есть прямой экспорт из Tekla в CSV:
-- 1. Экспортировать Report из Tekla с колонками:
--    - MAIN_PART.GUID (или ASSEMBLY.GUID)
--    - ASSEMBLY.ASSEMBLY_NUMBER
--    - ASSEMBLY.NAME
--    - ASSEMBLY.WEIGHT
--    и т.д.
-- 2. Загрузить через \copy как показано выше
-- 3. Маппинг полей может потребовать корректировки

-- Готово!
SELECT 'Import script ready. Edit paths and run on server.' AS status;
