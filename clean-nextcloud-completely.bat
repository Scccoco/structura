@echo off
chcp 65001 >nul
echo ==========================================
echo   ПОЛНАЯ ОЧИСТКА И ПЕРЕУСТАНОВКА NEXTCLOUD
echo ==========================================
echo.
echo ВНИМАНИЕ: Это удалит ВСЕ данные Nextcloud!
echo - База данных будет очищена
echo - Все файлы будут удалены
echo - Конфигурация будет удалена
echo.
set /p confirm="Продолжить? (yes/no): "
if not "%confirm%"=="yes" (
    echo Отменено.
    pause
    exit /b
)
echo.

cd docker

echo [1/6] Останавливаю Nextcloud...
docker compose stop nextcloud
echo.

echo [2/6] Удаляю контейнер...
docker compose rm -f nextcloud
echo.

echo [3/6] Удаляю базу данных Nextcloud...
docker exec postgres_nc psql -U postgres -c "DROP DATABASE IF EXISTS nextcloud;" 2>nul
docker exec postgres_nc psql -U postgres -c "CREATE DATABASE nextcloud OWNER nextcloud;" 2>nul
echo База данных пересоздана.
echo.

echo [4/6] Удаляю все файлы Nextcloud...
if exist "..\data\nextcloud" (
    echo Удаляю директорию...
    rmdir /S /Q "..\data\nextcloud" 2>nul
)
echo Создаю пустую директорию...
mkdir "..\data\nextcloud" 2>nul
echo.

echo [5/6] Запускаю Nextcloud...
docker compose up -d nextcloud
echo.

echo [6/6] Подождите 30 секунд для инициализации...
timeout /t 30
echo.

echo ==========================================
echo   Nextcloud переустановлен!
echo.
echo Откройте http://localhost:8081
echo.
echo Должна открыться страница первоначальной настройки.
echo Создайте нового администратора.
echo ==========================================
echo.
pause

