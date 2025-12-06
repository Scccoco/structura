@echo off
chcp 65001 >nul
echo ========================================
echo   ЛОГИ NEXTCLOUD (последние 30 строк)
echo ========================================
cd docker
docker compose logs --tail=30 nextcloud
echo.
echo ========================================
pause

