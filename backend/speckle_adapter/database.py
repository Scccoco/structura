import os
import psycopg2
from psycopg2.extras import execute_values
import json

class Database:
    def __init__(self):
        # Используем переменные окружения, которые уже прокинуты в docker-compose
        # В docker-compose.base.yml для speckle контейнера:
        # POSTGRES_URL=postgres://speckle:speckle_pass@postgres_speckle:5432/speckle
        # Но для нашего адаптера они не были прокинуты явно, нужно проверить main.py/docker
        # Мы добавим их в docker-compose.dev.yml позже, если их там нет.
        # Пока используем дефолтные значения из docker-compose.base.yml
        self.dbname = os.getenv("POSTGRES_DB", "structura")
        self.user = os.getenv("POSTGRES_USER", "speckle")
        self.password = os.getenv("POSTGRES_PASSWORD", "speckle_pass")
        self.host = os.getenv("POSTGRES_HOST", "postgres_speckle")
        self.port = os.getenv("POSTGRES_PORT", "5432")

    def get_connection(self):
        return psycopg2.connect(
            dbname=self.dbname,
            user=self.user,
            password=self.password,
            host=self.host,
            port=self.port
        )

    def sync_data(self, stream_id: str, model_id: str, commit_id: str, elements: list):
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                # 1. Upsert Project (Stream)
                # Мы не знаем имя проекта из этого скоупа, пока заглушка или берем stream_id
                # В идеале нужно делать запрос к API Speckle за инфой о Stream, но пока упростим.
                cur.execute("""
                    INSERT INTO structura_app.projects (speckle_stream_id, name)
                    VALUES (%s, %s)
                    ON CONFLICT (speckle_stream_id) DO UPDATE 
                    SET updated_at = NOW()
                    RETURNING id;
                """, (stream_id, f"Project {stream_id}"))
                project_db_id = cur.fetchone()[0]

                # 2. Upsert Model (Version/Commit)
                cur.execute("""
                    INSERT INTO structura_app.models 
                    (project_id, speckle_branch_name, speckle_commit_id, speckle_model_id)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (project_id, speckle_commit_id) DO UPDATE
                    SET speckle_model_id = EXCLUDED.speckle_model_id
                    RETURNING id;
                """, (project_db_id, "main", commit_id, model_id))
                model_db_id = cur.fetchone()[0]

                # 3. Batch Insert Elements
                # Подготовка данных для execute_values
                values = []
                for el in elements:
                    # element dict structure from traverse_and_extract:
                    # {'guid': ..., 'speckle_id': ..., 'name': ..., 'type': ..., 'ifc_type': ..., 'source': ...}
                    values.append((
                        model_db_id,
                        el.get('speckle_id'),
                        el.get('guid'), # global_id
                        el.get('name'),
                        el.get('ifc_type'), # type
                        # Остальные поля бизнес логики пока пусты или дефолтны
                    ))

                query = """
                    INSERT INTO structura_app.elements (model_id, speckle_id, global_id, name, type)
                    VALUES %s
                """
                # Очистим старые записи для этой модели если мы пере-синхронизируем?
                # Пока сделаем DELETE для простоты, т.к. это snapshot модели
                cur.execute("DELETE FROM structura_app.elements WHERE model_id = %s", (model_db_id,))
                
                execute_values(cur, query, values)
                
                conn.commit()
                return {"project_id": project_db_id, "model_id": model_db_id, "elements_count": len(values)}

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_elements_status(self, stream_id: str, model_id: str) -> list:
        """
        Возвращает список элементов со статусами для конкретной ВЕТКИ (Model ID).
        Нам нужно найти speckle_commit_id для этой speckle_model_id в таблице models.
        НО: таблица models хранит speckle_model_id только если мы синхронизировались.
        """
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT e.speckle_id, e.status
                    FROM structura_app.elements e
                    JOIN structura_app.models m ON e.model_id = m.id
                    JOIN structura_app.projects p ON m.project_id = p.id
                    WHERE p.speckle_stream_id = %s
                      AND m.speckle_model_id = %s
                """
                cur.execute(query, (stream_id, model_id))
                rows = cur.fetchall()
                # Возвращаем список словарей
                return [{"speckle_id": row[0], "status": row[1]} for row in rows]
        finally:
            conn.close()

    def update_element_statuses(self, element_ids: list, new_status: str) -> int:
        """
        Обновляет статус для списка speckle_id.
        """
        conn = self.get_connection()
        try:
            with conn.cursor() as cur:
                # В PostgreSQL ANY(ARRAY[...]) удобен для списка
                query = """
                    UPDATE structura_app.elements
                    SET status = %s, properties = jsonb_set(COALESCE(properties, '{}'), '{status_updated_at}', to_jsonb(NOW()))
                    WHERE speckle_id = ANY(%s)
                """
                cur.execute(query, (new_status, element_ids))
                conn.commit()
                return cur.rowcount
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
