@echo off
chcp 65001 >nul
echo ========================================
echo   Пересоздание контейнеров
echo ========================================
echo.
echo Остановка и удаление контейнеров...
cd docker
docker compose down
echo.
echo Запуск контейнеров с новой конфигурацией...
docker compose up -d
echo.
echo ========================================
echo   Готово! Подождите 30 секунд.
echo ========================================
echo.
echo Проверьте Traefik Dashboard:
echo   http://localhost:8080
echo.
echo Должны появиться роутеры:
echo   - nextcloud-external (Host: cloud.structura-most.ru)
echo   - bimserver-external (Host: bim.structura-most.ru)
echo   - xeokit-external (Host: viewer.structura-most.ru)
echo.
pause

