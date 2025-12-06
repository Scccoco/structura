@echo off
chcp 65001 >nul
echo ==========================================
echo   УСТАНОВКА NEXTCLOUD ЧЕРЕЗ OCC
echo ==========================================
echo.

cd docker

echo [1/3] Проверка, что Nextcloud запущен...
docker compose ps nextcloud
echo.

echo [2/3] Установка Nextcloud через occ...
docker exec nextcloud php occ maintenance:install ^
  --database="pgsql" ^
  --database-name="nextcloud" ^
  --database-user="nextcloud" ^
  --database-pass="nextcloud_pass" ^
  --database-host="postgres_nc" ^
  --admin-user="admin" ^
  --admin-pass="admin" ^
  --data-dir="/var/www/html/data"
echo.

if %errorlevel% equ 0 (
    echo ==========================================
    echo   УСТАНОВКА УСПЕШНА!
    echo ==========================================
    echo.
    echo Откройте http://localhost:8081
    echo Логин: admin
    echo Пароль: admin
    echo.
) else (
    echo ==========================================
    echo   ОШИБКА УСТАНОВКИ
    echo ==========================================
    echo.
    echo Проверьте логи: docker compose logs nextcloud
    echo.
)
echo.
pause

