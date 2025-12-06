# Быстрый старт

## Windows

1. **Убедитесь, что Docker Desktop запущен**

2. **Запустите стек:**
   ```powershell
   .\start.ps1
   ```

3. **Откройте в браузере:**
   - http://localhost/nextcloud - создайте администратора
   - http://localhost/bimserver - загрузите IFC-файл
   - http://localhost/viewer - просмотр моделей
   - http://localhost/portainer - управление контейнерами

## Linux/Mac

1. **Сделайте скрипты исполняемыми:**
   ```bash
   chmod +x start.sh stop.sh reset.sh
   ```

2. **Запустите стек:**
   ```bash
   ./start.sh
   ```

3. **Откройте в браузере те же адреса**

## Первые шаги

### 1. Настройка Nextcloud
- Откройте http://localhost/nextcloud
- Создайте администратора (логин/пароль из .env или по умолчанию: admin/admin)
- Загрузите файлы через веб-интерфейс

### 2. Загрузка IFC в BIMserver
- Откройте http://localhost/bimserver
- Войдите или создайте пользователя
- Создайте новый проект: Projects → New Project
- Загрузите IFC: выберите проект → Checkin → Upload IFC file
- Запомните Project ID и Revision ID

### 3. Просмотр модели
- Откройте http://localhost/viewer
- Нажмите "Список проектов" для получения ID
- Введите Project ID и Revision ID
- Нажмите "Загрузить модель"

## Остановка

```powershell
# Windows
.\stop.ps1

# Linux/Mac
./stop.sh
```

## Сброс данных

⚠️ **ВНИМАНИЕ: Удалит все данные!**

```powershell
# Windows
.\reset.ps1

# Linux/Mac
./reset.sh
```

## Просмотр логов

```bash
cd docker
docker compose logs -f [service_name]
```

Примеры:
- `docker compose logs -f bimserver` - логи BIMserver
- `docker compose logs -f nextcloud` - логи Nextcloud
- `docker compose logs -f` - все логи

## Решение проблем

### Порт 80 занят
Остановите другие веб-серверы (IIS, Apache, nginx) или измените порты в `docker/docker-compose.yml`

### Контейнеры не запускаются
```bash
cd docker
docker compose ps
docker compose logs
```

### Недостаточно памяти
Увеличьте лимит памяти Docker Desktop (минимум 4GB рекомендуется)

### BIMserver не загружает модели
Проверьте логи: `docker compose logs bimserver`
Убедитесь, что у контейнера достаточно памяти (минимум 2GB)

