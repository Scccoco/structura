@echo off
echo ==========================================
echo   РУЧНАЯ НАСТРОЙКА NEXTCLOUD
echo ==========================================
echo.
cd docker

echo [1/4] Проверка подключения к базе данных...
docker exec postgres_nc psql -U nextcloud -d nextcloud -c "SELECT 1;" 2>nul
if %errorlevel% equ 0 (
    echo База данных доступна!
) else (
    echo ОШИБКА: База данных недоступна!
    echo Проверьте логи: docker compose logs postgres_nc
    pause
    exit /b 1
)
echo.

echo [2/4] Проверка прав доступа к директории config...
docker exec nextcloud ls -la /var/www/html/config/
echo.

echo [3/4] Исправление прав доступа...
docker exec nextcloud chown -R www-data:www-data /var/www/html
docker exec nextcloud chmod -R 775 /var/www/html/config
docker exec nextcloud chmod -R 775 /var/www/html
echo Права исправлены.
echo.

echo [4/4] Проверка переменных окружения...
docker exec nextcloud env | findstr /C:"POSTGRES" /C:"REDIS"
echo.

echo ==========================================
echo   Информация для ручной настройки:
echo ==========================================
echo.
echo Откройте http://localhost:8081
echo.
echo При настройке используйте:
echo   База данных: PostgreSQL
echo   Имя пользователя БД: nextcloud
echo   Пароль БД: nextcloud_pass
echo   Имя БД: nextcloud
echo   Хост БД: postgres_nc:5432
echo.
echo Если все еще 503, проверьте логи:
echo   docker compose logs -f nextcloud
echo.
pause

