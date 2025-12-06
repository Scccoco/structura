@echo off
chcp 65001 >nul
echo ========================================
echo   Перезапуск Traefik и Nextcloud
echo ========================================
cd docker
echo Перезапуск Traefik...
docker compose restart traefik
echo Ожидание 5 секунд...
timeout /t 5 /nobreak >nul
echo Перезапуск Nextcloud...
docker compose restart nextcloud
echo.
echo ========================================
echo   Готово! Подождите 10 секунд.
echo ========================================
echo.
echo Проверьте:
echo   - http://localhost/nextcloud
echo   - https://cloud.structura-most.ru
echo.
pause

