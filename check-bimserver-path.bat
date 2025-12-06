@echo off
chcp 65001 >nul
echo ==========================================
echo   ПРОВЕРКА ПУТИ BIMserver
echo ==========================================
echo.

cd docker

echo Проверяю разные пути в BIMserver:
echo.

echo [1] GET / (корень):
docker exec bimserver curl -s -o nul -w "HTTP: %%{http_code}\n" http://localhost:8080/ 2>nul
echo.

echo [2] GET /bimserver:
docker exec bimserver curl -s -o nul -w "HTTP: %%{http_code}\n" http://localhost:8080/bimserver 2>nul
echo.

echo [3] GET /bimserver/:
docker exec bimserver curl -s -o nul -w "HTTP: %%{http_code}\n" http://localhost:8080/bimserver/ 2>nul
echo.

echo [4] Проверка содержимого webapps:
docker exec bimserver ls -la /usr/local/tomcat/webapps/ 2>nul
echo.

echo [5] Проверка логов BIMserver (последние 10 строк):
docker compose logs --tail=10 bimserver
echo.

pause

