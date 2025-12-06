# Простое решение проблемы с Nextcloud

## Проблема
Nextcloud не открывается по адресу http://localhost/nextcloud (404 ошибка).

## Простое решение - использовать прямой доступ

Вместо сложной настройки подпути, давайте используем прямой доступ через порт:

### Шаг 1: Откройте docker/docker-compose.yml

Найдите секцию `nextcloud` (около строки 150) и добавьте `ports`:

```yaml
  nextcloud:
    image: nextcloud:27-apache
    container_name: nextcloud
    restart: unless-stopped
    ports:
      - "8081:80"  # Добавьте эту строку
    environment:
      # ... остальное без изменений
```

### Шаг 2: Уберите Traefik маршрутизацию для Nextcloud

Закомментируйте или удалите labels для Traefik в секции nextcloud:

```yaml
    # labels:
    #   - "traefik.enable=true"
    #   - ... (все остальные traefik labels)
```

### Шаг 3: Перезапустите

```cmd
cd docker
docker compose up -d nextcloud
```

### Шаг 4: Откройте Nextcloud

http://localhost:8081

## Альтернатива - оставить как есть, но проверить что не так

Запустите диагностику:

```cmd
.\diagnose.bat
```

И отправьте мне ВСЕ логи - я найду проблему.

## Почему это лучше?

1. Проще - не нужно настраивать подпуть
2. Надежнее - нет проблем с маршрутизацией
3. Быстрее - сразу работает

Можем потом вернуться к подпути, когда все заработает.

