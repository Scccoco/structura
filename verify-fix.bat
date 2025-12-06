@echo off
echo ==========================================
echo   Проверка исправления
echo ==========================================
echo.
cd docker
echo 1. Проверка логов Traefik на ошибки...
docker compose logs --tail=20 traefik | findstr /C:"error" /C:"Error" /C:"ERROR"
if %errorlevel% equ 0 (
    echo ОШИБКИ НАЙДЕНЫ!
) else (
    echo Ошибок не найдено - конфигурация корректна!
)
echo.
echo 2. Статус контейнеров:
docker compose ps nextcloud traefik
echo.
echo 3. Проверка регистрации Nextcloud в Traefik:
docker compose logs traefik | findstr /C:"nextcloud" /C:"Nextcloud"
echo.
echo ==========================================
echo   Откройте в браузере:
echo   http://localhost/nextcloud
echo.
echo   Если все еще 404, проверьте:
echo   1. Подождите еще 30 секунд (Nextcloud может инициализироваться)
echo   2. Проверьте логи: docker compose logs -f nextcloud
echo   3. Попробуйте прямой доступ (временно добавьте порт в docker-compose.yml)
echo ==========================================
echo.
pause

