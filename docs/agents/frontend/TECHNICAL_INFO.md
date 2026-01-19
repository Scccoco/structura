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

### 2026-01-17
- ✅ **FilterPanel** — панель фильтрации и агрегации по свойствам модели
- ✅ **SelectInfoPanel** — улучшена с кастомными лейблами атрибутов и конвертацией единиц
- ✅ **Toolbar** — обновлены названия кнопок, удалена неиспользуемая панель Фильтры
- ✅ **Units Display** — исправлена конвертация mm³→м³, mm²→м², mm→м

### 2026-01-16
- ✅ SelectInfoPanel: кастомные имена атрибутов (localStorage)
- ✅ three.d.ts — TypeScript declaration для модуля three

### 2026-01-15
- ✅ Базовая настройка 3D Viewer
- ✅ Toolbar с кнопками инструментов
- ✅ Extensions: Camera, Selection, Measurements, Section, Filtering
- ✅ MeasurementsPanel с настройками
- ✅ SceneExplorerPanel для навигации по дереву модели
- ✅ ModelsPanel для переключения версий (коммитов)
- ✅ Diff Mode для сравнения версий модели

---

## Реализованные Компоненты

### 1. ViewerToolbar
**Файл:** `frontend/src/pages/viewer/ViewerToolbar.tsx`

**Назначение:** Панель инструментов для управления 3D вьювером.

**Кнопки:**
| Иконка | Название | Функция |
|--------|----------|---------|
| 🔍 | Вписать | Подогнать камеру под модель |
| 📏 | Измерения | Включить/выключить режим измерений |
| ✂️ | Сечения | Включить/выключить режим сечений |
| 📷 | Виды ▼ | Dropdown с видами камеры (сверху, спереди, сбоку, изометрия) |
| 🌳 | Проводник | Открыть SceneExplorerPanel |
| 📁 | Версии | Открыть ModelsPanel (история версий) |
| 📊 | Фильтр | Открыть FilterPanel (фильтрация по свойствам) |

**Props Interface:**
```typescript
interface ViewerToolbarProps {
    onFit: () => void;
    onMeasure: () => void;
    onSection: () => void;
    onCameraView: (view: "top" | "front" | "side" | "iso") => void;
    onToggleSceneExplorer: () => void;
    onToggleModels: () => void;
    onTogglePropertyFilter: () => void;
    measureActive: boolean;
    sectionActive: boolean;
    sceneExplorerActive: boolean;
    modelsActive: boolean;
    propertyFilterActive: boolean;
}
```

---

### 2. SelectInfoPanel
**Файл:** `frontend/src/pages/viewer/SelectInfoPanel.tsx`

**Назначение:** Панель отображения свойств выбранного элемента модели.

**Ключевые Features:**

#### 2.1 Извлечение свойств (flattenProperties)
Рекурсивно обходит объект элемента и извлекает все свойства в плоский список.

**Поддерживаемые группы:**
- `Report` — отчетные данные из Tekla
- `User Defined Attributes` — пользовательские атрибуты
- `properties` — вложенные свойства Speckle

**Скрытые технические атрибуты:**
```typescript
const HIDDEN_ATTRS = [
    "id", "applicationId", "totalChildrenCount", 
    "__closure", "displayStyle", "renderMaterial", 
    "displayValue", "referencedId", "units"
];
```

#### 2.2 Конвертация единиц измерения (formatValue)
```typescript
const formatValue = (attr: FlattenedAttribute): string => {
    // Конвертация:
    // - Cubic millimeters → м³ (÷ 1,000,000,000)
    // - Square millimeters → м² (÷ 1,000,000)
    // - millimeters → м (÷ 1,000)
    // - Kilograms → кг (или т если > 1000)
};
```

**Пример трансформации:**
- Вход: `1055000000.000 Cubic millimeters`
- Выход: `1.055 м³`

#### 2.3 Кастомные лейблы атрибутов
**localStorage Key:** `viewer_model_attribute_labels`

```typescript
const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

const saveLabel = (attrName: string, label: string) => {
    const newLabels = { ...customLabels };
    newLabels[attrName] = label.trim();
    setCustomLabels(newLabels);
    localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(newLabels));
};

const getDisplayName = (attrName: string): string => {
    return customLabels[attrName] || attrName.replace(/_/g, " ");
};
```

**UI:** В модальном окне настроек рядом с каждым атрибутом иконка ✏️ для редактирования.

#### 2.4 Видимость атрибутов
**localStorage Key:** `viewer_model_attributes`

Пользователь может выбирать какие атрибуты отображать через модальное окно настроек.

**По умолчанию видимые:**
```typescript
const DEFAULT_VISIBLE_ATTRIBUTES = [
    "Category", "Name", "name", "TYPE", "speckle_type",
    "PHASE", "MATERIAL", "MARK", "Profile_name", ...
];
```

---

### 3. FilterPanel
**Файл:** `frontend/src/pages/viewer/FilterPanel.tsx`

**Назначение:** Панель фильтрации объектов модели по свойствам с агрегацией числовых значений.

**Ключевые Features:**

#### 3.1 Сбор объектов из WorldTree
```typescript
const collectObjects = useCallback(() => {
    const walk = (node: any) => {
        if (node?.model?.raw) {
            objects.push({
                id: raw.id,
                nodeId: node.model.id,  // Для FilteringExtension
                name: raw.name,
                type: raw.speckle_type,
                properties: extractProperties(raw)
            });
        }
        if (node?.children) {
            for (const child of node.children) walk(child);
        }
    };
    walk(worldTree.root);
}, [worldTree]);
```

