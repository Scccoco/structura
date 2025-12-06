@echo off
echo ==========================================
echo   Перезапуск Nextcloud и Traefik
echo ==========================================
echo.
cd docker
echo Остановка контейнеров...
docker compose stop nextcloud traefik
echo.
echo Удаление контейнеров...
docker compose rm -f nextcloud traefik
echo.
echo Запуск контейнеров...
docker compose up -d nextcloud traefik
echo.
echo Подождите 15 секунд для инициализации...
timeout /t 15
echo.
echo Проверьте http://localhost/nextcloud
echo.
echo Для просмотра логов:
echo   cd docker
echo   docker compose logs -f nextcloud
echo.
pause

