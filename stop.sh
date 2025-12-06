#!/bin/bash

# Скрипт остановки BIM-стека

set -e

echo "=========================================="
echo "  Остановка BIM-стека"
echo "=========================================="

# Переход в директорию docker
cd docker

# Остановка контейнеров
if docker compose version &> /dev/null; then
    docker compose --env-file ../.env down
else
    docker-compose --env-file ../.env down
fi

echo ""
echo "=========================================="
echo "  Стек остановлен"
echo "=========================================="
echo ""

