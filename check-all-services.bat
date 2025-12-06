@echo off
chcp 65001 >nul
echo ==========================================
echo   ПРОВЕРКА ВСЕХ СЕРВИСОВ
echo ==========================================
echo.

cd docker

echo [1/5] Статус всех контейнеров:
docker compose ps
echo.

echo [2/5] Проверка Traefik Dashboard:
echo Откройте http://localhost:8080 в браузере
echo.

echo [3/5] Логи Traefik (последние 20 строк, только ошибки):
docker compose logs --tail=20 traefik | findstr /C:"error" /C:"Error" /C:"ERROR" /C:"404"
echo.

echo [4/5] Проверка регистрации сервисов в Traefik:
docker exec traefik wget -q -O- http://localhost:8080/api/http/routers 2>nul | findstr /C:"nextcloud" /C:"bimserver" /C:"portainer" /C:"xeokit"
echo.

echo [5/5] Проверка доступности сервисов напрямую:
echo.
echo Nextcloud (прямой доступ):
docker exec nextcloud curl -s -o nul -w "HTTP: %%{http_code}\n" http://localhost/ 2>nul
echo.
echo BIMserver:
docker exec bimserver curl -s -o nul -w "HTTP: %%{http_code}\n" http://localhost:8080/ 2>nul
echo.
echo xeokit:
docker exec xeokit wget -q -O- http://localhost/ 2>nul | findstr /C:"html" /C:"xeokit" >nul
if %errorlevel% equ 0 (
    echo xeokit работает
) else (
    echo xeokit не отвечает
)
echo.

echo ==========================================
echo   Адреса для проверки:
echo ==========================================
echo   Nextcloud: http://localhost:8081 (прямой доступ)
echo   Nextcloud: http://localhost/nextcloud (через Traefik)
echo   BIMserver: http://localhost/bimserver
echo   xeokit: http://localhost/viewer
echo   Portainer: http://localhost/portainer
echo   Traefik Dashboard: http://localhost:8080
echo ==========================================
echo.
pause

