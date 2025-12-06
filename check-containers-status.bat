@echo off
chcp 65001 >nul
echo ========================================
echo   Статус контейнеров
echo ========================================
cd docker
docker compose ps
echo.
echo ========================================
echo   Логи Nextcloud (последние 20 строк)
echo ========================================
docker compose logs --tail=20 nextcloud
echo.
pause

