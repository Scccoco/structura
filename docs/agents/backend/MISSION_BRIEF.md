# Mission Brief: Backend Integration Agent

**Роль:** Python/DevOps Engineer  
**Модель:** Claude 3.5 Sonnet  
**Зона ответственности:** `backend/speckle_adapter/`, `database/`, Docker конфиги  
**Приоритет:** Реализация автоматической синхронизации через Webhooks

---

## 1. Контекст Проекта

**Structura** — это платформа "Цифровой Двойник" для строительства. Система автоматически извлекает данные из BIM-моделей и связывает их с бизнес-процессами.

### Текущее Состояние
- ✅ **Infrastructure OK:** VPS развернут, Speckle работает, auth починен
- ✅ **Adapter написан:** `backend/speckle_adapter/` парсит модели и записывает элементы в БД
- ✅ **База готова:** PostgreSQL с таблицами `projects`, `models`, `elements`
- ⚠️ **Проблема:** Синхронизация запускается вручную, нет автоматизации

### Проблема, Которую Мы Решаем
Сейчас рабочий процесс требует ручного вмешательства:
1. Инженер загружает модель в Speckle (через Tekla Connector)
2. **Админ** вручную запускает `POST /sync` в адаптере
3. Данные попадают в PostgreSQL
4. Frontend показывает обновления

**Цель:** Убрать шаг 2. Сделать так, чтобы Speckle сам дергал адаптер при появлении новой версии модели.

---

## 2. Технологический Стек

### Backend (Ваша ответственность)
```python
{
  "Framework": "FastAPI",
  "Language": "Python 3.11",
  "BIM Integration": "specklepy",
  "Database": "psycopg2 (PostgreSQL)",
  "Deployment": "Docker + Gunicorn",
  "Infrastructure": "Docker Compose + Traefik"
}
```

### Интеграция
- **Speckle Server:** GraphQL API для метаданных, REST для геометрии
- **PostgreSQL:** Таблицы `elements` (связь GUID↔статус)
- **PostgREST:** Автоматический REST API для фронтенда

---

## 3. Архитектура Данных

### Data Flow (Цель)

```
┌────────────────┐
│ Tekla/Revit    │
│ (Инженер)      │
└────────┬───────┘
         │ Speckle Connector
         ▼
┌────────────────┐
│ Speckle Server │◄──────┐
│ (BIM Ядро)     │       │
└────────┬───────┘       │
         │ Webhook       │ GraphQL
         │ (POST)        │ (GET metadata)
         ▼               │
┌────────────────┐       │
│ Speckle Adapter│───────┘
│ (Python/FastAPI│
└────────┬───────┘
         │ SQL INSERT
         ▼
┌────────────────┐
│ PostgreSQL     │
│ (Бизнес-данные)│
└────────┬───────┘
         │ PostgREST
         ▼
┌────────────────┐
│ Frontend (UI)  │
└────────────────┘
```

**Ключевой момент:** Speckle должен **автоматически** вызывать адаптер при событии `commit.created`.

---

## 4. Текущая Реализация

### Структура Backend

```
backend/
├── speckle_adapter/
│   ├── main.py           # FastAPI app, endpoints
│   ├── speckle_client.py # Логика парсинга Speckle models
│   ├── database.py       # Подключение к PostgreSQL
│   ├── requirements.txt  # Dependencies
│   └── Dockerfile        # Сборка контейнера
database/
├── create_view.sql       # VIEW для элементов
└── update_view_with_trigger.sql  # Триггер для UPDATE
```

### Существующие Endpoints

**`GET /health`**  
Проверка работоспособности сервиса.

**`POST /sync`**  
Парсит указанную модель и записывает элементы в БД.

**Request Body:**
```json
{
  "stream_id": "87db0c5f50",
  "object_id": "e16d04cc7f79b2d9cbe6b8d561faaed5"
}
```

**Response:**
```json
{
  "status": "success",
  "elements_processed": 1234,
  "time_elapsed": "5.2s"
}
```

---

## 5. Ваша Задача: Webhooks Integration

### MVP Roadmap

