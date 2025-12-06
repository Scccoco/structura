@echo off
chcp 65001 >nul
echo ========================================
echo   Финальный перезапуск Traefik
echo ========================================
echo.
echo Изменена конфигурация: убрана фильтрация по сети
echo.
cd docker
docker compose restart traefik
echo.
echo Ожидание 10 секунд...
timeout /t 10 /nobreak >nul
echo.
echo ========================================
echo   Готово!
echo ========================================
echo.
echo Откройте Traefik Dashboard:
echo   http://localhost:8080
echo.
echo Теперь должны появиться роутеры Nextcloud!
echo.
pause

