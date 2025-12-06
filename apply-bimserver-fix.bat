@echo off
chcp 65001 >nul
echo ==========================================
echo   ИСПРАВЛЕНИЕ МАРШРУТИЗАЦИИ BIMserver
echo ==========================================
echo.

cd docker

echo Изменения:
echo   - Убран stripPrefix для BIMserver
echo   - Traefik теперь передает полный путь /bimserver/ в BIMserver
echo.

echo Перезапускаю Traefik...
docker compose restart traefik
echo.

echo Подождите 5 секунд...
timeout /t 5
echo.

echo ==========================================
echo   Проверьте:
echo   http://localhost/bimserver/
echo   (обратите внимание на слэш в конце!)
echo ==========================================
echo.
pause

