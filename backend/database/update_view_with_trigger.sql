-- Сначала удаляем view и потенциальный конфликт
DROP VIEW IF EXISTS public.elements;
DROP TABLE IF EXISTS public.elements CASCADE;

-- VIEW: guid = global_id (стабильный идентификатор)
CREATE OR REPLACE VIEW public.elements AS
SELECT
    global_id AS guid,
    speckle_id,
    type AS element_type,
    name AS element_name,
    status,
    created_at
FROM
    structura_app.elements
WHERE
    global_id IS NOT NULL
    AND type IS DISTINCT FROM 'IFCELEMENTASSEMBLY';

GRANT SELECT, UPDATE ON public.elements TO web_anon;

-- Триггер на UPDATE по view
CREATE OR REPLACE FUNCTION public.update_elements_view()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE structura_app.elements
    SET
        status = NEW.status
    WHERE global_id = OLD.guid;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_elements_trigger ON public.elements;

CREATE TRIGGER update_elements_trigger
INSTEAD OF UPDATE ON public.elements
FOR EACH ROW
EXECUTE FUNCTION public.update_elements_view();
