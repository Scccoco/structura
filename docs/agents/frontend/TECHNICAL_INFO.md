# Frontend Technical Information

> Техническая документация для координации с Backend, Architect и другими агентами.

---

## Текущая Архитектура Frontend

### Tech Stack
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI Library:** Ant Design
- **3D Viewer:** @speckle/viewer
- **Routing:** react-router-dom

### Структура Проекта
```
frontend/
├── src/
│   ├── App.tsx                 # Главный компонент с роутингом
│   ├── pages/
│   │   ├── projects/
│   │   │   └── list.tsx        # Список проектов
│   │   └── viewer/
│   │       ├── index.tsx       # 3D Viewer (главный)
│   │       └── ViewerToolbar.tsx  # Toolbar с инструментами
│   └── ...
└── .agent/
    ├── MISSION_BRIEF.md
    ├── PLAN.md
    └── TECHNICAL_INFO.md (этот файл)
```

---

## Speckle Integration

### Подключение к Speckle Server
**Server:** `https://speckle.structura-most.ru`  
**Auth:** Hardcoded token (для разработки)

```typescript
const SPECKLE_SERVER = "https://speckle.structura-most.ru";
const SPECKLE_TOKEN = "b47015ff123fc23131070342b14043c1b8a657dfb7";
```

### Загрузка Модели
1. GraphQL запрос → получить `commitId` из `streamId`
2. `SpeckleLoader` → загрузить объект
3. `viewer.loadObject()` → отобразить в 3D

### Extensions в Использовании
- ✅ **CameraController** - управление камерой (Fit, Views)
- ✅ **SelectionExtension** - выбор элементов кликом
- ✅ **MeasurementsExtension** - измерения (в процессе настройки UI)
- ✅ **SectionTool** - сечения (базовая интеграция)

---

## API Endpoints (Текущие)

### Projects List
**Endpoint:** `/api/projects` (мок данные в коде)  
**Используется:** `pages/projects/list.tsx`

**Структура данных:**
```typescript
interface Project {
  id: string;         // Speckle streamId
  name: string;
  description?: string;
  thumbnail?: string;
}
```

### Viewer
**Route:** `/projects/:streamId/viewer`  
**GraphQL Query:**
```graphql
query GetLatestCommit($streamId: String!) {
  stream(id: $streamId) {
    name
    commits(limit: 1) {
      items {
        id
        referencedObject
      }
    }
  }
}
```

---

## Что Ждем от Backend

### 1. API для списка проектов
**Нужен endpoint:** `GET /api/projects`

**Формат ответа:**
```json
[
  {
    "id": "69b5048b92",
    "name": "МГУ",
    "description": "Проект МГУ",
    "thumbnail": "https://...",
    "speckle_stream_id": "69b5048b92"
  }
]
```

### 2. API для элементов модели
**Нужен endpoint:** `GET /api/elements?project_id=...`

**Для чего:**
- Связь геометрии (Speckle) с бизнес-данными (PostgreSQL)
- Отображение дополнительных свойств в Selection Panel
- Фильтрация элементов

**Структура:**
```json
[
  {
    "id": "element_uuid",
    "speckle_id": "...",
    "type": "Beam",
    "properties": { ... },
    "model_id": "69b5048b92"
  }
]
```

### 3. Webhooks для синхронизации
**Когда в Speckle новый commit:**
- Backend получает webhook
- Парсит геометрию
- Обновляет PostgreSQL
- Frontend получает свежие данные через API

---

## Текущие Технические Детали

### 3D Viewer Initialization
**Файл:** `frontend/src/pages/viewer/index.tsx`

```typescript
// Создание Viewer
const viewer = new Viewer(containerRef.current!);
await viewer.init();

// Extensions
viewer.createExtension(CameraController);
viewer.createExtension(SelectionExtension);
const measurements = viewer.createExtension(MeasurementsExtension);
const section = viewer.createExtension(SectionTool);

// Загрузка модели
const loader = new SpeckleLoader(viewer.getWorldTree(), objectUrl, token);
await viewer.loadObject(loader, true);
```

### Selection Events
```typescript
viewer.on(ViewerEvent.ObjectClicked, (event) => {
  const userData = event.hits[0].node?.model?.raw;
  // userData содержит Speckle properties
  // Нужно запросить дополнительные данные из Backend API
});
```

---

## Measurements Tool API

### MeasurementType Enum
```typescript
enum MeasurementType {
  POINTTOPOINT = "pointToPoint",   // Между точками
  PERPENDICULAR = "perpendicular", // Перпендикуляр
  AREA = "area",                   // Площадь
  POINT = "point"                  // Координаты точки
}
```

### MeasurementOptions
```typescript
interface MeasurementOptions {
  measurementType: MeasurementType;
  vertexSnap: boolean;     // Привязка к вершинам
  chain: boolean;          // Цепные измерения
  units: string;           // "m", "mm", "ft", "in"
  precision: number;       // 0-4
}
```

### Методы
```typescript
measurements.setMeasurementType(type);
measurements.setOptions(options);
measurements.clearMeasurements();
measurements.enabled = true/false;
```

---

## Для Архитектора

### Текущие Вопросы
1. **Структура БД:** Нужна таблица `elements` с колонкой `model_id` для связи с проектами
2. **API Design:** Какой формат предпочтительнее для `/api/elements`?
3. **Webhooks:** Как координировать синхронизацию между Speckle → Backend?

### Следующие Шаги
1. Завершить Measurements Tool UI
2. Интеграция с Backend API для списка проектов
3. Интеграция с Backend API для элементов модели

---

## Changelog

### 2026-01-15
- ✅ Базовая настройка 3D Viewer
- ✅ Toolbar с кнопками инструментов
- ✅ Extensions: Camera, Selection, Measurements, Section
- 🔨 В процессе: Полноценный UI для Measurements Tool

---

**Обновлено:** 2026-01-15 18:42  
**Frontend Agent**
