@echo off
chcp 65001 >nul
echo ==========================================
echo   ПРАВИЛЬНАЯ ОЧИСТКА NEXTCLOUD
echo ==========================================
echo.

cd docker

echo [1/5] Останавливаю Nextcloud...
docker compose stop nextcloud
echo.

echo [2/5] Подключаюсь к базе данных под правильным пользователем...
docker exec postgres_nc psql -U nextcloud -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'nextcloud';" 2>nul
echo Отключил активные соединения.
echo.

echo [3/5] Удаляю старую базу данных...
docker exec postgres_nc psql -U nextcloud -d postgres -c "DROP DATABASE IF EXISTS nextcloud;" 2>nul
echo.

echo [4/5] Создаю новую базу данных...
docker exec postgres_nc psql -U nextcloud -d postgres -c "CREATE DATABASE nextcloud OWNER nextcloud;"
echo База данных создана!
echo.

echo [5/5] Запускаю Nextcloud...
docker compose up -d nextcloud
echo.

echo Подождите 15 секунд...
timeout /t 15
echo.

echo ==========================================
echo   ГОТОВО!
echo.
echo ЗАКРОЙТЕ браузер (все вкладки с Nextcloud)
echo ОТКРОЙТЕ заново: http://localhost:8081
echo.
echo Должна открыться чистая страница установки!
echo ==========================================
echo.
pause

