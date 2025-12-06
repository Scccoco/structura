@echo off
chcp 65001 >nul
echo ==========================================
echo   ПЕРЕЗАПУСК TRAEFIK
echo ==========================================
echo.

cd docker

echo Останавливаю Traefik...
docker compose stop traefik
echo.

echo Удаляю контейнер...
docker compose rm -f traefik
echo.

echo Запускаю Traefik заново...
docker compose up -d traefik
echo.

echo Подождите 10 секунд для запуска...
timeout /t 10
echo.

echo ==========================================
echo   Проверьте:
echo   1. http://localhost:8080 - Traefik Dashboard
echo   2. http://localhost/bimserver
echo   3. http://localhost/viewer
echo   4. http://localhost/portainer
echo ==========================================
echo.
pause

