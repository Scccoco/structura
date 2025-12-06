# PowerShell скрипт остановки BIM-стека для Windows

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Остановка BIM-стека" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Переход в директорию docker
Set-Location docker

# Остановка контейнеров
if (docker compose version 2>$null) {
    docker compose --env-file ..\.env down
} else {
    docker-compose --env-file ..\.env down
}

Set-Location ..

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Стек остановлен" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

