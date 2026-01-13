# Деплой на VPS

## Команды для запуска на VPS:

```bash
cd /root/structura/docker
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml down
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d
```

## После git pull:

```bash
cd /root/structura
git pull
cd docker
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --force-recreate
```

## Сервисы доступны по:

- Portainer: https://port.structura-most.ru

## 🧹 Обновление и очистка (Миграция без BIMserver)

Если вы обновляете существующий сервер, выполните эти команды для удаления старых контейнеров:

```bash
cd /root/structura
git pull

cd docker

# 1. Остановить контейнеры и удалить "сирот" (BIMserver и его БД)
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml down --remove-orphans

# 2. Пересобрать и запустить (уже без BIMserver)
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --build

# 3. Очистить мусор (неиспользуемые images)
docker system prune -f
```

