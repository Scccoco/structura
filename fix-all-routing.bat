@echo off
chcp 65001 >nul
echo ==========================================
echo   ИСПРАВЛЕНИЕ МАРШРУТИЗАЦИИ
echo ==========================================
echo.

cd docker

echo [1/4] Проверка статуса всех контейнеров...
docker compose ps
echo.

echo [2/4] Проверка логов Traefik на ошибки...
docker compose logs --tail=30 traefik | findstr /C:"error" /C:"Error" /C:"ERROR"
if %errorlevel% equ 0 (
    echo Найдены ошибки в Traefik!
) else (
    echo Ошибок не найдено.
)
echo.

echo [3/4] Перезапуск Traefik...
docker compose restart traefik
echo.

echo [4/4] Подождите 10 секунд...
timeout /t 10
echo.

echo ==========================================
echo   Проверьте в браузере:
echo ==========================================
echo   1. http://localhost:8080 - Traefik Dashboard
echo      (должен показать все роутеры)
echo.
echo   2. http://localhost/bimserver
echo   3. http://localhost/viewer  
echo   4. http://localhost/portainer
echo   5. http://localhost/nextcloud (через Traefik)
echo   6. http://localhost:8081 (Nextcloud прямой доступ)
echo ==========================================
echo.
echo Если Traefik Dashboard показывает роутеры - все работает!
echo Если нет - запустите: .\check-all-services.bat
echo.
pause

