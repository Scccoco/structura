@echo off
chcp 65001 >nul
echo ==========================================
echo   ПРОВЕРКА ОШИБКИ NEXTCLOUD
echo ==========================================
echo.

cd docker

echo [1/3] Логи Nextcloud (последние 30 строк):
docker compose logs --tail=30 nextcloud
echo.

echo [2/3] Статус контейнера:
docker compose ps nextcloud
echo.

echo [3/3] Проверка подключения к базе данных:
docker exec nextcloud php -r "try { new PDO('pgsql:host=postgres_nc;dbname=nextcloud', 'nextcloud', 'nextcloud_pass'); echo 'OK'; } catch(Exception $e) { echo 'ERROR: ' . $e->getMessage(); }"
echo.

pause

