# Краткая Справка: Решение Проблем Speckle

**Для быстрого поиска решений**

---

## Проблема: "Cannot GET /authn/login"

**Решение:**
1. Добавить в `docker-compose.prod.yml`:
   ```yaml
   - "traefik.http.routers.speckle-api-secure.middlewares=speckle-headers"
   - "traefik.http.middlewares.speckle-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
   ```

2. Изменить PathPrefix:
   ```yaml
   PathPrefix(`/auth/`)  # Было /auth
   ```

---

## Проблема: 403 Forbidden при загрузке IFC

**Решение:**
Закомментировать в `docker-compose.prod.yml`:
```yaml
# DISABLE_WORKSPACES=true
```

---

## Проблема: Сервер падает при загрузке больших файлов

**Решение:**
Добавить в `docker-compose.prod.yml` для `speckle-fileimport`:
```yaml
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
deploy:
  resources:
    limits:
      memory: 6G
      cpus: '2.0'
    reservations:
      memory: 1G
```

---

## Проблема: ChannelClosedException для больших моделей

**Решение:**
Использовать Tekla Connector вместо веб-загрузки:
1. Server URL: `https://speckle.structura-most.ru`
2. Legacy Sign In
3. Token: `b47015ff123fc23131070342b14043c1b8a657dfb7`

**Альтернатива:**
- Разделить IFC на части (~30 MB каждая)
- Использовать IFC 2x3 вместо IFC4

---

## Процесс Деплоя

```bash
# Локально
git add .
git commit -m "fix: описание"
git push origin main

# На VPS
cd /root/structura
git pull
./update_server.sh
```

---

## Проверка Статуса

```bash
# Контейнеры
docker ps

# Логи
docker logs speckle-fileimport --tail 50
docker logs speckle-server --tail 50

# Ресурсы
docker stats --no-stream

# Память сервера
free -h
```

---

## Важные Файлы

- Конфигурация: `docker/docker-compose.prod.yml`
- Переменные: `.env`
- Credentials: `CREDENTIALS.md`
- Полный отчет: `docs/reports/2026-01-13_speckle_fixes_report.md`

---

## Контакты

- SSH: `ssh root@109.73.194.38`
- Speckle: https://speckle.structura-most.ru
- Pass (VPS): `r51Gy-Hu_axM,c`
