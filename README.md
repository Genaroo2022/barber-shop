# Barber Shop

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

## Estado actual importante

- El backend ejecuta migraciones automaticamente al iniciar (Flyway via `SchemaMigrationConfig`).
- Si la DB local esta vacia, se aplican `V1`, `V2` y `V3` al levantar backend.
- Capacidades relevantes:
  - CRUD de servicios en admin
  - Gestion de galeria en admin y consumo publico (incluye carga multiple y borrado masivo en admin)
  - CRUD de ingresos manuales en admin (incluye propinas)
  - Historial mensual en tabs de admin (`Estadisticas`, `Turnos`, `Ingresos`) con selector de mes
  - Descargas CSV filtradas por mes seleccionado
  - Admin turnos: editar, cambiar estado y eliminar
  - Admin clientes: editar y eliminar
  - Formulario publico de turnos con validacion por campo (errores visuales en rojo)
  - Disponibilidad reactiva de horarios en booking publico (`/api/public/appointments/occupied`)
  - Polling en admin de turnos + toast cuando llegan turnos nuevos (sin recargar pagina)
  - Rate limiting para login y para reservas publicas por IP

## Modelo de dominio

- `clients`: clientes unicos por telefono
- `services`: catalogo de servicios con precio y duracion
- `appointments`: turnos vinculados a cliente y servicio
- `admin_users`: usuarios administradores
- `manual_income_entries`: ingresos manuales + propinas cargados por admin

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
$env:APP_SECURITY_BOOKING_MAX_REQUESTS_PER_MINUTE="<int>"
$env:APP_SECURITY_BOOKING_MAX_REQUESTS_PER_HOUR="<int>"
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

## Deploy (Neon + Render + Vercel/Netlify)

### 1) Neon -> `DB_URL` JDBC para Spring

Neon entrega una URL tipo `postgresql://...`. En Spring debes usar formato JDBC:

```env
DB_URL=jdbc:postgresql://<neon-host>/<db>?sslmode=require&channelBinding=require
DB_USER=<neon-user>
DB_PASSWORD=<neon-password>
```

Nota: si `channelBinding` no es aceptado por el driver en tu entorno, deja solo `?sslmode=require`.

### 2) Backend en Render (Web Service)

Este repo incluye `render.yaml` para deploy con Docker usando `backend/Dockerfile`.

Variables obligatorias en Render:

```env
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:postgresql://<neon-host>/<db>?sslmode=require&channelBinding=require
DB_USER=<neon-user>
DB_PASSWORD=<neon-password>
JWT_SECRET_BASE64=<secret-base64-256-bit-o-mas>
CORS_ALLOWED_ORIGINS=https://<tu-frontend>.vercel.app,https://<tu-frontend>.netlify.app
```

Opcional:

```env
JWT_EXPIRATION_SECONDS=28800
PORT=8080
```

Health check recomendado en Render: `/api/public/services`.

### 3) Frontend en Vercel o Netlify

Variables frontend:

```env
VITE_API_BASE_URL=https://<tu-backend-render>.onrender.com
VITE_CLOUDINARY_CLOUD_NAME=<tu-cloud-name>
VITE_CLOUDINARY_UPLOAD_PRESET=<tu-upload-preset-unsigned>
```

El repo incluye archivos para SPA routing:
- `vercel.json`
- `netlify.toml`

## Endpoints principales

Publicos:
- `GET /api/public/services`
- `GET /api/public/gallery`
- `GET /api/public/appointments/occupied?serviceId=<UUID>&date=<YYYY-MM-DD>`
- `POST /api/public/appointments`
- `POST /api/auth/login`

Admin (JWT Bearer):
- `GET /api/admin/appointments`
- `PUT /api/admin/appointments/{id}`
- `PATCH /api/admin/appointments/{id}/status`
- `DELETE /api/admin/appointments/{id}`
- `GET /api/admin/metrics/overview`
- `GET /api/admin/metrics/income`
- `POST /api/admin/metrics/income/manual`
- `PUT /api/admin/metrics/income/manual/{id}`
- `DELETE /api/admin/metrics/income/manual/{id}`
- `GET /api/admin/metrics/clients` (compat endpoint)
- `GET /api/admin/clients`
- `PUT /api/admin/clients/{id}`
- `DELETE /api/admin/clients/{id}`
- `GET /api/admin/services`
- `POST /api/admin/services`
- `PUT /api/admin/services/{id}`
- `DELETE /api/admin/services/{id}`
- `GET /api/admin/gallery`
- `POST /api/admin/gallery`
- `PUT /api/admin/gallery/{id}`
- `DELETE /api/admin/gallery/{id}`

## Troubleshooting local rapido

### 1) Error JWT weak key

Si ves `WeakKeyException`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\gen-jwt-secret.ps1
```

Copia el valor en `.env` como `JWT_SECRET_BASE64` y reinicia Docker.

### 2) Docker snapshot/cache corrupto al build frontend

Si aparece error tipo `parent snapshot ... does not exist`:

```powershell
docker compose down --remove-orphans
docker builder prune -af
docker compose build --no-cache frontend
docker compose up -d
```

### 3) Frontend/Backend no responden despues de cambios

```powershell
docker compose ps
docker compose logs backend --tail=200
docker compose logs frontend --tail=200
```

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
- En admin, los KPIs/turnos/ingresos se consultan por mes con input tipo calendario mensual (`YYYY-MM`).
- Los botones `Descargar` de `Turnos` e `Ingresos` exportan solo el mes seleccionado.
- En Admin > Turnos, hay refresco automatico periodico y toast de nuevos turnos.
- En booking publico, un horario reservado desaparece inmediatamente y tambien se recalcula automaticamente desde backend.

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
