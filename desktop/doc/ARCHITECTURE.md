# Structura Desktop — Финальная Архитектура

> **Статус:** Согласовано  
> **Дата:** 2026-01-28

---

## 1. Общая картина

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ВАШ СЕРВЕР (structura-most.ru)                          │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐         │
│   │ Speckle  │   │ Frontend │   │ Backend  │   │ PostgreSQL       │         │
│   │ Server   │   │ (Web)    │   │ API      │   │ (structura DB)   │         │
│   └──────────┘   └──────────┘   └──────────┘   └──────────────────┘         │
│                              ▲                                               │
│                              │ Интернет (только у админа)                    │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────────────┐
│          СЕТЕВАЯ ПАПКА \\server\share\Structura\                             │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐   │
│   │ releases/       │   │ model-cache/    │   │ sync/                   │   │
│   │ (версии EXE)    │   │ (кэш моделей)   │   │ ├─ events.jsonl         │   │
│   │                 │   │                 │   │ └─ snapshots/           │   │
│   └─────────────────┘   └─────────────────┘   └─────────────────────────┘   │
│                                                                              │
│   ┌─────────────────┐                                                        │
│   │ locks/          │  ← Lock-файлы для блокировки модулей                   │
│   └─────────────────┘                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼────┐            ┌────▼────┐            ┌────▼────┐
   │ Юзер 1  │            │ Юзер 2  │            │  Админ  │
   │ (нет🌐) │            │ (нет🌐) │            │ (есть🌐)│
   │         │            │         │            │         │
   │ Локальная│            │ Локальная│            │ Локальная│
   │ SQLite   │            │ SQLite   │            │ SQLite   │
   └─────────┘            └─────────┘            └─────────┘
```

---

## 2. Ключевые решения

### 2.1 Архитектура данных (Вариант A1)

| Компонент | Где хранится | Зачем |
|-----------|--------------|-------|
| **Локальная БД** | `%LOCALAPPDATA%\Structura\data\structura.db` | Быстрый доступ, нет риска повреждения |
| **Event log** | `\\server\share\Structura\sync\events\events-<user>.jsonl` | Per-user файлы для надёжной записи |
| **Snapshots** | `\\server\share\Structura\sync\snapshots\*.zip` | Быстрый старт (ZIP + manifest) |
| **Model cache** | `\\server\share\Structura\model-cache\` | Общий кэш 3D моделей |
| **Locks** | `\\server\share\Structura\locks\` | Блокировка модулей (rename-трюк) |

**Почему не один SQLite на шаре:**
- SQLite + SMB = нестабильность, риск повреждения
- Нет доступа к системщикам для настройки
- Локальная БД + событийная синхронизация = надёжно

### 2.2 Запуск без установки (Launcher)

```
\\server\share\Structura\
├── StructuraLauncher.exe        ← Пользователь запускает это
├── releases/
│   ├── 1.0.0/                   ← Папка с EXE версии 1.0.0
│   ├── 1.0.1/
│   └── 1.0.2/                   ← Последняя версия
└── current_version.txt          ← Указатель на актуальную версию

