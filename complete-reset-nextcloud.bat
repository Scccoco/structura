@echo off
echo ==========================================
echo   ПОЛНЫЙ СБРОС NEXTCLOUD
echo ==========================================
echo.
echo ВНИМАНИЕ: Это удалит ВСЮ конфигурацию Nextcloud!
echo.
cd docker

echo [1/5] Останавливаю Nextcloud...
docker compose stop nextcloud
docker compose rm -f nextcloud
echo.

echo [2/5] Удаляю ВСЮ директорию config...
if exist "..\data\nextcloud\config" (
    echo Удаляю config...
    Remove-Item -Recurse -Force "..\data\nextcloud\config" 2>nul
    echo Удалено.
) else (
    echo Директория config не найдена.
)
echo.

echo [3/5] Создаю пустую директорию config с правильными правами...
New-Item -ItemType Directory -Path "..\data\nextcloud\config" -Force | Out-Null
echo Создано.
echo.

echo [4/5] Пересоздаю контейнер...
docker compose up -d nextcloud
echo.

echo [5/5] Жду 30 секунд для автоматической установки...
timeout /t 30
echo.

echo ==========================================
echo   Проверка результата
echo ==========================================
echo.
docker exec nextcloud ls -la /var/www/html/config/ 2>nul
echo.

echo ==========================================
echo   Готово!
echo.
echo Откройте http://localhost:8081
echo.
echo Если config.php создан - все работает!
echo Если нет - проверьте логи: docker compose logs -f nextcloud
echo ==========================================
echo.
pause

