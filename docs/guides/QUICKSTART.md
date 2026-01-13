# Быстрый старт

## Windows

1. **Предварительно**: Убедитесь, что Docker Desktop запущен.

2. **Запуск стека (Dev режим):**
   ```powershell
   cd c:\structura\docker
   docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d
   ```

3. **Запуск фронтенда (Refine):**
   ```powershell
   cd c:\structura\frontend
   npm run dev
   ```

4. **Доступные адреса:**
   - **Frontend:** http://localhost:5173
   - **Nextcloud:** http://localhost:8081 (или проверьте порт в docker-compose)
   - **Speckle:** http://localhost:3000
   - **API (PostgREST):** http://localhost:3001
   - **Portainer:** http://localhost:9000

## Linux/Mac (VPS)

1. **Запуск (Prod режим):**
   ```bash
   cd /root/structura/docker
   docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d
   ```

2. **Доступные адреса (HTTPS):**
   - **Frontend:** https://app.structura-most.ru
   - **Nextcloud:** https://cloud.structura-most.ru
   - **Speckle:** https://speckle.structura-most.ru
   - **Portainer:** https://port.structura-most.ru

## Остановка

```powershell
# Windows
docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml down
```

```bash
# Linux
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml down
```

## Сброс данных (ВНИМАНИЕ!)

Для полного сброса всех баз данных (PostgreSQL, Nextcloud, Speckle):

```powershell
docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml down -v
# Удалите содержимое папки data вручную, если требуется
```

## Просмотр логов

```bash
docker logs -f speckle-server
docker logs -f nextcloud
docker logs -f postgres_speckle
```
