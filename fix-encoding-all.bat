@echo off
chcp 65001 >nul
echo ==========================================
echo   Исправление кодировки во всех батниках
echo ==========================================
echo.

echo Добавляю chcp 65001 в начало всех батников...
echo.

for %%f in (*.bat) do (
    findstr /C:"chcp 65001" "%%f" >nul 2>&1
    if errorlevel 1 (
        echo Обрабатываю: %%f
        powershell -Command "(Get-Content '%%f') -replace '@echo off', '@echo off`r`nchcp 65001 >nul' | Set-Content '%%f' -Encoding UTF8"
    ) else (
        echo Пропускаю: %%f (уже исправлен)
    )
)

echo.
echo ==========================================
echo   Готово! Все батники обновлены.
echo ==========================================
echo.
pause

