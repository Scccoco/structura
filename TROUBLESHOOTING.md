# Решение проблем

## Проблема: BIMserver не запускается

### Ошибка: "pull access denied for opensourcebim/bimserver"

**Решение**: Образ BIMserver теперь собирается из Dockerfile. При первом запуске Docker автоматически соберет образ. Это может занять 5-10 минут.

Если сборка не начинается:
```bash
cd docker
docker compose build bimserver
docker compose up -d
```

### Ошибка: "BIMserver не может подключиться к базе данных"

**Решение**:
1. Убедитесь, что PostgreSQL запущен: `docker compose ps postgres_bim`
2. Проверьте логи: `docker compose logs postgres_bim`
3. Проверьте переменные окружения в `.env`
4. Перезапустите BIMserver: `docker compose restart bimserver`

### BIMserver долго запускается

**Нормально**: При первом запуске BIMserver распаковывает WAR-файл и инициализирует базу данных. Это может занять 2-5 минут.

Проверьте логи:
```bash
docker compose logs -f bimserver
```

Вы должны увидеть сообщения о распаковке и инициализации.

## Проблема: Предупреждение о версии в docker-compose.yml

### "the attribute `version` is obsolete"

**Решение**: Это предупреждение можно игнорировать. Версия уже удалена из файла в последних версиях. Если вы видите это предупреждение, обновите файл `docker/docker-compose.yml` - уберите строку `version: '3.8'` в начале файла.

## Проблема: Контейнеры не запускаются

### Проверка статуса
```bash
cd docker
docker compose ps
```

### Просмотр логов всех сервисов
```bash
docker compose logs
```

### Просмотр логов конкретного сервиса
```bash
docker compose logs bimserver
docker compose logs nextcloud
docker compose logs traefik
```

## Проблема: Порты заняты

### Windows
```powershell
netstat -ano | findstr :80
netstat -ano | findstr :443
netstat -ano | findstr :8080
```

Остановите службы, использующие эти порты, или измените порты в `docker-compose.yml`.

### Linux/Mac
```bash
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :8080
```

## Проблема: Недостаточно памяти

### Симптомы
- Контейнеры постоянно перезапускаются
- Ошибки "Out of memory"
- Медленная работа

### Решение
1. Увеличьте лимит памяти Docker Desktop (Settings → Resources → Memory)
2. Рекомендуется минимум 4 GB, лучше 8 GB
3. Уменьшите лимиты памяти для контейнеров в `docker-compose.yml`:
   ```yaml
   environment:
     - JAVA_OPTS=-Xmx1g -Xms512m  # Вместо -Xmx2g
   ```

## Проблема: Traefik не маршрутизирует запросы

### Проверка
1. Откройте http://localhost:8080 - должен открыться Traefik Dashboard
2. Проверьте логи: `docker compose logs traefik`
3. Убедитесь, что все сервисы имеют правильные labels

### Решение
Перезапустите Traefik:
```bash
docker compose restart traefik
```

## Проблема: Nextcloud показывает ошибки

### Ошибка подключения к базе данных
1. Проверьте, что `postgres_nc` запущен: `docker compose ps postgres_nc`
2. Проверьте переменные окружения в `.env`
3. Проверьте логи: `docker compose logs postgres_nc nextcloud`

### Ошибка подключения к Redis
1. Проверьте, что `redis` запущен: `docker compose ps redis`
2. Проверьте пароль Redis в `.env`
3. Перезапустите Nextcloud: `docker compose restart nextcloud`

## Проблема: xeokit не загружает модели

### Проверка
1. Откройте консоль браузера (F12)
2. Проверьте ошибки в Network и Console
3. Убедитесь, что модель загружена в BIMserver
4. Проверьте правильность Project ID и Revision ID

### Решение
1. Убедитесь, что BIMserver доступен: http://localhost/bimserver
2. Проверьте CORS настройки в `config/xeokit/nginx.conf`
3. Проверьте логи xeokit: `docker compose logs xeokit`

## Проблема: Данные не сохраняются

### Проверка volumes
```bash
docker compose ps
docker volume ls
```

### Решение
Убедитесь, что директории `data/` существуют и имеют правильные права доступа.

## Полный сброс

Если ничего не помогает:
```bash
# Остановка и удаление всех контейнеров и volumes
cd docker
docker compose down -v

# Удаление данных
cd ..
# Windows
Remove-Item -Recurse -Force data\*

# Linux/Mac
rm -rf data/*

# Пересборка образов
cd docker
docker compose build --no-cache
docker compose up -d
```

## Получение помощи

1. Проверьте логи всех сервисов
2. Убедитесь, что все требования выполнены
3. Проверьте документацию компонентов
4. Создайте issue с описанием проблемы и логами

