@echo off
echo ==========================================
echo   ЛОГИ NEXTCLOUD (последние 50 строк)
echo ==========================================
echo.
cd docker
docker compose logs --tail=50 nextcloud
echo.
echo ==========================================
echo   Проверка файла config.php
echo ==========================================
docker exec nextcloud ls -la /var/www/html/config/ 2>nul
echo.
echo ==========================================
echo   Содержимое config.php (если существует)
echo ==========================================
docker exec nextcloud cat /var/www/html/config/config.php 2>nul
echo.
pause