%LOCALAPPDATA%\Structura\
├── app/
│   └── 1.0.2/                   ← Скопированное приложение
│       └── Structura.exe
├── data/
│   └── structura.db             ← Локальная БД пользователя
└── update.lock                  ← Блокировка на время обновления
```

**Как работает:**
1. Пользователь запускает `StructuraLauncher.exe`
2. Launcher читает `current_version.txt`
3. Проверяет `update.lock` — если занят, ждёт (retry с таймаутом)
4. Копирует нужную версию в **новую папку** `%LOCALAPPDATA%\app\<version>/`
5. Только после полного копирования обновляет `local_version.txt`
6. Запускает `Structura.exe`

**Атомарность обновления:**
```
1. Создать update.lock (exclusive mode)
2. Скопировать releases/1.0.3/ → app/1.0.3.tmp/
3. Переименовать app/1.0.3.tmp/ → app/1.0.3/
4. Записать "1.0.3" в local_version.txt
5. Удалить update.lock
6. (Опционально) Удалить старые версии app/1.0.0/, app/1.0.1/
```

**Защита от гонок:**
```typescript
// Launcher update logic
async function acquireUpdateLock(): Promise<boolean> {
    const lockPath = path.join(LOCAL_DATA, 'update.lock');
    const maxRetries = 5;
    const retryDelay = 2000; // 2 сек
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            // Exclusive create — если файл есть, будет ошибка
            fs.writeFileSync(lockPath, process.pid.toString(), { flag: 'wx' });
            return true;
        } catch (e) {
            // Файл занят — проверить возраст
            const stat = fs.statSync(lockPath);
            const ageMs = Date.now() - stat.mtimeMs;
            if (ageMs > 5 * 60 * 1000) { // Протух (5 мин)
                fs.unlinkSync(lockPath);
                continue;
            }
            await sleep(retryDelay);
        }
    }
    return false; // Не удалось получить lock
}
```

**Обновление админом:**
- Кладёт новую папку в `releases/1.0.3/`
- Обновляет `current_version.txt`
- При следующем запуске launcher видит новую версию и копирует

**Преимущества:**
- Не нужны права админа
- EXE не запускается с шары → нет блокировок
- Атомарное обновление — нет "полусобранных" состояний
- Защита от параллельного обновления

### 2.3 Блокировка модулей (Lock-файлы)

```
\\server\share\Structura\locks\
├── module_vedomost1.lock.json
├── module_vedomost2.lock.json
├── module_aid.lock.json
└── admin.lock.json              ← Если есть — всё read-only (приоритет!)
```

**Формат lock-файла:**
```json
{
    "locked_by": "ivanov",
    "locked_at": "2026-01-28T14:30:00Z",
    "heartbeat": "2026-01-28T14:35:00Z",
    "module": "vedomost1"
}
```

**Атомарное создание lock (rename-трюк):**
```typescript
async function acquireModuleLock(module: string, user: string): Promise<boolean> {
    const locksDir = '\\\\server\\share\\Structura\\locks';
    const lockFile = path.join(locksDir, `module_${module}.lock.json`);
    const tmpFile = path.join(locksDir, `module_${module}.lock.tmp.${user}`);
    
    // 1. Проверить admin.lock — если есть, сразу read-only
    if (fs.existsSync(path.join(locksDir, 'admin.lock.json'))) {
        return false; // Админ заблокировал всё
    }
    
    // 2. Проверить существующий lock
    if (fs.existsSync(lockFile)) {
        const existing = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
        const heartbeatAge = Date.now() - new Date(existing.heartbeat).getTime();
        const GRACE_WINDOW = 90 * 1000; // 90 сек grace
        
        if (heartbeatAge < GRACE_WINDOW) {
            // Lock активен
            return false;
        }
        // Lock протух — удаляем
        fs.unlinkSync(lockFile);
    }
    
    // 3. Записать временный файл
    const lockData = {
        locked_by: user,
        locked_at: new Date().toISOString(),
        heartbeat: new Date().toISOString(),
        module: module
    };
    fs.writeFileSync(tmpFile, JSON.stringify(lockData));
    
    // 4. Атомарный rename
    try {
        fs.renameSync(tmpFile, lockFile);
        return true;
    } catch (e) {
        // Кто-то опередил
        fs.unlinkSync(tmpFile);
        return false;
    }
}
```

**Логика:**
1. При входе в модуль → сначала проверить `admin.lock.json`
2. Если admin lock есть → **всё read-only**, даже если модуль был занят
3. Проверить lock-файл модуля
4. Если heartbeat < 90 сек назад → "Модуль занят: Иванов"
5. Если heartbeat протух → можно забрать (удалить и создать свой)
6. Создание через rename-трюк (атомарно)
7. Обновлять heartbeat каждые 15-20 сек
8. При выходе → удалить lock-файл

**Админская блокировка (приоритет над всем):**
- Админ создаёт `admin.lock.json`
- **Все модули сразу переходят в read-only**, даже если были заняты
- Пользователи видят уведомление "Система заблокирована админом"
- После синхронизации админ удаляет `admin.lock.json`

---

## 3. Speckle Offline — План изысканий

### 3.1 Контекст

**Факты из документации Speckle:**
- Viewer загружает данные через абстракцию `Loader`
- Можно написать свой loader для любого источника
- `@speckle/objectloader` — утилита для скачивания объектов и подкомпонентов
- Нет встроенного offline режима, но архитектура позволяет

**Целевая модель:** ~200 MB

### 3.2 Этапы POC

#### Этап A: Инвентаризация (30 мин)

**Цель:** Зафиксировать тестовую модель

**Результат:**
- `streamId`: _______
- `commitId`: _______
- `referencedObject`: _______

---

#### Этап B: Cache Fetcher (1-2 часа)

**Цель:** Научиться скачивать модель в папку

**Важно: Per-Object кэширование**
- НЕ складывать всё в один `objects.json`
- 200 MB модель → 400-800 MB JSON → UI зависнет при чтении
- Кэшировать по объектам для стриминга

**Структура кэша:**
```
model-cache/<streamId>/<commitId>/
├── manifest.json              # Метаданные + список objectId
└── objects/
    ├── <objectId1>.json
    ├── <objectId2>.json
    └── ...
