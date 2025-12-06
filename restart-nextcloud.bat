@echo off
chcp 65001 >nul
cd docker
docker compose restart nextcloud
echo.
echo Nextcloud перезапущен!
echo Подождите 10-15 секунд и попробуйте открыть сайт.
pause

