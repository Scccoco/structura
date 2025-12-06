@echo off
echo ==========================================
echo   ПОЛНАЯ ДИАГНОСТИКА
echo ==========================================
echo.
cd docker

echo [1/5] Статус всех контейнеров:
docker compose ps
echo.

echo [2/5] Логи Nextcloud (последние 30 строк):
docker compose logs --tail=30 nextcloud
echo.

echo [3/5] Логи Traefik (последние 20 строк):
docker compose logs --tail=20 traefik | findstr /V /C:"level=info"
echo.

echo [4/5] Проверка доступности Nextcloud изнутри контейнера:
docker exec nextcloud curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost/ 2>nul
echo.

echo [5/5] Проверка регистрации в Traefik:
docker exec traefik wget -q -O- http://localhost:8080/api/http/routers 2>nul | findstr /C:"nextcloud"
if %errorlevel% equ 0 (
    echo Nextcloud ЗАРЕГИСТРИРОВАН в Traefik
) else (
    echo Nextcloud НЕ ЗАРЕГИСТРИРОВАН в Traefik
)
echo.

echo ==========================================
echo   СОХРАНИТЕ ВСЕ ЭТИ ЛОГИ И ОТПРАВЬТЕ МНЕ
echo ==========================================
cd ..
pause

