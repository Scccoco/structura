# PowerShell скрипт сброса данных BIM-стека для Windows

Write-Host "==========================================" -ForegroundColor Red
Write-Host "  ВНИМАНИЕ: Сброс всех данных!" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Это действие удалит ВСЕ данные:" -ForegroundColor Yellow
Write-Host "  - Базы данных PostgreSQL" -ForegroundColor Yellow
Write-Host "  - Файлы Nextcloud" -ForegroundColor Yellow
Write-Host "  - Модели BIMserver" -ForegroundColor Yellow
Write-Host "  - Кеш Redis" -ForegroundColor Yellow
Write-Host "  - Все настройки" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Вы уверены? Введите 'yes' для подтверждения"

if ($confirm -ne "yes") {
    Write-Host "Отменено." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Остановка контейнеров..." -ForegroundColor Yellow

# Переход в директорию docker
Set-Location docker

# Остановка и удаление контейнеров
if (docker compose version 2>$null) {
    docker compose --env-file ..\.env down -v
} else {
    docker-compose --env-file ..\.env down -v
}

Set-Location ..

Write-Host ""
Write-Host "Удаление данных..." -ForegroundColor Yellow

# Удаление директорий с данными
$dataDirs = @(
    "data\traefik",
    "data\portainer",
    "data\postgres_bim",
    "data\postgres_nc",
    "data\redis",
    "data\bimserver",
    "data\nextcloud"
)

foreach ($dir in $dataDirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Данные удалены" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Для запуска заново: .\start.ps1" -ForegroundColor Cyan
Write-Host ""