#### 3.2 Фильтрация по свойству
1. Пользователь выбирает свойство (например `NAME`)
2. Система собирает уникальные значения
3. Пользователь выбирает нужные значения
4. Система фильтрует объекты

```typescript
const filteredObjects = useMemo(() => {
    if (!filterProperty || selectedValues.length === 0) return allObjects;
    return allObjects.filter(obj => {
        const prop = obj.properties[filterProperty];
        return selectedValues.includes(String(prop?.value));
    });
}, [allObjects, filterProperty, selectedValues]);
```

#### 3.3 Агрегация (сумма)
```typescript
const aggregatedSum = useMemo(() => {
    if (!aggregateProperty) return null;
    
    let sum = 0;
    let units = "";
    
    filteredObjects.forEach(obj => {
        const prop = obj.properties[aggregateProperty];
        if (prop && typeof prop.value === "number") {
            sum += prop.value;
            if (!units && prop.units) units = prop.units;
        }
    });
    
    const converted = convertValue(sum, units);
    return {
        value: converted.value,
        units: converted.units,
        formatted: formatNumber(converted.value)
    };
}, [filteredObjects, aggregateProperty]);
```

#### 3.4 Интеграция с FilteringExtension
```typescript
// Изолировать (показать только выбранные)
const handleIsolate = () => {
    const ids = filteredObjects.map(o => o.nodeId);
    filteringExtension.isolateObjects(ids);
};

// Скрыть выбранные
const handleHide = () => {
    const ids = filteredObjects.map(o => o.nodeId);
    filteringExtension.hideObjects(ids);
};

// Сбросить фильтры
const handleReset = () => {
    filteringExtension.resetFilters();
};
```

**UI структура:**
- Статистика (всего/отфильтровано объектов)
- Collapse "🔍 Фильтр" (свойство + значения)
- Collapse "📊 Агрегация" (числовое свойство + сумма)
- Кнопки: Изолировать, Скрыть, Показать все

---

### 4. ModelsPanel
**Файл:** `frontend/src/pages/viewer/ModelsPanel.tsx`

**Назначение:** История версий модели (коммитов Speckle) с функцией сравнения.

**Features:**
- Список коммитов с датой и сообщением
- Переключение между версиями
- Diff Mode: сравнение двух версий (changed/added/removed)

---

### 5. SceneExplorerPanel
**Файл:** `frontend/src/pages/viewer/SceneExplorerPanel.tsx`

**Назначение:** Древовидная структура объектов модели для навигации.

**Features:**
- Иерархическое отображение объектов
- Клик для выбора/выделения
- Интеграция с SelectionExtension

---

### 6. MeasurementsPanel
**Файл:** `frontend/src/pages/viewer/MeasurementsPanel.tsx`

**Назначение:** Настройки инструмента измерений.

**Опции:**
- Тип измерения: Point-to-Point, Perpendicular, Area, Point
- Привязка к вершинам (Snap to Vertices)
- Цепные измерения
- Единицы (m, mm)
- Точность (0-4 знака)

---

## Speckle Viewer Extensions

### Используемые Extensions:
```typescript
// В index.tsx
const cameraController = viewer.createExtension(CameraController);
const selection = viewer.createExtension(SelectionExtension);
const measurements = viewer.createExtension(MeasurementsExtension);
const section = viewer.createExtension(SectionTool);
const filtering = viewer.createExtension(FilteringExtension);
const diff = viewer.createExtension(DiffExtension);
```

### FilteringExtension API:
```typescript
// Изолировать объекты (скрыть все кроме указанных)
filteringExt.isolateObjects(nodeIds: string[]);

// Скрыть объекты
filteringExt.hideObjects(nodeIds: string[]);

// Показать объекты
filteringExt.showObjects(nodeIds: string[]);

// Сбросить все фильтры
filteringExt.resetFilters();

// Раскрасить объекты
filteringExt.setUserObjectColors([
    { objectIds: string[], color: { r: number, g: number, b: number } }
]);
```

---

## localStorage Keys

| Key | Назначение | Тип данных |
|-----|------------|------------|
| `viewer_model_attributes` | Видимые атрибуты в SelectInfoPanel | `string[]` |
| `viewer_model_attribute_labels` | Кастомные имена атрибутов | `Record<string, string>` |

---

## Типы данных

### FlattenedAttribute
```typescript
interface FlattenedAttribute {
    name: string;           // Имя атрибута
    originalKey: string;    // Оригинальный путь (для вложенных)
    value: any;             // Значение
    units?: string;         // Единицы измерения
    group?: string;         // Группа (Report, UDA, etc.)
}
```

### ModelObject (FilterPanel)
```typescript
interface ModelObject {
    id: string;
    nodeId: string;         // ID для FilteringExtension
    name?: string;
    type?: string;
    properties: Record<string, {
        value: any;
        units?: string;
        group?: string;
    }>;
}
```

---

## Известные ограничения

1. **Фильтрация на фронте:** FilterPanel работает только с данными уже загруженной модели. Для работы с большими объёмами данных нужна интеграция с Backend API.

2. **Токен Speckle:** Hardcoded в коде, нужна настройка через env variables для production.

3. **Размер bundle:** ~4.5MB из-за Speckle Viewer и Three.js. Рекомендуется code-splitting.

---

**Обновлено:** 2026-01-17 12:50  
**Frontend Agent**
