@echo off
chcp 65001 >nul
echo ==========================================
echo   ПРОВЕРКА КОНФИГУРАЦИИ NEXTCLOUD
echo ==========================================
echo.

cd docker

echo [1] Проверка существования config.php:
docker exec nextcloud test -f /var/www/html/config/config.php
if %errorlevel% equ 0 (
    echo config.php СУЩЕСТВУЕТ
    echo.
    echo Содержимое (первые 20 строк):
    docker exec nextcloud head -20 /var/www/html/config/config.php
) else (
    echo config.php НЕ СУЩЕСТВУЕТ
    echo.
    echo Список файлов в config:
    docker exec nextcloud ls -la /var/www/html/config/
)
echo.

echo [2] Проверка прав доступа:
docker exec nextcloud ls -la /var/www/html/config/ | findstr /C:"config.php"
echo.

echo [3] Проверка подключения к базе данных:
docker exec nextcloud php occ status 2>nul
echo.

pause

