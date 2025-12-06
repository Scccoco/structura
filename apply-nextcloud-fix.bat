@echo off
echo ==========================================
echo   Применение исправления Nextcloud
echo ==========================================
echo.
cd docker
echo Перезапуск Traefik для применения новой конфигурации...
docker compose restart traefik
echo.
echo Подождите 5 секунд...
timeout /t 5
echo.
echo Проверьте http://localhost/nextcloud
echo.
echo Если не работает, попробуйте:
echo   1. Проверьте логи: docker compose logs -f nextcloud
echo   2. Проверьте Traefik Dashboard: http://localhost:8080
echo   3. Подождите еще 1-2 минуты для полной инициализации Nextcloud
echo.
pause

