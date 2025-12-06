@echo off
chcp 65001 >nul
echo ========================================
echo   ФИНАЛЬНОЕ ПЕРЕСОЗДАНИЕ
echo ========================================
echo.
echo Изменения:
echo - Вернули network: bim_web в Traefik
echo - Явно указали service для всех роутеров
echo - Включили DEBUG логи
echo.
cd docker
docker compose down
docker compose up -d
echo.
echo Ожидание 30 секунд...
timeout /t 30 /nobreak >nul
echo.
echo ========================================
echo   ПРОВЕРКА
echo ========================================
echo.
echo 1. Traefik Dashboard: http://localhost:8080
echo 2. Nextcloud локально: http://localhost/nextcloud
echo 3. BIMserver локально: http://localhost/bimserver/
echo 4. xeokit локально: http://localhost/viewer/
echo.
pause

