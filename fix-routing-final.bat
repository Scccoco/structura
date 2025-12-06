@echo off
chcp 65001 >nul
echo ==========================================
echo   ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ МАРШРУТИЗАЦИИ
echo ==========================================
echo.

cd docker

echo Проблема: Traefik удаляет префикс, но сервисы работают с префиксом
echo Решение: Не удалять префикс для BIMserver, передавать полный путь
echo.

echo Перезапускаю Traefik для применения изменений...
docker compose restart traefik
echo.

echo Подождите 5 секунд...
timeout /t 5
echo.

echo ==========================================
echo   Проверьте в браузере:
echo ==========================================
echo   1. http://localhost/bimserver/ (со слэшем в конце!)
echo   2. http://localhost/viewer/
echo   3. http://localhost/portainer/
echo   4. http://localhost/nextcloud/
echo.
echo   Если не работает - запустите: .\check-bimserver-path.bat
echo ==========================================
echo.
pause

