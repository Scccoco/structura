# Текущее состояние системы (Handover State)
*Дата обновления: 13.01.2026*

Этот документ описывает техническое состояние проекта Structura на момент закрытия сессии "Architect-1". Он предназначен для быстрой погрузки нового контекста AI.

## 1. Архитектура и Стек

Проект полностью переведен на стек **Speckle + Refine + Nextcloud**.
Старые компоненты (BIMserver, Xeokit) **полностью удалены**.

### Сервисы (Docker)
1.  **Frontend (Refine)**:
    *   URL: `https://app.structura-most.ru`
    *   Код: `c:\structura\frontend`
    *   Сборка: `Dockerfile` (multistage: node build -> nginx)
    *   Прокси: Traefik (метки в `docker-compose.prod.yml`)
2.  **BIM Server (Speckle)**:
    *   URL: `https://speckle.structura-most.ru`
    *   Frontend: `:8080`, Backend: `:3000`
    *   Зависимости: Postgres, Redis, MinIO.
3.  **Файловое хранилище (Nextcloud)**:
    *   URL: `https://cloud.structura-most.ru`
    *   Зависимости: Postgres (отдельная), Redis.
4.  **Database (PostgreSQL)**:
    *   Сервис `postgres_speckle`: Хранит базы `speckle` (ядро) и `structura` (бизнес-логика).
5.  **API (PostgREST)**:
    *   Сервис `postgrest` (в `docker-compose.structura.yml` - *нужно проверить деплой!*)
    *   Роль: Проксирование REST запросов от Frontend к базе `structura`.

## 2. Статус Деплоя (VPS)

Сервер (`109.73.194.38`) обновлен и работает stable.

*   **Конфигурация**: `c:\structura\docker\docker-compose.prod.yml`
*   **Скрипт обновления**: `c:\structura\update_server.sh` (в корне сервера `/root/structura`)
*   **DNS**: Все поддомены настроены (`app`, `speckle`, `cloud`, `s3`).

## 3. Известные особенности и долги

### Frontend
*   **Сборка**: Исправлены ошибки TypeScript (`Input` unused, `environmentSrc`). Сейчас билд проходит.
*   **Viewer**: Используется `@speckle/viewer`. Базовая загрузка работает.
*   **CORS**: Требует внимания, если запросы идут напрямую с фронта на адаптер (пока адаптер не в проде).

### Backend (Speckle Adapter)
*   **Статус**: Код написан (`backend/speckle_adapter`), но сервис **не добавлен** в `docker-compose.prod.yml`.
*   **Задача**: Нужно добавить сервис адаптера в прод, чтобы работал Sync элементов.

### База Данных
*   **Схема**: Таблицы созданы.
*   **View**: `public.elements` вид и триггер обновлены для поддержки апдейтов через PostgREST.

## 4. Следующие шаги (Roadmap)

1.  **Интеграция Адаптера**:
    *   Добавить `speckle-adapter` в `docker-compose.prod.yml`.
    *   Настроить для него Traefik (внутренний или внешний роут).
2.  **Бизнес-логика**:
    *   Связать Frontend -> PostgREST -> DB на проде (проверить доступы).
3.  **Пользователи**:
    *   Настроить Auth (Supabase или Keycloak) или доделать интеграцию Speckle Auth.
