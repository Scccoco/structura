@echo off
echo Исправление конфигурации Nextcloud...
echo.
echo Перезапуск Traefik и Nextcloud...
cd docker
docker compose restart traefik nextcloud
echo.
echo Подождите 10 секунд для перезапуска...
timeout /t 10
echo.
echo Проверьте http://localhost/nextcloud
echo.
pause

