@echo off
echo ==========================================
echo   ПОЛНЫЙ СБРОС КОНФИГУРАЦИИ NEXTCLOUD
echo ==========================================
echo.
echo ВНИМАНИЕ: Это удалит текущую конфигурацию Nextcloud!
echo Все настройки будут потеряны.
echo.
set /p confirm="Продолжить? (yes/no): "
if not "%confirm%"=="yes" (
    echo Отменено.
    pause
    exit /b
)
echo.

cd docker
echo Останавливаю Nextcloud...
docker compose stop nextcloud
echo.

echo Удаляю старую конфигурацию...
if exist "..\data\nextcloud\config" (
    Remove-Item -Recurse -Force "..\data\nextcloud\config\*" 2>nul
    echo Конфигурация удалена.
) else (
    echo Директория config не найдена.
)
echo.

echo Пересоздаю контейнер...
docker compose up -d --force-recreate nextcloud
echo.

echo Подождите 30 секунд для инициализации...
timeout /t 30
echo.

echo ==========================================
echo   Готово!
echo.
echo Откройте http://localhost:8081
echo Nextcloud должен создать новую конфигурацию.
echo ==========================================
echo.
pause

