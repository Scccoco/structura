@echo off
chcp 65001 >nul
echo ==========================================
echo   ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ NEXTCLOUD
echo ==========================================
echo.

cd docker

echo [1/4] Проверка существования config.php...
docker exec nextcloud test -f /var/www/html/config/config.php
if %errorlevel% equ 0 (
    echo config.php существует
    echo Показываю содержимое:
    docker exec nextcloud cat /var/www/html/config/config.php
    echo.
    echo Удаляю для пересоздания...
    docker exec nextcloud rm -f /var/www/html/config/config.php
) else (
    echo config.php НЕ существует - нужно создать
)
echo.

echo [2/4] Проверка прав доступа...
docker exec nextcloud ls -la /var/www/html/config/
echo.

echo [3/4] Исправление прав доступа...
docker exec nextcloud chown -R www-data:www-data /var/www/html
docker exec nextcloud chmod -R 775 /var/www/html/config
docker exec nextcloud chmod -R 775 /var/www/html
echo Права исправлены.
echo.

echo [4/4] Создание config.php через occ...
docker exec nextcloud php occ maintenance:install ^
  --database="pgsql" ^
  --database-name="nextcloud" ^
  --database-user="nextcloud" ^
  --database-pass="nextcloud_pass" ^
  --database-host="postgres_nc" ^
  --admin-user="admin" ^
  --admin-pass="admin" ^
  --data-dir="/var/www/html/data" ^
  --no-interaction
echo.

if %errorlevel% equ 0 (
    echo ==========================================
    echo   УСПЕХ! config.php создан!
    echo ==========================================
    echo.
    echo Откройте http://localhost:8081
    echo Логин: admin
    echo Пароль: admin
    echo.
) else (
    echo ==========================================
    echo   ОШИБКА при создании config.php
    echo ==========================================
    echo.
    echo Проверьте логи: docker compose logs nextcloud
    echo.
)
echo.
pause

