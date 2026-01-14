# Structura Project - Master Credentials

> [!CAUTION]
> **SENSITIVE DATA - DO NOT COMMIT TO GIT**
> This file contains production passwords, keys, and access details.

---

## 1. Infrastructure (VPS & DNS)

**Server (Timeweb):**
- **IP Address:** `109.73.194.38`
- **SSH:** `ssh root@109.73.194.38`
- **Root Password:** `r51Gy-Hu_axM,c`
- **Project Path:** `/root/structura`

**Domains (Cloudflare):**
- **Main:** `structura-most.ru`
- **Email:** `scccoco55@gmail.com`
- **Mode:** DNS Only (No Proxy)
- **Subdomains:**
    - `cloud` -> Nextcloud
    - `bim` -> BIMserver
    - `viewer` -> xeokit Viewer
    - `port` -> Portainer

---

## 2. Global Access

**Docker Hub:**
- **User:** `structuramost`
- **Pass:** `Str#2025_Docker!Vps`
- **Email:** `scccoco55@gmail.com`

**GitHub:**
- **Repo:** `https://github.com/Scccoco/structura.git`
- **SSH:** `git@github.com:Scccoco/structura.git`

---

## 3. Services & Databases

### A. Digital Twin Core (Structura)
*The main custom application logic.*

**PostgreSQL (postgres_speckle):**
- **Host:** `localhost` / `postgres_speckle`
- **Port:** `5432`
- **User:** `speckle`
- **Pass:** `speckle_pass` (Local) / `${POSTGRES_SPECKLE_PASSWORD}` (VPS)
- **DBs:** `speckle` (Server), `structura` (App Data)

**PostgREST (API):**
- **URL:** `http://localhost:3002`
- **Anon Role:** `web_anon`
- **JWT Secret:** `super-secret-jwt-token-with-at-least-32-characters-long`

**Refine Frontend:**
- **Dev:** `http://localhost:5173`
- **Prod (Traefik):** (Served via Nginx/Caddy usually, or generic web container)

**Supabase (Auth & Realtime):**
- **Auth URL:** `http://localhost:9999`
- **Studio URL:** `http://localhost:3003`
- **Keys:**
    - Anon: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
    - Service: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

### B. Speckle Server (BIM Data)
*Geometry storage and processing.*

- **Frontend:** `http://localhost:3000`
- **API:** `http://localhost/graphql`
- **MinIO (S3):** `http://localhost:9000`
    - User/Pass: `minioadmin` / `minioadmin`

**Personal Access Token (Tekla Connector):**
- **Token:** `b47015ff123fc23131070342b14043c1b8a657dfb7`
- **Name:** `test`
- **Scopes:** `profile:read`, `profile:write`, `profile:email`, `server:stats`, `streams:read`, `streams:write`, `users:read`

### C. Nextcloud (Docs)
*File storage.*

**Access:**
- **VPS:** `https://cloud.structura-most.ru`
    - User: `admin`
    - Pass: `admin`
- **Local:** `http://localhost/nextcloud`
    - User: `admin_local`
    - Pass: `NextcloudLocal_2025!`

**Database (postgres_nc):**
- **DB:** `nextcloud`
- **User:** `nextcloud`
- **Pass:** `nextcloud_secure_pass_456` (VPS) / `nextcloud_pass` (Local)

**Config Secrets:**
- Instance ID: `oceangct92hm`
- Salt: `di+hj9AohUypTmr+yzB1wbR2z4IlLN`
- Secret: `n7KAL/Bcz+OWm/764qpaxDejfAzanLIb2NXcurx5phB6nj9u`

---

## 4. Management Tools

**Portainer (Docker UI):**
- **VPS:** `https://port.structura-most.ru`
- **Local:** `http://localhost:9000`
- **Pass:** Set on first login.

**pgAdmin (DB UI):**
- **URL:** `http://localhost:5050`
- **User:** `admin@structura.ru`
- **Pass:** `admin`

**Redis (Cache):**
- **Port:** `6379`
- **Pass:** `redis_secure_pass_789` (VPS) / `redis_pass` (Local)

**Traefik (Proxy):**
- **Dashboard:** `http://localhost:8080` (Local only)

---

## 5. Deployment Cheatsheet

**Local (Windows):**
```powershell
# Start
./start-dev.bat
# Restart
cd docker; docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml restart
```

**VPS (Linux):**
```bash
# Start
cd /root/structura/docker && docker-compose up -d
# Update
cd /root/structura && git pull && cd docker && docker-compose up -d
```
