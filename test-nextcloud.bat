@echo off
echo ==========================================
echo   Тестирование Nextcloud
echo ==========================================
echo.
cd docker
echo.
echo 1. Статус контейнеров:
docker compose ps nextcloud traefik
echo.
echo 2. Проверка доступности Nextcloud изнутри контейнера:
docker exec nextcloud wget -q -O- http://localhost/ 2>&1 | findstr /C:"200" /C:"404" /C:"302" /C:"301"
echo.
echo 3. Последние 15 строк логов Nextcloud:
docker compose logs --tail=15 nextcloud
echo.
echo 4. Последние 10 строк логов Traefik:
docker compose logs --tail=10 traefik
echo.
echo ==========================================
echo   Проверьте в браузере:
echo   http://localhost/nextcloud
echo   http://localhost:8080 (Traefik Dashboard)
echo ==========================================
echo.
cd ..
pause

