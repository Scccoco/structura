@echo off
chcp 65001 >nul
echo ========================================
echo   Принудительная перезагрузка Traefik
echo ========================================
cd docker
echo Остановка Traefik...
docker compose stop traefik
echo.
echo Ожидание 3 секунды...
timeout /t 3 /nobreak >nul
echo.
echo Запуск Traefik...
docker compose start traefik
echo.
echo Ожидание 10 секунд для подключения к контейнерам...
timeout /t 10 /nobreak >nul
echo.
echo ========================================
echo   Готово!
echo ========================================
echo.
echo Откройте Traefik Dashboard:
echo   http://localhost:8080
echo.
pause

