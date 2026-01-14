# Agent Mission Briefs

Эта папка содержит подробные ТЗ (технические задания) для специализированных AI-агентов, работающих над проектом Structura.

## Структура

### Frontend Developer Agent
**Папка:** `frontend/`  
**Модель:** Claude 3.5 Sonnet  
**Зона ответственности:** React, Refine.dev, UI/UX, Speckle Viewer  

**Основная задача:**
Реализовать динамический каталог проектов и убрать хардкод ID моделей из конфигурации.

**Файлы:**
- `MISSION_BRIEF.md` - Полное ТЗ с контекстом, технологиями, roadmap

---

### Backend Integration Agent
**Папка:** `backend/`  
**Модель:** Claude 3.5 Sonnet  
**Зона ответственности:** Python, FastAPI, PostgreSQL, Docker  

**Основная задача:**
Настроить автоматическую синхронизацию через Speckle Webhooks, чтобы данные обновлялись без ручного вмешательства.

**Файлы:**
- `MISSION_BRIEF.md` - Полное ТЗ с контекстом, технологиями, roadmap

---

## Как Использовать

1. **Создайте новый чат** с Claude 3.5 Sonnet
2. **Скопируйте содержимое** соответствующего `MISSION_BRIEF.md`
3. **Отправьте как первое сообщение** в чат
4. Агент получит полный контекст и начнет работу

## Координация

**Architect Chat (Gemini 2.0 Flash Thinking):**
- Принимает архитектурные решения
- Координирует работу агентов
- Обновляет `docs/technical/CURRENT_STATE.md`

**Frontend Agent:**
- Реализует UI для каталога проектов
- Динамический Viewer

**Backend Agent:**
- Webhooks для auto-sync
- Улучшения адаптера

**DevOps Agent (при необходимости):**
- Проблемы с серверами
- Docker, Traefik, SSL
- Мониторинг

---

## Контекстные Файлы

Все агенты должны изучить перед началом работы:
- `docs/technical/CURRENT_STATE.md` - Текущее состояние системы
- `docs/technical/ARCHITECTURE.md` - Общая архитектура
- `docs/reports/2026-01-13_speckle_fixes_report.md` - DevOps отчет (auth, memory)
- `CREDENTIALS.md` - Токены и доступы

---

**Обновлено:** 13 января 2026
