@echo off
chcp 65001 >nul
echo ========================================
echo   Проверка Nextcloud
echo ========================================
echo.
echo === Статус контейнера ===
cd docker
docker compose ps nextcloud
echo.
echo === Health status ===
docker inspect nextcloud --format='{{.State.Health.Status}}'
echo.
echo === Последние 5 строк healthcheck логов ===
docker inspect nextcloud --format='{{range .State.Health.Log}}{{.Output}}{{end}}' | tail -5
echo.
echo === Логи Nextcloud (последние 20 строк) ===
docker compose logs --tail=20 nextcloud
echo.
pause

