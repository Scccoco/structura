@echo off
echo ==========================================
echo   Исправление конфигурации Nextcloud
echo ==========================================
echo.
echo Проблема: Nextcloud не может записать config.php
echo Решение: Проверяю и исправляю права доступа
echo.
cd docker

echo [1/3] Проверка существующего config.php...
docker exec nextcloud ls -la /var/www/html/config/config.php 2>nul
if %errorlevel% equ 0 (
    echo Файл существует. Удаляю для пересоздания...
    docker exec nextcloud rm -f /var/www/html/config/config.php
    echo Удален.
) else (
    echo Файл не существует - хорошо.
)
echo.

echo [2/3] Проверка прав доступа к директории config...
docker exec nextcloud ls -la /var/www/html/config/ | findstr /C:"config"
echo.

echo [3/3] Исправление прав доступа...
docker exec nextcloud chown -R www-data:www-data /var/www/html/config
docker exec nextcloud chmod -R 775 /var/www/html/config
echo Права исправлены.
echo.

echo ==========================================
echo   Перезапускаю Nextcloud...
echo ==========================================
docker compose restart nextcloud
echo.

echo Подождите 10 секунд для перезапуска...
timeout /t 10
echo.

echo ==========================================
echo   Готово!
echo.
echo Откройте http://localhost:8081
echo.
echo Если ошибка сохраняется:
echo   1. Удалите старую конфигурацию: Remove-Item -Recurse -Force data\nextcloud\config\*
echo   2. Пересоздайте контейнер: docker compose up -d --force-recreate nextcloud
echo ==========================================
echo.
pause

