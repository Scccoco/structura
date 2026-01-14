# Mission Brief: Frontend Developer Agent

**Роль:** Senior React Developer  
**Модель:** Claude 4.5 Sonnet  
**Зона ответственности:** `frontend/` директория  
**Приоритет:** Реализация автоматизированного каталога проектов

---

## 1. Контекст Проекта

**Structura** — это платформа "Цифровой Двойник" для строительства. Она объединяет:
- **BIM-модели** (геометрия зданий из Tekla/Revit) через Speckle Server
- **Бизнес-данные** (статусы работ, сроки, ответственные) через PostgreSQL
- **Веб-интерфейс** для визуализации и управления

### Текущее Состояние
- ✅ **MVP развернут:** `https://app.structura-most.ru`
- ✅ **Backend работает:** PostgREST API на `https://api.structura-most.ru`
- ✅ **Speckle Server работает:** `https://speckle.structura-most.ru`
- ⚠️ **Проблема:** ID модели захардкожен в `.env.production`

### Проблема, Которую Мы Решаем
Сейчас пользователь не может:
1. Увидеть список всех загруженных проектов (streams)
2. Выбрать проект для просмотра
3. Переключаться между проектами без изменения кода

**Цель:** Превратить статичный прототип в динамическую платформу с каталогом проектов.

---

## 2. Технологический Стек

### Frontend (Вашадomain ответственности)
```json
{
  "Framework": "React 18",
  "Build Tool": "Vite 5",
  "UI Library": "Refine.dev (на базе Ant Design)",
  "3D Viewer": "@speckle/viewer",
  "Data Fetching": "Custom Data Provider (PostgREST)",
  "Routing": "React Router v6",
  "Language": "TypeScript"
}
```

### Backend (Интеграция)
- **PostgREST:** REST API для таблиц PostgreSQL (`/elements`)
- **Speckle GraphQL API:** Список проектов, метаданные моделей
- **Speckle REST API:** Загрузка 3D геометрии для Viewer

---

## 3. Архитектура Данных

### Источники Данных

```
┌──────────────────┐         ┌──────────────────┐
│  Speckle Server  │         │  PostgreSQL DB   │
│  (BIM Геометрия) │         │ (Бизнес-данные)  │
└─────────┬────────┘         └────────┬─────────┘
          │                           │
          │ GraphQL/REST              │ PostgREST
          │                           │
          └───────────┬───────────────┘
                      │
              ┌───────▼────────┐
              │  Frontend App  │
              │ (React/Refine) │
              └────────────────┘
```

### Ключевой Идентификатор: GUID
- Каждый элемент модели (балка, колонна) имеет уникальный `GUID`
- По этому `GUID` связываются геометрия (Speckle) и статусы (PostgreSQL)

---

## 4. Текущая Реализация

### Структура Проекта
```
frontend/
├── src/
│   ├── App.tsx           # Data Provider, роутинг, Refine конфиг
│   ├── pages/
│   │   ├── dashboard/    # Главная страница
│   │   ├── elements/     # Таблица элементов
│   │   │   ├── list.tsx  # Список элементов (фильтры, сортировка)
│   │   │   └── edit.tsx  # Редактирование статуса
│   │   └── viewer/       # 3D просмотр
│   │       └── index.tsx # Speckle Viewer (HARDCODED Model ID)
├── .env.development      # Локальные URL
├── .env.production       # Prod URL (захардкожен Stream ID)
├── vite.config.ts
└── package.json
```

### Критические Файлы

**`src/App.tsx`:**
- Custom Data Provider для PostgREST
- Роутинг Refine (`/elements`, `/viewer`)
- **Использует:** `import.meta.env.VITE_API_URL` и `VITE_SPECKLE_STREAM_URL`

**`src/pages/viewer/index.tsx`:**
- Загружает 3D модель из Speckle
- **Проблема:** URL модели статичен (из `.env`)
- Должен стать динамическим (из URL параметра или выбора проекта)

**`src/pages/elements/list.tsx`:**
- Показывает таблицу элементов из PostgreSQL
- Работает корректно

---

## 5. Ваша Задача: Auto-Discovery

### MVP Roadmap

#### Этап 1: Каталог Проектов
**Цель:** Показать список всех Stream-ов из Speckle Server

**Шаги:**
1. **Создать страницу `/projects`:**
   - Компонент `ProjectList.tsx`
   - Fetch данных из Speckle GraphQL API
   - Query: `streams { items { id, name, description, updatedAt, createdAt } }`

2. **Интегрировать с Refine:**
   ```tsx
   resources={[
     { name: "projects", list: "/projects", meta: { label: "Проекты" } }
   ]}
   ```

3. **UI/UX:**
   - Карточки проектов (Grid или List)
   - Превью (если есть thumbnail)
   - Клик → переход на `/projects/:id`

