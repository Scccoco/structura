# Инструкция по установке и настройке

## Шаг 1: Системные требования

### Windows / Linux / Mac
- ✅ **Docker Desktop** (Windows/Mac) или **Docker Engine** (Linux)
- ✅ Минимум **4 GB RAM** (рекомендуется 8 GB)
- ✅ **15 GB** свободного места на диске
- ✅ Свободные порты: `80`, `443`, `3000` (Speckle), `3001` (API), `3002` (Grafana), `5173` (Frontend Dev), `5432` (Postgres), `9000` (MinIO/Portainer)

---

## Шаг 2: Настройка окружения (.env)

1. Создайте файл `.env` в корневой папке `docker/`, скопировав `.env.example`.
2. Настройте основные пароли (для продакшена обязательно смените!):

```env
# PostgreSQL
POSTGRES_SPECKLE_PASSWORD=speckle_pass
POSTGRES_NC_PASSWORD=nextcloud_pass

# Redis
REDIS_PASSWORD=redis_pass

# Nextcloud
NEXTCLOUD_ADMIN_PASSWORD=admin
NEXTCLOUD_ADMIN_USER=admin

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

---

## Шаг 3: Запуск (Docker Compose)

Мы используем `docker-compose` напрямую для прозрачности.

### Локальная разработка (Windows/Mac)
В этом режиме Frontend запускается отдельно (через `npm run dev`), а бэкенд в Docker.

```powershell
# 1. Запуск инфраструктуры
cd c:\structura\docker
docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d

# 2. Запуск фронтенда
cd c:\structura\frontend
npm install
npm run dev
```

### Сервер (VPS / Production)
В этом режиме всё работает в Docker, Traefik управляет маршрутизацией и SSL.

```bash
cd /root/structura/docker
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d
```

---

## Шаг 4: Первоначальная инициализация

### 1. Nextcloud (Файлы)
*Цель: Подключить файловое хранилище к базе данных.*

1. Откройте `http://localhost:8081` (Local) или `https://cloud.structura-most.ru` (Prod).
2. Создайте админа.
3. **БД**: Выберите PostgreSQL.
   - Хост: `postgres_nc`
   - Пользователь: `nextcloud`
   - Пароль: `nextcloud_pass`
   - Имя БД: `nextcloud`

### 2. Speckle Server (BIM)
*Цель: Создать сервер для хранения моделей.*

1. Откройте `http://localhost:3000` (Local) или `https://speckle.structura-most.ru` (Prod).
2. Зарегистрируйте первую учетную запись (она станет Server Admin).
3. Создайте первый "Stream" (Проект).

### 3. Refine (Frontend)
*Цель: Проверить работу интерфейса.*

1. Откройте `http://localhost:5173` (Local).
2. Попробуйте войти (если настроена авторизация) или перейдите в раздел "Элементы".
3. Данные должны подгружаться из PostgREST (`http://localhost:3001`).

---

## Шаг 5: Решение проблем

Если контейнеры падают или не запускаются:

1. **Проверьте логи**:
   ```bash
   docker logs nextcloud
   docker logs speckle-server
   ```
2. **Проверьте порты**: Возможно, 80 или 5432 занят другим приложением.
3. **Очистка**:
   ```bash
   docker-compose ... down -v  # Удалит всё, включая базы данных!
   ```
