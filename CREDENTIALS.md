# Digital Twin - Учетные данные и доступы

## PostgreSQL

**Главная БД (postgres_speckle):**
- Host: `localhost` (внешний) / `postgres_speckle` (внутри Docker)
- Port: `5432`
- User: `speckle`
- Password: `speckle_pass`

**Базы данных:**
- `speckle` - Speckle Server (не трогать)
- `structura` - Digital Twin система

**Роли PostgREST:**
- `web_anon` - анонимный доступ (SELECT)
- `web_user` - аутентифицированный (CRUD)
- `service_role` - полный доступ

---

## PostgREST

- URL: `http://localhost:3002`
- DB URI: `postgres://speckle:speckle_pass@postgres_speckle:5432/structura`
- Anon Role: `web_anon`
- JWT Secret: `super-secret-jwt-token-with-at-least-32-characters-long`

---

## Supabase

**Auth:**
- URL: `http://localhost:9999`
- JWT Secret: `super-secret-jwt-token-with-at-least-32-characters-long`

**Studio:**
- URL: `http://localhost:3003`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
- Service Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

---

## pgAdmin

- URL: `http://localhost:5050`
- Email: `admin@structura.ru`
- Password: `admin`

**Подключение к БД:**
- Host: `postgres_speckle`
- Port: `5432`
- Database: `structura`
- Username: `speckle`
- Password: `speckle_pass`

---

## Speckle Server

- Frontend: `http://localhost:3000`
- GraphQL API: `http://localhost/graphql`
- MinIO (S3): `http://localhost:9000`
  - Root User: `minioadmin`
  - Root Password: `minioadmin`

---

## Nextcloud

- URL: `http://localhost/nextcloud`
- Admin User: `admin`
- Admin Password: (создается при первом запуске)
- WebDAV: `http://localhost/nextcloud/remote.php/dav`

---

## Redis

- Host: `localhost` / `redis`
- Port: `6379`
- Password: `redis_pass`

---

## Traefik Dashboard

- URL: `http://localhost:8080`
- No auth (dev режим)

---

## Portainer

- URL: `http://localhost:9000`
- Admin password: создается при первом входе

---

## Refine Frontend

- Dev Server: `http://localhost:5173`
- API Endpoint: `http://localhost:3002` (PostgREST)

---

**Обновлено:** 31.12.2024 05:56
