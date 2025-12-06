@echo off
chcp 65001 >nul
echo ==========================================
echo   СРОЧНОЕ ИСПРАВЛЕНИЕ NEXTCLOUD
echo ==========================================
echo.

cd docker

echo [1/4] Останавливаю Nextcloud...
docker compose stop nextcloud
echo.

echo [2/4] ПОЛНОСТЬЮ очищаю базу данных...
docker exec postgres_nc psql -U postgres -c "DROP DATABASE IF EXISTS nextcloud;"
echo База удалена.
echo.

docker exec postgres_nc psql -U postgres -c "CREATE DATABASE nextcloud OWNER nextcloud;"
echo Новая база создана.
echo.

echo [3/4] Удаляю config.php...
docker compose run --rm nextcloud rm -f /var/www/html/config/config.php 2>nul
echo.

echo [4/4] Запускаю Nextcloud...
docker compose up -d nextcloud
echo.

echo Подождите 15 секунд для запуска...
timeout /t 15
echo.

echo ==========================================
echo   ГОТОВО!
echo.
echo ЗАКРОЙТЕ браузер полностью (все вкладки)
echo ОТКРОЙТЕ заново: http://localhost:8081
echo.
echo Ошибка должна исчезнуть!
echo ==========================================
echo.
pause

