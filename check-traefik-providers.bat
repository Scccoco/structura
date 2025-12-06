@echo off
chcp 65001 >nul
echo ========================================
echo   Проверка Docker провайдера в Traefik
echo ========================================
cd docker
docker compose logs traefik | findstr /i "provider docker"
echo.
echo ========================================
pause

