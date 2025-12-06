# Скрипт для запуска команд через терминал Cursor
# Исправление кодировки
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Функция для безопасного выполнения команд
function Run-Command {
    param([string]$Command)
    try {
        Invoke-Expression $Command
    } catch {
        Write-Host "Ошибка выполнения команды: $_" -ForegroundColor Red
    }
}

# Проверка Docker
Write-Host "Проверка Docker..." -ForegroundColor Yellow
$dockerVersion = & docker --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker найден: $dockerVersion" -ForegroundColor Green
} else {
    Write-Host "Docker не найден!" -ForegroundColor Red
    exit 1
}

# Переход в директорию docker
Set-Location docker

# Проверка статуса
Write-Host "`nПроверка статуса контейнеров..." -ForegroundColor Yellow
& docker compose ps

# Запуск если нужно
Write-Host "`nЗапуск контейнеров..." -ForegroundColor Yellow
& docker compose --env-file ..\.env up -d

Set-Location ..

Write-Host "`nГотово!" -ForegroundColor Green

