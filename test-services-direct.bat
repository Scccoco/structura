@echo off
chcp 65001 >nul
echo ==========================================
echo   ПРОВЕРКА СЕРВИСОВ НАПРЯМУЮ
echo ==========================================
echo.

cd docker

echo [1/4] Проверка BIMserver...
echo Пробую разные пути:
docker exec bimserver curl -s -o nul -w "GET / -> HTTP: %%{http_code}\n" http://localhost:8080/ 2>nul
docker exec bimserver curl -s -o nul -w "GET /bimserver -> HTTP: %%{http_code}\n" http://localhost:8080/bimserver 2>nul
docker exec bimserver curl -s -o nul -w "GET /bimserver/ -> HTTP: %%{http_code}\n" http://localhost:8080/bimserver/ 2>nul
echo.

echo [2/4] Проверка xeokit...
docker exec xeokit wget -q -O- http://localhost/ 2>nul | findstr /C:"html" /C:"xeokit" /C:"viewer" >nul
if %errorlevel% equ 0 (
    echo xeokit отвечает на /
) else (
    echo xeokit НЕ отвечает на /
)
docker exec xeokit ls -la /usr/share/nginx/html/ 2>nul
echo.

echo [3/4] Проверка Nextcloud...
docker exec nextcloud curl -s -o nul -w "GET / -> HTTP: %%{http_code}\n" http://localhost/ 2>nul
echo.

echo [4/4] Проверка Portainer...
docker exec portainer wget -q -O- http://localhost:9000/ 2>nul | findstr /C:"html" /C:"portainer" >nul
if %errorlevel% equ 0 (
    echo Portainer отвечает
) else (
    echo Portainer НЕ отвечает
)
echo.

echo ==========================================
echo   Результаты проверки
echo ==========================================
echo.
pause

