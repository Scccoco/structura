@echo off
chcp 65001 >nul
echo ========================================
echo   Логи Traefik Docker Provider
echo ========================================
cd docker
docker compose logs traefik | findstr /i "nextcloud" | findstr /v "INF"
echo.
echo ========================================
echo   Все логи (последние 30 строк):
echo ========================================
docker compose logs --tail=30 traefik
echo.
pause

