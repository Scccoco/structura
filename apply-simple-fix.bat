@echo off
echo ==========================================
echo   ПРОСТОЕ РЕШЕНИЕ - Прямой доступ к Nextcloud
echo ==========================================
echo.
echo Изменения:
echo   1. Добавлен порт 8081 для прямого доступа
echo   2. Убран OVERWRITEWEBROOT (не нужен для прямого доступа)
echo   3. Traefik маршрутизация оставлена (можно использовать оба способа)
echo.
cd docker
echo Перезапускаю Nextcloud...
docker compose up -d nextcloud
echo.
echo Подождите 10 секунд...
timeout /t 10
echo.
echo ==========================================
echo   Nextcloud теперь доступен:
echo   http://localhost:8081 - ПРЯМОЙ ДОСТУП (работает точно)
echo   http://localhost/nextcloud - через Traefik (может работать)
echo ==========================================
echo.
echo Откройте http://localhost:8081 и настройте Nextcloud!
echo.
pause

