@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   Перезагрузка BIM-стека
echo ========================================
echo.

cd docker

echo Остановка и удаление контейнеров...
docker compose down

echo.
echo Запуск контейнеров...
docker compose up -d

echo.
echo Ожидание инициализации (30 секунд)...
timeout /t 30 /nobreak >nul

echo.
echo ========================================
echo   Статус контейнеров
echo ========================================
docker compose ps

echo.
echo ========================================
echo   Готово!
echo ========================================
echo.
echo Доступные сервисы:
echo   - BIMserver:    http://localhost/bimserver/
echo   - xeokit:       http://localhost/viewer/
echo   - Portainer:    http://localhost:9000
echo   - Nextcloud:    https://cloud.structura-most.ru
echo   - Traefik:      http://localhost:8080
echo.
echo Для просмотра логов:
echo   cd docker ^&^& docker compose logs -f [service_name]
echo.
pause
