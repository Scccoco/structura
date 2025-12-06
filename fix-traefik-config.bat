@echo off
echo ==========================================
echo   Исправление конфигурации Traefik
echo ==========================================
echo.
echo Конфигурация исправлена. Перезапускаю Traefik...
cd docker
docker compose restart traefik
echo.
echo Подождите 5 секунд...
timeout /t 5
echo.
echo Проверьте:
echo   1. http://localhost:8080 - Traefik Dashboard (должен открыться без ошибок)
echo   2. http://localhost/nextcloud - Nextcloud
echo.
echo Если в Traefik Dashboard нет ошибок - конфигурация исправлена!
echo.
pause