#### Этап 2: Динамический Viewer
**Цель:** Убрать хардкод, сделать Viewer зависимым от выбранного проекта

**Шаги:**
1. **Изменить роутинг:**
   ```tsx
   <Route path="/projects/:streamId/viewer" element={<ViewerPage />} />
   ```

2. **Обновить `ViewerPage`:**
   ```tsx
   const { streamId } = useParams(); // React Router
   const objectUrl = `${SPECKLE_SERVER}/streams/${streamId}/objects/${latestCommitId}`;
   ```

3. **Получить `latestCommitId`:**
   - Запросить из Speckle GraphQL:
     ```graphql
     query($streamId: String!) {
       stream(id: $streamId) {
         commits(limit: 1) {
           items {
             id
             referencedObject
           }
         }
       }
     }
     ```

#### Этап 3: Связка с Бизнес-данными
**Цель:** Фильтровать элементы в таблице по выбранному проекту

**Шаги:**
1. **Добавить `model_id` в таблицу `elements`** (Backend задача)
2. **Передать `streamId` в Data Provider:**
   ```tsx
   const { tableProps } = useTable({
     resource: "elements",
     filters: { permanent: [{ field: "model_id", operator: "eq", value: streamId }] }
   });
   ```

---

## 6. Технические Детали

### Speckle GraphQL API

**Endpoint:** `https://speckle.structura-most.ru/graphql`

**Пример запроса (список проектов):**
```graphql
query {
  streams(limit: 100) {
    items {
      id
      name
      description
      updatedAt
      commits(limit: 1) {
        items {
          id
          message
          referencedObject
        }
      }
    }
  }
}
```

**Авторизация:**
```http
Authorization: Bearer YOUR_TOKEN
```

Token можно взять из `CREDENTIALS.md` (Personal Access Token).

### Environment Variables

**`.env.production`:**
```env
VITE_API_URL=https://api.structura-most.ru
VITE_SPECKLE_SERVER=https://speckle.structura-most.ru
# Убрать VITE_SPECKLE_STREAM_URL (будет динамическим)
```

---

## 7. Критерии Успеха

- [ ] Страница `/projects` показывает список всех Stream-ов
- [ ] Клик по проекту открывает `/projects/:id/viewer`
- [ ] 3D Viewer загружает модель динамически (по `streamId`)
- [ ] Нет хардкода в `.env` (кроме базовых URL)
- [ ] TypeScript сборка без ошибок
- [ ] Responsive дизайн (работает на мобильных)

---

## 8. Полезные Ресурсы

**Документация:**
- Speckle GraphQL Schema: https://speckle.guide/dev/graphql.html
- Refine.dev Docs: https://refine.dev/docs/
- @speckle/viewer: https://github.com/specklesystems/speckle-server/tree/main/packages/viewer

**Контекстные Файлы:**
- `docs/technical/CURRENT_STATE.md` - Текущее состояние системы
- `docs/technical/ARCHITECTURE.md` - Архитектура платформы
- `CREDENTIALS.md` - Токены и доступы

**Команды для локального запуска:**
```bash
cd c:\structura\frontend
npm run dev  # http://localhost:5173
```

---

## 9. Известные Проблемы и Ограничения

### DevOps (Уже Решено)
✅ Speckle Auth работает с внешних устройств  
✅ Memory limits настроены для больших моделей  
✅ HTTPS сертификаты получены автоматически

### Frontend (Ваша Зона)
⚠️ TypeScript может ругаться на `import.meta.env` (добавлен `"types": ["vite/client"]`)  
⚠️ Speckle Viewer иногда требует повторный зум (`viewer.zoom()` несколько раз)

---

## 10. Workflow

1. **Локально разрабатываете** фичу
2. **Тестируете** на `localhost:5173`
3. **Коммитите:**
   ```bash
   git add frontend/
   git commit -m "feat: dynamic project catalog"
   git push origin main
   ```
4. **На сервере (через Архитектора):**
   ```bash
   cd /root/structura
   git pull
   ./update_server.sh
   ```

---

## Ваш Стартовый Промпт

> "Привет! Я Frontend Developer Agent для проекта Structura. Моя задача — реализовать динамический каталог проектов. Сейчас ID модели захардкожен в `.env`. Нужно:
> 1. Создать страницу `/projects`, которая покажет все Stream-ы из Speckle (GraphQL).
> 2. Сделать Viewer динамическим (принимать `streamId` из URL).
> 3. Убрать хардкод.
> 
> Начинаем с каталога. Создаю `src/pages/projects/list.tsx` и настраиваю GraphQL запрос к Speckle."

**Удачи! Следующий шаг после тебя — Backend агент настроит вебхуки.**
