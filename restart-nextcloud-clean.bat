@echo off
chcp 65001 >nul
echo ==========================================
echo   ПЕРЕЗАПУСК NEXTCLOUD НАЧИСТО
echo ==========================================
echo.

cd docker

echo [1/5] Останавливаю Nextcloud...
docker compose stop nextcloud
docker compose rm -f nextcloud
echo.

echo [2/5] Удаляю config.php и data...
docker compose run --rm -v ../data/nextcloud:/var/www/html alpine sh -c "rm -rf /var/www/html/config /var/www/html/data" 2>nul
echo.

echo [3/5] Создаю чистые директории...
docker compose run --rm -v ../data/nextcloud:/var/www/html alpine sh -c "mkdir -p /var/www/html/config /var/www/html/data && chmod -R 777 /var/www/html" 2>nul
echo.

echo [4/5] Очищаю базу данных...
docker exec postgres_nc psql -U nextcloud -d postgres -c "DROP DATABASE IF EXISTS nextcloud;"
docker exec postgres_nc psql -U nextcloud -d postgres -c "CREATE DATABASE nextcloud OWNER nextcloud;"
echo.

echo [5/5] Запускаю Nextcloud...
docker compose up -d nextcloud
echo.

echo Подождите 20 секунд...
timeout /t 20
echo.

echo ==========================================
echo   ГОТОВО!
echo.
echo Откройте http://localhost:8081
echo Попробуйте установку снова
echo ==========================================
echo.
pause

