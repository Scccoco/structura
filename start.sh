#!/bin/bash

# Скрипт запуска BIM-стека

set -e

echo "=========================================="
echo "  Запуск BIM-стека"
echo "=========================================="

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "Ошибка: Docker не установлен!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Ошибка: Docker Compose не установлен!"
    exit 1
fi

# Создание необходимых директорий
echo "Создание директорий для данных..."
mkdir -p data/traefik
mkdir -p data/portainer
mkdir -p data/postgres_bim
mkdir -p data/postgres_nc
mkdir -p data/redis
mkdir -p data/bimserver
mkdir -p data/nextcloud
mkdir -p config/traefik/certs

# Проверка .env файла
if [ ! -f .env ]; then
    echo "Создание .env файла из примера..."
    cp .env.example .env
    echo "ВНИМАНИЕ: Используются значения по умолчанию. Измените пароли в .env для продакшена!"
fi

# Переход в директорию docker
cd docker

# Запуск контейнеров
echo "Запуск контейнеров..."
if docker compose version &> /dev/null; then
    docker compose --env-file ../.env up -d
else
    docker-compose --env-file ../.env up -d
fi

echo ""
echo "=========================================="
echo "  Стек запущен!"
echo "=========================================="
echo ""
echo "Доступные сервисы:"
echo "  - Nextcloud:    http://localhost/nextcloud"
echo "  - BIMserver:    http://localhost/bimserver"
echo "  - xeokit Viewer: http://localhost/viewer"
echo "  - Portainer:    http://localhost/portainer"
echo "  - Traefik Dashboard: http://localhost:8080"
echo ""
echo "Для просмотра логов: docker compose -f docker/docker-compose.yml logs -f"
echo "Для остановки: ./stop.sh"
echo ""

