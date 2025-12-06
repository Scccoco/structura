@echo off
chcp 65001 >nul
cd docker
docker compose restart
echo.
echo Контейнеры перезапущены!
pause

