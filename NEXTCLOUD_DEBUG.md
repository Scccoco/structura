# Отладка проблемы 404 с Nextcloud

## Что было исправлено

1. ✅ Добавлен `OVERWRITEWEBROOT=/nextcloud` в переменные окружения
2. ✅ Добавлен `forceSlash: true` в Traefik middleware
3. ✅ Обновлен healthcheck

## Шаги для исправления

### 1. Перезапустите контейнеры

```cmd
.\restart-nextcloud.bat
```

Или вручную:
```powershell
cd docker
docker compose stop nextcloud traefik
docker compose rm -f nextcloud traefik
docker compose up -d nextcloud traefik
```

### 2. Проверьте логи

```powershell
cd docker
docker compose logs -f nextcloud
```

Ищите ошибки или сообщения о инициализации.

### 3. Проверьте статус

```powershell
docker compose ps nextcloud traefik
```

Оба должны быть "Up" или "Up (healthy)".

### 4. Проверьте доступность

- http://localhost/nextcloud
- http://localhost:8080 (Traefik Dashboard - проверьте, что Nextcloud зарегистрирован)

## Альтернативное решение

Если проблема сохраняется, попробуйте использовать прямой доступ к Nextcloud (временно):

1. Добавьте порт в docker-compose.yml:
   ```yaml
   ports:
     - "8081:80"
   ```

2. Откройте http://localhost:8081 - должен открыться Nextcloud

3. Если работает - проблема в Traefik маршрутизации
4. Если не работает - проблема в самом Nextcloud

## Проверка конфигурации Nextcloud

Если Nextcloud уже инициализирован, проверьте config.php:

```powershell
docker exec nextcloud cat /var/www/html/config/config.php
```

Должно быть:
```php
'overwritewebroot' => '/nextcloud',
'overwritehost' => 'localhost',
'overwriteprotocol' => 'http',
```

## Если ничего не помогает

1. Удалите данные Nextcloud (осторожно!):
   ```powershell
   # ОСТОРОЖНО: Это удалит все данные Nextcloud!
   Remove-Item -Recurse -Force data\nextcloud\*
   ```

2. Пересоздайте контейнер:
   ```powershell
   cd docker
   docker compose up -d --force-recreate nextcloud
   ```

3. Подождите 2-3 минуты для инициализации
4. Откройте http://localhost/nextcloud

