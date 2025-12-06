@echo off
chcp 65001 >nul
echo ==========================================
echo   Запуск BIM-стека
echo ==========================================
echo.

REM Проверка Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo Ошибка: Docker не установлен или не запущен!
    pause
    exit /b 1
)

REM Создание директорий
echo Создание директорий для данных...
if not exist "data\traefik" mkdir "data\traefik"
if not exist "data\portainer" mkdir "data\portainer"
if not exist "data\postgres_bim" mkdir "data\postgres_bim"
if not exist "data\postgres_nc" mkdir "data\postgres_nc"
if not exist "data\redis" mkdir "data\redis"
if not exist "data\bimserver" mkdir "data\bimserver"
if not exist "data\nextcloud" mkdir "data\nextcloud"
if not exist "config\traefik\certs" mkdir "config\traefik\certs"

REM Создание .env файла если его нет
if not exist ".env" (
    echo Создание .env файла...
    copy env_template.txt .env >nul 2>&1
    if not exist ".env" (
        echo POSTGRES_BIM_DB=bimserver > .env
        echo POSTGRES_BIM_USER=bimserver >> .env
        echo POSTGRES_BIM_PASSWORD=bimserver_pass >> .env
        echo POSTGRES_NC_DB=nextcloud >> .env
        echo POSTGRES_NC_USER=nextcloud >> .env
        echo POSTGRES_NC_PASSWORD=nextcloud_pass >> .env
        echo REDIS_PASSWORD=redis_pass >> .env
        echo NEXTCLOUD_ADMIN_USER=admin >> .env
        echo NEXTCLOUD_ADMIN_PASSWORD=admin >> .env
    )
    echo ВНИМАНИЕ: Используются значения по умолчанию. Измените пароли в .env для продакшена!
)

REM Переход в директорию docker и запуск
cd docker
echo.
echo Запуск контейнеров...
docker compose --env-file ..\.env up -d

cd ..

echo.
echo ==========================================
echo   Стек запущен!
echo ==========================================
echo.
echo Доступные сервисы:
echo   - Nextcloud:    http://localhost/nextcloud
echo   - BIMserver:    http://localhost/bimserver
echo   - xeokit Viewer: http://localhost/viewer
echo   - Portainer:    http://localhost/portainer
echo   - Traefik Dashboard: http://localhost:8080
echo.
echo Для просмотра логов: cd docker ^&^& docker compose logs -f
echo Для остановки: .\stop.bat
echo.
pause

