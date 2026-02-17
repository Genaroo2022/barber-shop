# Style Book Pro

Aplicacion para gestion de turnos de barberia:
- Frontend: React + Vite + TypeScript (`/`)
- Backend: Java 21 + Spring Boot 4.0.2 (`/backend`)

## Requisitos

- Node.js 18+
- npm 9+
- Java 21
- Maven 3.9+
- PostgreSQL 14+

## Arranque rapido con Docker

1. Copia variables de ejemplo:

```powershell
Copy-Item .env.docker.example .env
```

2. Edita `.env` con valores propios (especialmente passwords y JWT secret).

3. Levanta servicios:

```powershell
docker compose up --build
```

Servicios:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- PostgreSQL: `localhost:5432` (db: `style_book`, user: `postgres`, pass: `postgres`)

Para detener:

```powershell
docker compose down
```

## Modelo de dominio

- `clients`: clientes unicos por telefono
- `services`: catalogo de servicios con precio y duracion
- `appointments`: turnos vinculados a cliente y servicio
- `admin_users`: usuarios administradores

Estados de turno: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`.

## Backend (Spring Boot)

Ruta: `backend`

Perfiles:
- `dev` (default): permite bootstrap de admin para entorno local.
- `prod`: no tiene defaults de DB/JWT y desactiva bootstrap automatico.

### Variables de entorno (backend)

Ejemplo (PowerShell):

```powershell
$env:SPRING_PROFILES_ACTIVE="dev"
$env:DB_URL="jdbc:postgresql://localhost:5432/style_book"
$env:DB_USER="<db-user>"
$env:DB_PASSWORD="<db-password>"
$env:JWT_SECRET_BASE64="<base64-secret-256-bit-o-mas>"
$env:CORS_ALLOWED_ORIGINS="http://localhost:5173"
```

Opcionales:

```powershell
$env:BOOTSTRAP_ADMIN_ENABLED="<true|false>"
$env:BOOTSTRAP_ADMIN_EMAIL="<admin-email>"
$env:BOOTSTRAP_ADMIN_PASSWORD="<admin-password>"
```

### Ejecutar backend

```powershell
mvn -f backend/pom.xml spring-boot:run
```

Al iniciar:
- Flyway crea/actualiza esquema.
- Se insertan servicios base.
- Si no existe admin, se crea uno con `BOOTSTRAP_ADMIN_EMAIL/PASSWORD`.

Base URL backend: `http://localhost:8080`

### Produccion (minimo recomendado)

```powershell
$env:SPRING_PROFILES_ACTIVE="prod"
$env:DB_URL="jdbc:postgresql://<host>:5432/style_book"
$env:DB_USER="<user>"
$env:DB_PASSWORD="<strong-password>"
$env:JWT_SECRET_BASE64="<base64-secret-256-bit-o-mas>"
$env:CORS_ALLOWED_ORIGINS="https://tu-dominio.com"
mvn -f backend/pom.xml spring-boot:run
```

En `prod`, `app.bootstrap.admin.enabled=false` por defecto.

Plantillas sugeridas:
- Backend: `backend/.env.prod.example`
- Frontend: `.env.prod.example`

Generar secreto JWT fuerte (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\gen-jwt-secret.ps1
```

Usa la salida en `JWT_SECRET_BASE64`.

## Frontend (React)

Ruta: raiz del repo

### Variables de entorno (frontend)

Archivo `.env`:

```env
VITE_API_BASE_URL="http://localhost:8080"
```

### Ejecutar frontend

```powershell
npm install
npm run dev
```

URL frontend: `http://localhost:5173`

## Endpoints principales

Publicos:
- `GET /api/public/services`
- `POST /api/public/appointments`
- `POST /api/auth/login`

Admin (JWT Bearer):
- `GET /api/admin/appointments`
- `PATCH /api/admin/appointments/{id}/status`
- `GET /api/admin/metrics/overview`
- `GET /api/admin/metrics/income`
- `GET /api/admin/metrics/clients`

## Pruebas rapidas con curl

### 1) Login admin

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<admin-password>"}'
```

Guarda `accessToken` de la respuesta.

### 2) Listar servicios

```bash
curl http://localhost:8080/api/public/services
```

### 3) Crear turno

```bash
curl -X POST http://localhost:8080/api/public/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clientName":"Juan Perez",
    "clientPhone":"+5491122334455",
    "serviceId":"<SERVICE_ID>",
    "appointmentAt":"2026-02-20T14:30:00.000Z"
  }'
```

### 4) Consultar turnos admin

```bash
curl http://localhost:8080/api/admin/appointments \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 5) Cambiar estado de turno

```bash
curl -X PATCH http://localhost:8080/api/admin/appointments/<APPOINTMENT_ID>/status \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED"}'
```

## Notas

- El frontend ya consume el backend Spring (no depende de Supabase para login/agenda/admin).
- Si cambias la URL/puerto del backend, actualiza `VITE_API_BASE_URL`.

## Pre-commit secret scan (recommended)

This repository includes a local git hook to block accidental secret commits.

Enable it once in repo root:

```powershell
git config core.hooksPath .githooks
```

Manual run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\precommit-secret-scan.ps1
```