#### Этап 1: Сущность "Проект"
**Цель:** Создать таблицу проектов и API для их регистрации

**Шаги:**

1.  **Schema Update (SQL):**
    ```sql
    CREATE TABLE projects (
        id VARCHAR PRIMARY KEY, -- Это будет Speckle Stream ID
        name VARCHAR NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Добавить FK в elements
    ALTER TABLE elements ADD COLUMN project_id VARCHAR;
    -- ALTER TABLE elements ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id);
    ```

2.  **Endpoint `POST /projects`:**
    - Принимает `{ "stream_id": "...", "name": "..." }`
    - Проверяет существование стрима в Speckle (через GraphQL)
    - Создает запись в БД `projects`
    - Запускает **первичную синхронизацию** (вытягивает все элементы)

#### Этап 2: Webhooks (Auto-Sync)
**Цель:** Автоматически обновлять проект при изменениях в Speckle

3. **Security: Проверка подлинности**
   ```python
   # Speckle может подписывать payload HMAC (если настроено)
   # Проверить заголовок X-Speckle-Signature
   ```

#### Этап 2: Настройка Webhooks в Speckle
**Цель:** Зарегистрировать webhook в админке Speckle Server

**Шаги:**

1. **Зайти в Speckle Admin:**
   - URL: `https://speckle.structura-most.ru`
   - Profile → Settings → Webhooks

2. **Создать Webhook:**
   ```
   URL: https://adapter.structura-most.ru/webhook
   Events: commit_create
   Trigger: On new commit
   Enabled: Yes
   ```

3. **Протестировать:**
   - Загрузить тестовую модель в Speckle
   - Проверить логи адаптера: `docker logs speckle-adapter`

#### Этап 3: Асинхронная Обработка (Optional, но рекомендуется)
**Цель:** Не блокировать webhook response, если парсинг занимает долго

**Решение:**
- Использовать `BackgroundTasks` в FastAPI
- Или Redis + Celery для очередей

```python
from fastapi import BackgroundTasks

@app.post("/webhook")
async def handle_webhook(payload: dict, background_tasks: BackgroundTasks):
    stream_id = payload["event"]["data"]["streamId"]
    commit_id = payload["event"]["data"]["commitId"]
    
    # Запустить в фоне
    background_tasks.add_task(sync_model, stream_id, commit_id)
    
    return {"status": "queued"}
```

---

## 6. Технические Детали

### Speckle Webhook Payload (Пример)

```json
{
  "event": {
    "event_name": "commit_create",
    "data": {
      "streamId": "87db0c5f50",
      "commitId": "abc123def456",
      "userId": "user-id-here",
      "branchName": "main"
    }
  },
  "server": {
    "canonicalUrl": "https://speckle.structura-most.ru"
  }
}
```

### Environment Variables

**Добавить в `docker-compose.prod.yml`:**
```yaml
speckle-adapter:
  environment:
    - SPECKLE_SERVER_URL=http://speckle-server:3000
    - SPECKLE_TOKEN=${SPECKLE_TOKEN}
    - DATABASE_URL=postgresql://speckle:speckle_pass@postgres_speckle:5432/structura
    - ALLOW_ORIGINS=https://app.structura-most.ru
```

**Token можно взять из `CREDENTIALS.md`:**
```
Token: b47015ff123fc23131070342b14043c1b8a657dfb7
```

### Database Schema

**Таблица `elements` (уже существует):**
```sql
CREATE TABLE elements (
  guid UUID PRIMARY KEY,
  element_type VARCHAR,
  element_name VARCHAR,
  status VARCHAR DEFAULT 'not_started',
  created_at TIMESTAMP DEFAULT NOW(),
  model_id VARCHAR  -- ⚠️ Нужно добавить (Stream ID)
);
```

**Добавьте колонку `model_id` (если её нет):**
```sql
ALTER TABLE elements ADD COLUMN IF NOT EXISTS model_id VARCHAR;
CREATE INDEX idx_model_id ON elements(model_id);
```

---

## 7. Критерии Успеха

