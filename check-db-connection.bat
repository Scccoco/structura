@echo off
echo ==========================================
echo   ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ
echo ==========================================
echo.
cd docker

echo [1/3] Проверка статуса PostgreSQL...
docker compose ps postgres_nc
echo.

echo [2/3] Проверка подключения к базе данных...
docker exec postgres_nc psql -U nextcloud -d nextcloud -c "SELECT version();" 2>nul
if %errorlevel% equ 0 (
    echo БАЗА ДАННЫХ ДОСТУПНА!
) else (
    echo ОШИБКА: Не могу подключиться к базе данных!
    echo Проверьте логи: docker compose logs postgres_nc
)
echo.

echo [3/3] Проверка переменных окружения Nextcloud...
docker exec nextcloud env | findstr /C:"POSTGRES" /C:"AUTOINSTALL"
echo.

pause

