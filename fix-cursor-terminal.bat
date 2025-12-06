@echo off
chcp 65001 >nul
echo ==========================================
echo   ИСПРАВЛЕНИЕ ТЕРМИНАЛА CURSOR
echo ==========================================
echo.
echo Проблема: PowerShell в Cursor добавляет "qс" перед командами
echo.
echo Решение 1: Изменить настройки Cursor
echo   1. Откройте Settings (Ctrl+,)
echo   2. Найдите "terminal.integrated.shell.windows"
echo   3. Измените на: "C:\\Windows\\System32\\cmd.exe"
echo   4. Перезапустите Cursor
echo.
echo Решение 2: Использовать Command Prompt вместо PowerShell
echo   1. В Cursor нажмите на стрелку рядом с "+"
echo   2. Выберите "Command Prompt" вместо PowerShell
echo.
echo Решение 3: Исправить кодировку PowerShell
echo   Выполните в PowerShell:
echo   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
echo.
echo ==========================================
echo Тест текущего терминала:
echo ==========================================
echo.
echo Если вы видите эту строку нормально - батники работают!
echo.
cd docker
echo Проверка Docker Compose:
docker compose ps
echo.
pause