- [ ] Endpoint `/webhook` принимает POST от Speckle
- [ ] При `commit_create` автоматически запускается парсинг
- [ ] Элементы записываются в PostgreSQL с правильным `model_id`
- [ ] Логи показывают успешную обработку
- [ ] Frontend видит обновленные данные без ручного вмешательства
- [ ] Нет падений сервера при больших моделях (memory limits уже настроены DevOps)

---

## 8. Полезные Ресурсы

**Документация:**
- Speckle Webhooks: https://speckle.guide/dev/server-webhooks.html
- FastAPI Background Tasks: https://fastapi.tiangolo.com/tutorial/background-tasks/
- specklepy SDK: https://github.com/specklesystems/specklepy

**Контекстные Файлы:**
- `docs/technical/CURRENT_STATE.md` - Текущее состояние
- `docs/reports/2026-01-13_speckle_fixes_report.md` - DevOps отчет (auth fixes, memory limits)
- `backend/speckle_adapter/speckle_client.py` - Существующая логика парсинга

**Команды для локальной разработки:**
```bash
cd c:\structura\backend\speckle_adapter
pip install -r requirements.txt
uvicorn main:app --reload --port 8090
```

---

## 9. Известные Проблемы и Ограничения

### DevOps (Решено, знай для контекста)
✅ **Auth Fix:** Добавлены `X-Forwarded-Proto` headers (Speckle auth работает извне)  
✅ **Memory Limits:** `speckle-fileimport` ограничен 6GB (предотвращает падение сервера)  
✅ **Deployment:** `update_server.sh` автоматизирует деплой

### Backend (Ваша Зона)
⚠️ **Большие модели:** IFC >30 MB могут вызывать `ChannelClosedException` при веб-загрузке (используйте Tekla Connector)  
⚠️ **GraphQL Timeout:** Если парсинг займет >60 сек, Speckle может закрыть соединение  
⚠️ **Concurrent Webhooks:** Если 2 коммита придут одновременно, могут быть race conditions (решается очередями)

---

## 10. Workflow

1. **Локально разрабатываете** фичу (webhook endpoint)
2. **Тестируете:**
   ```bash
   # Эмуляция webhook
   curl -X POST http://localhost:8090/webhook \
     -H "Content-Type: application/json" \
     -d '{"event":{"event_name":"commit_create","data":{"streamId":"test","commitId":"123"}}}'
   ```
3. **Коммитите:**
   ```bash
   git add backend/
   git commit -m "feat: speckle webhooks integration"
   git push origin main
   ```
4. **На сервере (через Архитектора):**
   ```bash
   cd /root/structura
   git pull
   ./update_server.sh
   ```

---

## 11. Дополнительная Задача (После Webhooks)

### Улучшение Адаптера

**Текущие проблемы в `speckle_client.py`:**
1. Может зациклиться на рекурсивных объектах (хотя есть защита)
2. Не сохраняет связь `model_id` → `element`
3. Нет обработки дубликатов (если элемент уже в БД)

**Улучшения:**
```python
def insert_elements(elements: list, model_id: str):
    # Добавить model_id
    for elem in elements:
        elem['model_id'] = model_id
    
    # ON CONFLICT DO NOTHING (избежать дубликатов)
    query = """
    INSERT INTO elements (guid, element_type, element_name, model_id)
    VALUES (%s, %s, %s, %s)
    ON CONFLICT (guid) DO UPDATE
    SET model_id = EXCLUDED.model_id,
        updated_at = NOW();
    """
```

---

## Ваш Стартовый Промпт

> "Привет! Я Backend Integration Agent для проекта Structura. Моя задача — настроить автоматическую синхронизацию через Speckle Webhooks. Сейчас адаптер работает, но запускается вручную.
> 
> План:
> 1. Добавить endpoint `POST /webhook` в `backend/speckle_adapter/main.py`.
> 2. Парсить Speckle payload и извлекать `stream_id` + `commit_id`.
> 3. Запускать существующую логику парсинга.
> 4. Добавить колонку `model_id` в таблицу `elements`.
> 5. Протестировать с эмуляцией webhook.
> 
> Начинаю с изучения текущего `main.py` и добавления endpoint."

**Удачи! Твоя работа критична для автоматизации всей системы.**
