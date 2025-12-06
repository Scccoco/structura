@echo off
echo ==========================================
echo   ПРИНУДИТЕЛЬНОЕ ИСПРАВЛЕНИЕ NEXTCLOUD
echo ==========================================
echo.

cd docker

echo [1/4] Останавливаю Nextcloud...
docker compose stop nextcloud
echo.

echo [2/4] Удаляю старый config.php...
docker compose rm -f nextcloud
if exist "..\data\nextcloud\config\config.php" (
    echo Удаляю config.php...
    del /F /Q "..\data\nextcloud\config\config.php" 2>nul
    echo Удален.
) else (
    echo config.php не найден.
)
echo.

echo [3/4] Удаляю все файлы из config (кроме .htaccess)...
if exist "..\data\nextcloud\config" (
    for %%f in ("..\data\nextcloud\config\*") do (
        if not "%%~nxf"==".htaccess" (
            del /F /Q "%%f" 2>nul
        )
    )
    echo Очищено.
)
echo.

echo [4/4] Пересоздаю контейнер с чистой конфигурацией...
docker compose up -d nextcloud
echo.

echo Подождите 20 секунд для инициализации...
timeout /t 20
echo.

echo ==========================================
echo   Готово!
echo.
echo Откройте http://localhost:8081
echo Nextcloud должен создать новую конфигурацию.
echo.
echo Если ошибка все еще есть, проверьте логи:
echo   cd docker
echo   docker compose logs nextcloud
echo ==========================================
echo.
pause

