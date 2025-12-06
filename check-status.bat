@echo off
chcp 65001 >nul
echo ==========================================
echo   Статус контейнеров BIM-стека
echo ==========================================
echo.
cd docker
docker compose ps
echo.
echo ==========================================
echo   Логи BIMserver (последние 20 строк)
echo ==========================================
docker compose logs --tail=20 bimserver
echo.
echo ==========================================
echo   Проверка доступности сервисов
echo ==========================================
echo.
echo Проверьте в браузере:
echo   - Traefik Dashboard: http://localhost:8080
echo   - Nextcloud: http://localhost/nextcloud
echo   - BIMserver: http://localhost/bimserver
echo   - xeokit Viewer: http://localhost/viewer
echo   - Portainer: http://localhost/portainer
echo.
cd ..
pause

