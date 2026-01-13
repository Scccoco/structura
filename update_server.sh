#!/bin/bash

# Скрипт обновления сервера и удаления устаревших контейнеров (BIMserver cleanup)

echo "🔄 Starting update process..."

# 1. Обновляем код
echo "⬇️  Pulling latest code..."
git pull

# 2. Переходим в папку docker
cd docker

# 3. Полная остановка и очистка "сирот" (orphans)
# Это удалит контейнеры, которых больше нет в docker-compose файлах (например, bimserver)
echo "🛑 Stopping containers and removing orphans..."
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml down --remove-orphans

# 4. Сборка и запуск
echo "🚀 Building and starting new stack..."
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --build

# 5. Очистка мусора
echo "🧹 Pruning unused images..."
docker system prune -f

echo "✅ Update complete! Check status with: docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml ps"
