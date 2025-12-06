@echo off
chcp 65001 >nul
echo ==========================================
echo   ОЧИСТКА БАЗЫ ДАННЫХ NEXTCLOUD
echo ==========================================
echo.

cd docker

echo [1/3] Останавливаю Nextcloud...
docker compose stop nextcloud
echo.

echo [2/3] Пересоздаю базу данных...
docker exec postgres_nc psql -U postgres -c "DROP DATABASE IF EXISTS nextcloud;"
docker exec postgres_nc psql -U postgres -c "CREATE DATABASE nextcloud OWNER nextcloud;"
echo База данных очищена!
echo.

echo [3/3] Запускаю Nextcloud...
docker compose up -d nextcloud
echo.

echo Подождите 10 секунд...
timeout /t 10
echo.

echo ==========================================
echo   Готово!
echo.
echo Откройте http://localhost:8081
echo Страница установки должна открыться без ошибки!
echo ==========================================
echo.
pause

