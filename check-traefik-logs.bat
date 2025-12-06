@echo off
chcp 65001 >nul
echo ========================================
echo   ЛОГИ TRAEFIK (последние 30 строк)
echo ========================================
cd docker
docker compose logs --tail=30 traefik
echo.
echo ========================================
pause