```

**Сравнение ObjectLoader:**
| Пакет | Описание | Статус |
|--------|----------|--------|
| `@speckle/objectloader` | Утилита для стриминга объектов | Стабильный |
| `@speckle/objectloader2` | Обновлённый для viewer | Активно разрабатывается |

В POC сравнить оба, начать с того что проще интегрируется.

**Реализация:**
```typescript
// electron/services/model-cache.ts
import { ObjectLoader } from '@speckle/objectloader';

async function cacheModel(streamId: string, commitId: string, token: string) {
    const serverUrl = 'https://speckle.structura-most.ru';
    const cachePath = `\\\\server\\share\\Structura\\model-cache\\${streamId}\\${commitId}`;
    const objectsDir = path.join(cachePath, 'objects');
    
    fs.mkdirSync(objectsDir, { recursive: true });
    
    const objectId = await getReferencedObject(streamId, commitId, token);
    
    const loader = new ObjectLoader({
        serverUrl,
        streamId,
        objectId,
        token,
    });
    
    const objectIds: string[] = [];
    let count = 0;
    let totalSize = 0;
    
    // Per-object сохранение
    for await (const obj of loader.getObjectIterator()) {
        const objJson = JSON.stringify(obj);
        const objPath = path.join(objectsDir, `${obj.id}.json`);
        fs.writeFileSync(objPath, objJson);
        
        objectIds.push(obj.id);
        totalSize += Buffer.byteLength(objJson);
        count++;
        
        if (count % 100 === 0) {
            console.log(`Downloaded ${count} objects (${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
        }
    }
    
    // Manifest с метаданными
    fs.writeFileSync(path.join(cachePath, 'manifest.json'), JSON.stringify({
        streamId,
        commitId,
        rootObjectId: objectId,
        objectIds,
        objectCount: count,
        totalSizeBytes: totalSize,
        cachedAt: new Date().toISOString()
    }));
    
    console.log(`✅ Модель сохранена: ${count} объектов, ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
}
```

**Критерий успеха:**
- Каждый объект в отдельном файле
- `manifest.json` содержит список objectIds
- Можно стримить при чтении

---

#### Этап C: Custom Loader (1-2 дня)

**Цель:** Viewer открывает модель из кэша

**Два пути:**

| Путь | Описание | Когда выбрать |
|------|----------|---------------|
| **Custom Loader** | Пишем свой Loader по API Speckle | Правильный путь, соответствует архитектуре |
| **Proxy на localhost** | Express отдаёт данные как Speckle API | Быстрый тест, если URL мало |

**Custom Loader (скелет):**
```typescript
// src/lib/LocalCacheLoader.ts
import { Loader, WorldTree, NodeData } from '@speckle/viewer';

export class LocalCacheLoader extends Loader {
    private cachePath: string;
    private worldTree: WorldTree;
    
    constructor(worldTree: WorldTree, cachePath: string) {
        super();
        this.worldTree = worldTree;
        this.cachePath = cachePath;
    }
    
    async load(): Promise<void> {
        const objectsPath = path.join(this.cachePath, 'objects.json');
        const data = JSON.parse(fs.readFileSync(objectsPath, 'utf-8'));
        
        // Заполнить WorldTree из кэша
        for (const [id, obj] of Object.entries(data)) {
            // Преобразовать в TreeNode и добавить в WorldTree
            this.worldTree.addNode(this.convertToNode(obj));
        }
        
        // Построить RenderTree
        // ...
    }
    
    cancel(): void { /* ... */ }
    dispose(): void { /* ... */ }
    
    private convertToNode(obj: any): NodeData {
        // Конвертация Speckle объекта в формат WorldTree
        // ...
    }
}
```

**Proxy тест (для сравнения):**
```typescript
// Сначала логируем какие URL запрашивает SpeckleLoader
// Включаем DevTools Network tab при загрузке модели
// Если URL мало (1-3) → proxy реально
// Если много GraphQL/metadata → custom loader лучше
```

**Критерий успеха:**
- Отключаем интернет
- Viewer показывает геометрию
- Дерево объектов работает (базово)

---

#### Этап D: Доведение до боевого состояния (2-5 дней)

**После POC:**
- Версионирование кэша по commitId
- Индикатор "кэш устарел"
- Отчёт по размеру кэша
- Чистка старых версий
- Обработка сложных случаев (instancing, chunks)

---

## 4. Структура сетевой папки

```
\\server\share\Structura\
├── StructuraLauncher.exe
├── current_version.txt                    # "1.0.2"
│
├── releases/
│   ├── 1.0.0/
│   │   └── Structura.exe
│   ├── 1.0.1/
│   └── 1.0.2/
│       └── Structura.exe
│
├── model-cache/
│   └── <streamId>/
│       └── <commitId>/
│           ├── objects.json               # Все объекты
│           └── manifest.json              # Метаданные
│
├── sync/
│   ├── events/                            # Per-user event files
│   │   ├── events-ivanov.jsonl
│   │   ├── events-petrov.jsonl
│   │   └── events-admin.jsonl
│   └── snapshots/
│       ├── snapshot-20260128-143000.zip   # ZIP (db + manifest)
│       └── latest.txt                     # Указатель
│
└── locks/
    ├── module_vedomost1.lock.json
    ├── module_vedomost2.lock.json
    ├── module_aid.lock.json
    └── admin.lock.json                    # Приоритет над всем
```

---

## 5. Event Log формат (Per-User Files)

**Почему не один файл:**
- Параллельная запись в один файл на SMB → смешанные строки, частичные JSON
- Буферизация SMB может испортить данные

**Решение: каждый клиент пишет в свой файл**

```
\\server\share\Structura\sync\events\
├── events-ivanov.jsonl          ← Только Иванов пишет сюда
├── events-petrov.jsonl          ← Только Петров пишет сюда
└── events-admin.jsonl           ← Только админ пишет сюда
```

**Формат события:**
```json
{"ts":"2026-01-28T14:30:00.123Z","seq":1,"user":"ivanov","action":"update","table":"elements","id":"abc123","data":{...}}
```
- `ts` — timestamp с миллисекундами
- `seq` — локальный sequence number (для порядка внутри одного пользователя)
- `user` — кто сделал изменение

**Чтение и применение:**
```typescript
async function syncFromEventLog(lastSyncTs: string): Promise<void> {
    const eventsDir = '\\\\server\\share\\Structura\\sync\\events';
    const allEvents: Event[] = [];
    
    // 1. Прочитать ВСЕ файлы events-*.jsonl
    for (const file of fs.readdirSync(eventsDir)) {
        if (!file.startsWith('events-') || !file.endsWith('.jsonl')) continue;
        
        const lines = fs.readFileSync(path.join(eventsDir, file), 'utf-8').split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);
            if (event.ts > lastSyncTs) {
                allEvents.push(event);
            }
        }
    }
    
    // 2. Сортировать по ts, потом по seq
    allEvents.sort((a, b) => {
        const tsCmp = a.ts.localeCompare(b.ts);
        if (tsCmp !== 0) return tsCmp;
        return a.seq - b.seq;
    });
    
    // 3. Применить к локальной SQLite
    for (const event of allEvents) {
        applyEvent(event);
    }
    
    // 4. Обновить lastSyncTs
    updateLastSyncTs(allEvents[allEvents.length - 1]?.ts || lastSyncTs);
}
```

**Запись:**
```typescript
function appendEvent(event: Partial<Event>): void {
    const eventsDir = '\\\\server\\share\\Structura\\sync\\events';
    const myFile = path.join(eventsDir, `events-${currentUser}.jsonl`);
    
    const fullEvent = {
        ts: new Date().toISOString(),
        seq: getNextSeq(),
        user: currentUser,
        ...event
    };
    
    fs.appendFileSync(myFile, JSON.stringify(fullEvent) + '\n');
}
```

**Синхронизация:**
1. При изменении данных → append в `events-<user>.jsonl`
2. При старте приложения → прочитать ВСЕ файлы, отфильтровать новые события
3. Сортировать по ts+seq и применить к локальной SQLite

---

## 5.1 Snapshots

**Зачем:** Быстрый старт для нового пользователя (не читать весь event log)

```
\\server\share\Structura\sync\snapshots\
├── snapshot-20260128-143000.zip
│   ├── structura.db             ← SQLite база
│   └── manifest.json            ← Метаданные
└── latest.txt                   ← Указатель на последний snapshot
```

**manifest.json:**
```json
{
    "created_at": "2026-01-28T14:30:00Z",
    "created_by": "admin",
    "last_event_ts": "2026-01-28T14:29:55.123Z",
    "db_size_bytes": 1234567,
    "events_applied": 4523
}
```

**Использование:**
1. Новый пользователь → скачать последний snapshot
2. Распаковать в `%LOCALAPPDATA%\Structura\data\`
3. Прочитать события после `last_event_ts`
4. Применить к локальной БД

**Создание snapshot (админ):**
```typescript
async function createSnapshot(): Promise<void> {
    const snapshotsDir = '\\\\server\\share\\Structura\\sync\\snapshots';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipName = `snapshot-${timestamp}.zip`;
    
    // 1. Получить текущее состояние event log
    const lastEventTs = getLastEventTs();
    
    // 2. Создать ZIP с БД и manifest
    const zip = new AdmZip();
    zip.addLocalFile(path.join(LOCAL_DATA, 'structura.db'));
    zip.addFile('manifest.json', Buffer.from(JSON.stringify({
        created_at: new Date().toISOString(),
        created_by: currentUser,
        last_event_ts: lastEventTs,
        // ...
    })));
    
    // 3. Сохранить
    zip.writeZip(path.join(snapshotsDir, zipName));
    
    // 4. Обновить latest.txt
    fs.writeFileSync(path.join(snapshotsDir, 'latest.txt'), zipName);
}

---

## 6. Локальная БД (better-sqlite3)

**Путь:** `%LOCALAPPDATA%\Structura\data\structura.db`

```sql
-- Пользователи (локальный кэш)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT,
    role TEXT CHECK(role IN ('user', 'admin'))
);

-- Проекты
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    speckle_stream_id TEXT,
    name TEXT,
    current_commit_id TEXT,
    last_synced_at DATETIME
);

-- Элементы модели
CREATE TABLE elements (
    guid TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT,
    status TEXT,
    assigned_module TEXT,
    modified_by TEXT,
    modified_at DATETIME,
    local_version INTEGER DEFAULT 0
);

-- Акты
CREATE TABLE acts (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT,
    pdf_path TEXT,
    created_by TEXT,
    created_at DATETIME
);

-- Связи элемент-акт
CREATE TABLE element_acts (
    element_guid TEXT,
    act_id TEXT,
    linked_by TEXT,
    linked_at DATETIME,
    PRIMARY KEY (element_guid, act_id)
);

-- Лог синхронизации
CREATE TABLE sync_state (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    last_event_ts TEXT,
    last_sync_at DATETIME
);
```

---

## 6.1 Сборка Native Модулей (better-sqlite3 + Electron)

**Проблема:**
- `better-sqlite3` — нативный модуль (C++ биндинги к SQLite)
- Бинарь привязан к версии Electron, Node ABI, архитектуре
- Electron 40 = Node 22.x ABI → нужен rebuild

**Решение:**

```json
// package.json (electron-builder config)
{
  "build": {
    "npmRebuild": true
  }
}
```

**Или явно при сборке:**
```bash
npx electron-builder install-app-deps
```

**Что происходит:**
1. Скачиваются заголовки Electron 40
2. `better-sqlite3` пересобирается под нужный ABI
3. Бинарь упаковывается в portable-версию

**Важно:**
- ✅ Rebuild происходит на машине разработчика/CI
- ✅ Пользователям admin-права НЕ нужны
- ✅ Это стандартная практика для 90% Electron-приложений с native модулями

---

## 6.2 Разрешение конфликтов данных

**Проблема:**
- Блокировки модулей защищают от одновременного редактирования
- Но разные модули могут редактировать связанные данные:
  - Пользователь 1: изменил статус элемента
  - Пользователь 2: привязал акт к этому же элементу

**Решение: Разделение по модулям**

| Модуль | Таблицы/поля которые редактирует |
|--------|----------------------------------|
| **Ведомость 1** | `elements.status`, `elements.data_vedomost1` |
| **Ведомость 2** | `elements.data_vedomost2` |
| **АИД** | `elements.aid_status`, `element_acts.*` |
| **Акты** | `acts.*` |

**Принцип:** Каждый модуль редактирует только свои поля.

**Conflict Resolver (fallback):**

Если пересечения всё же возможны — **last write wins** с логом:

```typescript
function applyEvent(event: Event): void {
    const existingTs = db.prepare('SELECT modified_at FROM elements WHERE guid = ?')
        .get(event.id)?.modified_at;
    
    if (existingTs && existingTs > event.ts) {
        // Конфликт: локальные данные новее
        logConflict({
            table: event.table,
            id: event.id,
            localTs: existingTs,
            eventTs: event.ts,
            eventUser: event.user,
            resolution: 'skipped (local is newer)'
        });
        return;
    }
    
    // Применить изменение
    applyChange(event);
}
```

**Лог конфликтов:**
```sql
CREATE TABLE conflict_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    table_name TEXT,
    record_id TEXT,
    local_ts TEXT,
    event_ts TEXT,
    event_user TEXT,
    resolution TEXT
);
```

**Важно:**
- Конфликты должны быть редкими (если правильно разделены модули)
- Лог конфликтов для диагностики
- Админ может просмотреть и вручную исправить если нужно

---

## 7. Задачи для реализации

### Задача 1: Launcher
```
Создать StructuraLauncher.exe:
- Читает current_version.txt из сетевой папки
- Проверяет update.lock (exclusive mode, retry с таймаутом)
- Атомарное копирование: → tmp → rename
- Записывает local_version.txt только после успешного копирования
- Запускает Structura.exe
- Показывает прогресс при обновлении
- Удаляет старые версии (опционально)
```

### Задача 2: Cache Fetcher (Админ)
```
В Electron main сделать команду CacheModel(streamId, commitId):
- Получает referencedObject id через GraphQL
- Через @speckle/objectloader скачивает все объекты
- Пишет в model-cache/<streamId>/<commitId>/
- Пишет manifest.json (размер, дата, количество объектов)
- Логирует прогресс и ошибки
```

### Задача 3: Custom Loader для Viewer
```
Реализовать класс LocalCacheLoader:
- Extends Loader из @speckle/viewer
- Читает данные из model-cache/
- Заполняет WorldTree
- Минимальная цель: геометрия отображается offline
- Если кэша нет → понятная ошибка
```

### Задача 4: Proxy Feasibility Test
```
Записать список URL которые дергает SpeckleLoader:
- Включить DevTools Network при загрузке модели
- Список всех запросов к Speckle серверу
- Оценить сколько нужно эмулировать
- Вывод: proxy проще или custom loader
```

### Задача 5: Lock-файлы
```
Реализовать блокировку модулей:
- Атомарное создание через rename-трюк (tmp → rename)
- Heartbeat каждые 15-20 сек
- Grace window 90 сек (защита от лага сети)
- При выходе → удалить
- admin.lock.json → приоритет над всем (все read-only)
```

### Задача 6: Event Log синхронизация (Per-User Files)
```
- Каждый пользователь пишет в свой events-<user>.jsonl
- При старте → прочитать ВСЕ файлы events-*.jsonl
- Сортировать по ts + seq
- Применить к локальной SQLite
- Snapshot как ZIP (db + manifest) для быстрого старта
```

---

## 8. План реализации

| Этап | Задачи | Время |
|------|--------|-------|
| **1. Инфраструктура** | Launcher, структура папок | 1 день |
| **2. Speckle POC** | Cache Fetcher, Custom Loader / Proxy test | 2-3 дня |
| **3. Локальная БД** | Schema, CRUD, better-sqlite3 | 1 день |
| **4. Синхронизация** | Event log, snapshot, apply | 2 дня |
| **5. Блокировки** | Lock-файлы, heartbeat | 0.5 дня |
| **6. Миграция UI** | FullViewer + panels из старого проекта | 1-2 дня |
| **7. Интеграция** | Соединить всё вместе | 1-2 дня |
| **8. Тестирование** | 2 пользователя, offline, locks | 1 день |

**Итого:** 10-13 дней

---

## 9. Миграция из текущего проекта

### Компоненты для переноса

| Компонент | Путь | Строк |
|-----------|------|-------|
| FullViewer | `src/components/FullViewer/FullViewer.tsx` | ~1000 |
| ViewerToolbar | `src/components/FullViewer/panels/ViewerToolbar.tsx` | ~100 |
| MeasurementsPanel | `panels/MeasurementsPanel.tsx` | ~200 |
| FilterPanel | `panels/FilterPanel.tsx` | ~500 |
| SceneExplorerPanel | `panels/SceneExplorerPanel.tsx` | ~400 |
| ModelsPanel | `panels/ModelsPanel.tsx` | ~400 |
| SelectInfoPanel | `panels/SelectInfoPanel.tsx` | ~700 |

### Что адаптировать при миграции

1. **SpeckleLoader → LocalCacheLoader** (для offline)
2. Убрать прямые обращения к серверу из UI
3. Добавить проверку блокировок перед редактированием
4. Подключить локальную SQLite вместо server API

---

## 10. Подтверждение

**Зафиксированные решения:**

- ✅ Локальная SQLite у каждого + общий event log (вариант A1)
- ✅ Launcher для обновлений без установки
- ✅ Lock-файлы для блокировки модулей
- ✅ Custom Loader для Speckle offline (основной путь)
- ✅ Proxy как backup вариант для теста
- ✅ Модель ~200 MB

**Готов к началу реализации.**
