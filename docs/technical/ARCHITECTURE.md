# System Architecture

## component Overview

### 1. Traefik (Reverse Proxy)
- **Role**: Single entry point for all services.
- **Ports**: 80 (HTTP), 443 (HTTPS), 8080 (Dashboard).
- **Features**:
  - Automatic routing
  - SSL/TLS management (Let's Encrypt)
  - Load balancing

### 2. Portainer
- **Role**: Docker management UI.
- **Access**: https://port.structura-most.ru
- **Features**: Container management, logs, resource monitoring.

### 3. PostgreSQL (2 Instances)
- **postgres_nc**: Database for Nextcloud.
- **postgres_speckle**:
  - `speckle` db: For Speckle Server.
  - `structura` db: For Digital Twin App (Business logic).
- **Version**: 15-alpine.

### 4. Redis
- **Role**: Caching and locking.
- **Used by**: Nextcloud and Speckle Server.

### 5. Speckle Server (BIM Engine)
- **Role**: Storage and management of BIM models (IFC/Revit/Tekla).
- **Access**: https://speckle.structura-most.ru
- **Features**:
  - Version control (Streams/Commits)
  - GraphQL API
  - Object-based storage

### 6. Nextcloud (CDE)
- **Role**: File storage (PDF, Excel, Photos).
- **Access**: https://cloud.structura-most.ru
- **Features**: WebDAV API, Mobile App, Versioning.

### 7. Refine Frontend (App)
- **Role**: Main User Interface.
- **Access**: https://app.structura-most.ru
- **Stack**: React, Ant Design, Speckle Viewer SDK.
- **Features**:
  - Registers Tasks and Acts
  - Visualizes 3D Models (via Speckle)
  - Manages Materials

---

## Network Architecture

```
Internet
   |
   v
[Traefik:80/443]
   |
   +---> [Nextcloud:80] <---> [PostgreSQL NC] <---> [Redis]
   |
   +---> [Speckle Server:3000] <---> [PostgreSQL Speckle] <---> [MinIO]
   |                                      ^
   |                                      |
   +---> [Refine App:80] -----------------+---> [PostgREST:3000]
   |
   +---> [Portainer:9000]
```

---

## Data Flows

### 1. BIM Model Upload
1. User -> Speckle Frontend -> Upload IFC/Revit
2. Speckle Server -> MinIO (Geometry)
3. Speckle Server -> PostgreSQL (Metadata)

### 2. Business Data Entry
1. User -> Refine App -> PostgREST API
2. PostgREST -> PostgreSQL `structura` DB
3. Triggers update status

### 3. File Processing
1. User -> Nextcloud -> Upload Excel/PDF
2. File Processor (Worker) -> Scans Nextcloud via WebDAV
3. File Processor -> Parses data -> Writes to PostgreSQL

---

## Storage & Configuration

### Volumes (`docker/data/`)
- `postgres_speckle/`: Main DB data.
- `postgres_nc/`: Nextcloud DB.
- `nextcloud/`: File storage.
- `minio/`: BIM Geometry.
- `redis/`: Cache.

### Security
- **Production**: HTTPS enabled via Traefik.
- **Passwords**: Managed via `.env` and `CREDENTIALS.md`.

---

## Backup Strategy
1. **Databases**: Daily pg_dump of `speckle`, `structura`, `nextcloud` DBs.
2. **Files**: Backup of `data/nextcloud` and `data/minio`.
