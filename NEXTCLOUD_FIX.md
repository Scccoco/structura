# Исправление проблемы 404 для Nextcloud

## Проблема
При обращении к http://localhost/nextcloud получается ошибка 404.

## Решение

Конфигурация обновлена. Выполните:

```cmd
.\fix-nextcloud.bat
```

Или вручную:

```powershell
cd docker
docker compose restart traefik nextcloud
```

## Альтернативное решение

Если проблема сохраняется, попробуйте:

1. **Проверьте логи Nextcloud:**
   ```powershell
   cd docker
   docker compose logs nextcloud
   ```

2. **Проверьте, что Nextcloud запущен:**
   ```powershell
   docker compose ps nextcloud
   ```

3. **Попробуйте прямой доступ (для проверки):**
   - Откройте http://localhost:8080 (Traefik Dashboard)
   - Проверьте, что Nextcloud зарегистрирован

4. **Если Nextcloud еще не инициализирован:**
   - Подождите 1-2 минуты после запуска
   - Nextcloud может требовать первоначальной настройки

## Если ничего не помогает

Попробуйте пересоздать контейнер Nextcloud:

```powershell
cd docker
docker compose stop nextcloud
docker compose rm -f nextcloud
docker compose up -d nextcloud
```

Затем проверьте логи и подождите полной инициализации.

