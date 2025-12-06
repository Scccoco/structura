@echo off
echo ==========================================
echo   Проверка Nextcloud
echo ==========================================
echo.
cd docker
echo Статус контейнеров:
docker compose ps nextcloud traefik
echo.
echo ==========================================
echo   Логи Traefik (последние 20 строк)
echo ==========================================
docker compose logs --tail=20 traefik
echo.
echo ==========================================
echo   Логи Nextcloud (последние 30 строк)
echo ==========================================
docker compose logs --tail=30 nextcloud
echo.
echo ==========================================
echo   Проверка доступности Nextcloud напрямую
echo ==========================================
docker exec nextcloud wget -q -O- http://localhost/ 2>&1 | head -5
echo.
cd ..
pause

