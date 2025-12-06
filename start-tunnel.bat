@echo off
chcp 65001 >nul
echo ========================================
echo   Запуск Cloudflare Tunnel
echo ========================================
echo.
echo Туннель запускается... (Ctrl+C для остановки)
echo.
cloudflared.exe tunnel --config cloudflared-config.yml run structura-bim

