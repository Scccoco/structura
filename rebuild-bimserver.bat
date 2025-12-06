@echo off
echo Пересборка образа BIMserver...
cd docker
docker compose build --no-cache bimserver
docker compose up -d bimserver
cd ..
echo.
echo Готово! Проверьте статус: cd docker ^&^& docker compose ps
pause

