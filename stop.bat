@echo off
chcp 65001 >nul
echo ==========================================
echo   Остановка BIM-стека
echo ==========================================
echo.

cd docker
docker compose --env-file ..\.env down

cd ..

echo.
echo ==========================================
echo   Стек остановлен
echo ==========================================
echo.
pause

