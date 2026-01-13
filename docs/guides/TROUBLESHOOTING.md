# Устранение неполадок (Troubleshooting)

## 1. Проблемы с Docker контейнерами

### Контейнеры не запускаются или постоянно перезапускаются (Restarting...)
Частая причина: Ошибки конфигурации БД или нехватка ресурсов.

**Диагностика:**
```bash
cd c:\structura\docker
docker ps -a
docker logs speckle-server
docker logs postgres_speckle
```

**Решение:**
1. Если ошибка "Connection refused to postgres": Убедитесь, что `postgres_speckle` Healthy.
2. Если ошибка "Out of memory": Увеличьте лимит RAM в Docker Desktop (минимум 4GB).

---

## 2. Speckle Server

### "Network Error" или не грузится Frontend
1. Проверьте `docker-compose.yml`: Сервис `speckle-frontend` должен быть запущен.
2. Проверьте `SERVER_URL`: В `.env` или конфиге должен быть правильный URL (`http://localhost:3000` или `https://speckle...`).

### Не удается загрузить модель (Stream)
1. Проверьте логи `speckle-server`:
   ```bash
   docker logs speckle-server
   ```
2. Убедитесь, что MinIO доступен (`http://localhost:9000`). Speckle хранит там геометрию.

---

## 3. Nextcloud

### Internal Server Error
1. Проверьте права на папку `data/postgres_nc`.
2. Проверьте логи: `docker logs nextcloud`.
3. Часто бывает при смене пароля БД без обновления конфига Nextcloud.

### Доверенные домены (Trusted Domains)
Если видите экран "Access through untrusted domain":
1. Отредактируйте `config/config.php` внутри контейнера или через volume.
2. Добавьте ваш IP или домен в массив `trusted_domains`.

---

## 4. Refine Frontend (Локальная разработка)

### Ошибка CORS при запросе к API
**Симптомы:** В консоли браузера красные ошибки `Access-Control-Allow-Origin`.

**Решение:**
1. Убедитесь, что PostgREST запущен с правильным `PGRST_OPENAPI_SERVER_PROXY_URI`.
2. Если используете Traefik, убедитесь, что он добавляет заголовки CORS. (В dev-режиме запросы идут напрямую).

### Данные не отображаются (Пустая таблица)
1. Проверьте API: Откройте `http://localhost:3001/elements` в браузере.
2. Если там `[]` (пусто), значит база пуста.
3. Если ошибка, проверьте логи `postgrest`.

---

## 5. Полный сброс (Hard Reset)

Если ничего не помогает и вы готовы потерять все данные (в Dev окружении):

```powershell
# 1. Остановить всё и удалить volumes
cd c:\structura\docker
docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml down -v

# 2. Удалить папку данных (Вручную!)
# rmdir /s /q ..\data  <-- ОСТОРОЖНО!
```
