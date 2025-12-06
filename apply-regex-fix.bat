@echo off
echo Обновление regex для Nextcloud...
cd docker
docker compose restart traefik
echo.
echo Подождите 5 секунд...
timeout /t 5
echo.
echo Проверьте http://localhost/nextcloud
pause

