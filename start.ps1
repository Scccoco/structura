# PowerShell скрипт запуска BIM-стека для Windows

# Исправление кодировки для корректной работы в Cursor
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Запуск BIM-стека" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Ошибка: Docker не установлен!" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue) -and 
    -not (docker compose version 2>$null)) {
    Write-Host "Ошибка: Docker Compose не установлен!" -ForegroundColor Red
    exit 1
}

# Создание необходимых директорий
Write-Host "Создание директорий для данных..." -ForegroundColor Yellow
$directories = @(
    "data\traefik",
    "data\portainer",
    "data\postgres_bim",
    "data\postgres_nc",
    "data\redis",
    "data\bimserver",
    "data\nextcloud",
    "config\traefik\certs"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Проверка .env файла
if (-not (Test-Path ".env")) {
    Write-Host "Создание .env файла из примера..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "ВНИМАНИЕ: Используются значения по умолчанию. Измените пароли в .env для продакшена!" -ForegroundColor Yellow
    } else {
        Write-Host "Предупреждение: .env.example не найден. Создайте .env вручную." -ForegroundColor Yellow
    }
}

# Переход в директорию docker
Set-Location docker

# Запуск контейнеров
Write-Host "Запуск контейнеров..." -ForegroundColor Yellow
if (docker compose version 2>$null) {
    docker compose --env-file ..\.env up -d
} else {
    docker-compose --env-file ..\.env up -d
}

Set-Location ..

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Стек запущен!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Доступные сервисы:" -ForegroundColor Cyan
Write-Host "  - Nextcloud:    http://localhost/nextcloud" -ForegroundColor White
Write-Host "  - BIMserver:    http://localhost/bimserver" -ForegroundColor White
Write-Host "  - xeokit Viewer: http://localhost/viewer" -ForegroundColor White
Write-Host "  - Portainer:    http://localhost/portainer" -ForegroundColor White
Write-Host "  - Traefik Dashboard: http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "Для просмотра логов: docker compose -f docker/docker-compose.yml logs -f" -ForegroundColor Gray
Write-Host "Для остановки: .\stop.ps1" -ForegroundColor Gray
Write-Host ""

