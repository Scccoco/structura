@echo off
echo ===================================================
echo Starting Local Demo Server...
echo Please open: http://localhost:8000
echo ===================================================
call npx -y http-server demo -p 8000 -c-1 --cors
pause
