@echo off
echo ==========================================
echo   ВКЛЮЧЕНИЕ АВТОМАТИЧЕСКОЙ УСТАНОВКИ
echo ==========================================
echo.
echo Добавлены переменные для автоматической установки Nextcloud
echo Nextcloud сам создаст config.php при первом запуске
echo.
cd docker

echo Останавливаю Nextcloud...
docker compose stop nextcloud
echo.

echo Удаляю старую конфигурацию...
if exist "..\data\nextcloud\config\config.php" (
    del /F /Q "..\data\nextcloud\config\config.php" 2>nul
)
echo.

echo Пересоздаю контейнер...
docker compose up -d --force-recreate nextcloud
echo.

echo Подождите 30 секунд для автоматической установки...
timeout /t 30
echo.

echo ==========================================
echo   Готово!
echo.
echo Откройте http://localhost:8081
echo.
echo Nextcloud должен быть автоматически настроен:
echo   Логин: admin
echo   Пароль: admin
echo.
echo Если все еще 503, проверьте логи:
echo   docker compose logs -f nextcloud
echo ==========================================
echo.
pause

