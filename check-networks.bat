@echo off
chcp 65001 >nul
echo ========================================
echo   Проверка сетей контейнеров
echo ========================================
echo.
echo === Traefik ===
docker inspect traefik --format="Networks: {{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}"
echo.
echo === Nextcloud ===
docker inspect nextcloud --format="Networks: {{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}"
echo.
echo === BIMserver ===
docker inspect bimserver --format="Networks: {{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}"
echo.
echo === xeokit ===
docker inspect xeokit --format="Networks: {{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}"
echo.
echo ========================================
echo   Если Traefik и Nextcloud в разных сетях - это проблема!
echo ========================================
pause

