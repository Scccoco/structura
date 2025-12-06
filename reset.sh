#!/bin/bash

# Скрипт сброса данных BIM-стека

set -e

echo "=========================================="
echo "  ВНИМАНИЕ: Сброс всех данных!"
echo "=========================================="
echo ""
echo "Это действие удалит ВСЕ данные:"
echo "  - Базы данных PostgreSQL"
echo "  - Файлы Nextcloud"
echo "  - Модели BIMserver"
echo "  - Кеш Redis"
echo "  - Все настройки"
echo ""
read -p "Вы уверены? Введите 'yes' для подтверждения: " confirm

if [ "$confirm" != "yes" ]; then
    echo "Отменено."
    exit 0
fi

echo ""
echo "Остановка контейнеров..."

# Переход в директорию docker
cd docker

# Остановка и удаление контейнеров
if docker compose version &> /dev/null; then
    docker compose --env-file ../.env down -v
else
    docker-compose --env-file ../.env down -v
fi

cd ..

echo ""
echo "Удаление данных..."

# Удаление директорий с данными
rm -rf data/traefik/*
rm -rf data/portainer/*
rm -rf data/postgres_bim/*
rm -rf data/postgres_nc/*
rm -rf data/redis/*
rm -rf data/bimserver/*
rm -rf data/nextcloud/*

echo ""
echo "=========================================="
echo "  Данные удалены"
echo "=========================================="
echo ""
echo "Для запуска заново: ./start.sh"
echo ""

