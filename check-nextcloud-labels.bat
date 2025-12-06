@echo off
chcp 65001 >nul
echo ========================================
echo   Labels контейнера Nextcloud
echo ========================================
docker inspect nextcloud | findstr /i "traefik"
echo.
echo ========================================
echo   Если пусто - labels не применились!
echo ========================================
pause
