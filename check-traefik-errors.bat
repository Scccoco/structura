@echo off
chcp 65001 >nul
echo ========================================
echo   Логи Traefik (последние 50 строк)
echo ========================================
cd docker
docker compose logs --tail=50 traefik | findstr /i "error nextcloud"
echo.
echo ========================================
echo   Все логи Traefik:
echo ========================================
docker compose logs --tail=50 traefik
echo.
pause

