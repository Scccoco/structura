@echo off
chcp 65001 >nul
cls
echo ============================================
echo       ЛОКАЛЬНАЯ РАЗРАБОТКА - ЗАПУСК
echo ============================================
cd /d %~dp0docker

echo Останавливаем все сервисы...
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml down 2>nul
docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml down 2>nul

echo.
echo Запускаем локальные сервисы...
docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d

echo.
echo ============================================
echo           СЕРВИСЫ ДОСТУПНЫ:
echo ============================================
echo Nextcloud:     http://localhost/nextcloud
echo BIMserver:     http://localhost/bimserver/
echo xeokit Viewer: http://localhost/viewer/
echo Portainer:     http://localhost:9000
echo.
echo Traefik Dashboard: http://localhost:8080
echo ============================================
pause

