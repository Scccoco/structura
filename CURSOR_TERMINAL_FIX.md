# Исправление терминала Cursor

## Проблема
PowerShell в Cursor добавляет символы "qс" перед каждой командой, что приводит к ошибкам:
```
qсcd docker; docker compose ps
qсdocker compose ps
```

## Причина
Проблема с кодировкой при передаче команд из Cursor в PowerShell терминал.

## Решения

### Решение 1: Использовать Command Prompt (Рекомендуется)

1. В Cursor откройте новый терминал
2. Нажмите на стрелку `▼` рядом с кнопкой `+`
3. Выберите **"Command Prompt"** вместо PowerShell
4. Все команды будут работать корректно

### Решение 2: Изменить настройки Cursor

1. Откройте настройки: `File → Preferences → Settings` или `Ctrl+,`
2. Найдите `terminal.integrated.defaultProfile.windows`
3. Измените на: `Command Prompt`
4. Перезапустите Cursor

### Решение 3: Добавить в settings.json

1. Откройте Command Palette: `Ctrl+Shift+P`
2. Введите: `Preferences: Open User Settings (JSON)`
3. Добавьте:
```json
{
  "terminal.integrated.defaultProfile.windows": "Command Prompt",
  "terminal.integrated.profiles.windows": {
    "Command Prompt": {
      "path": "C:\\Windows\\System32\\cmd.exe",
      "args": ["/K", "chcp 65001"]
    }
  }
}
```
4. Сохраните и перезапустите Cursor

### Решение 4: Использовать WSL (если установлен)

1. Установите WSL: `wsl --install`
2. В Cursor выберите WSL терминал
3. Все команды будут работать как в Linux

## Временное решение
Используйте `.bat` файлы для выполнения команд — они работают корректно.

## Проверка

После применения решения выполните:
```cmd
cd docker
docker compose ps
```

Если команда выполнилась без ошибки — терминал исправлен!

