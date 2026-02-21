# AGENTS.md

## Project Overview

This repository contains a personal project for barbershop appointment management.

Core business capabilities:
- Public booking flow for clients
- Admin login and protected backoffice
- Appointment lifecycle management (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`)
- Admin metrics (appointments, clients, income)
- Manual income management in admin (off-system cuts + tips)
- Monthly history views for `stats`, `appointments`, and `income`

## Tech Stack

Frontend:
- React 18
- TypeScript
- Vite
- Tailwind CSS + shadcn/ui components
- React Router

Backend:
- Java 21
- Spring Boot 4.0.2
- Spring Security (JWT)
- Spring Data JPA + Hibernate
- Flyway migrations
- PostgreSQL

Tooling:
- Maven (backend)
- npm (frontend)
- Docker + docker compose

Deployment (current):
- Backend: Render (Web Service)
- Frontend: Vercel
- Database: Neon (PostgreSQL)
- Netlify: not in use

## High-Level Architecture

### Frontend (`/`)
- `src/pages`: route-level pages (`Index`, `Login`, `Admin`)
- `src/components/landing`: public site sections, booking form
- `src/components/admin`: admin tabs (appointments, clients, stats, income)
- `src/lib/api.ts`: backend HTTP client and DTO typing
- `src/lib/auth.ts`: token storage/auth helpers

### Backend (`/backend`)
- `domain/entity`: JPA entities
- `domain/enums`: domain enums
- `repository`: Spring Data repositories
- `application/service`: use-case/business services
- `web`: controllers, DTOs, exception mapping
- `security`: JWT service/filter
- `config`: Spring security and bootstrap configuration
- `src/main/resources/db/migration`: Flyway SQL migrations

### Data Model (Backend source of truth)
- `clients`
- `services`
- `appointments`
- `admin_users`
- `manual_income_entries`

## Runtime Profiles

Backend profiles:
- `dev` (default): local defaults, optional admin bootstrap
- `prod`: no insecure defaults, admin bootstrap disabled

Config files:
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/application-dev.yml`
- `backend/src/main/resources/application-prod.yml`

## Local Development

### Recommended (all services with Docker)
Run in repo root:
```powershell
docker compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

### Manual mode
Backend:
```powershell
mvn -f backend/pom.xml spring-boot:run
```

Frontend:
```powershell
npm install
npm run dev
```

## Security Notes

- JWT secret must be strong in production (`JWT_SECRET_BASE64`).
- Use `scripts/gen-jwt-secret.ps1` to generate a secure Base64 secret.
- Default local bootstrap credentials are for development only.
- Never hardcode production secrets in tracked files.

## API Conventions

Public endpoints:
- `GET /api/public/services`
- `POST /api/public/appointments`
- `POST /api/auth/login`

Admin endpoints require Bearer token:
- `/api/admin/**`

## Testing & Validation

Backend:
```powershell
mvn -f backend/pom.xml test
```

Frontend:
```powershell
npm run build
```

## Guidance for AI Agents

1. Preserve current architecture style:
- Frontend should call backend only through `src/lib/api.ts`.
- Backend business rules belong in `application/service`, not controllers.

2. Avoid regressions:
- Keep appointment status transitions consistent with service rules.
- Keep DB schema aligned with JPA + Flyway.

3. Prefer small, verifiable changes:
- Update code, then run relevant build/tests.
- Document any new env vars in `README.md` and `.env*.example`.

4. Do not reintroduce removed legacy providers:
- Supabase/Lovable traces were intentionally removed.
- Backend Spring stack is the current source of truth.

5. Keep production-safe defaults:
- Do not add insecure fallback secrets for `prod`.
- Keep bootstrap admin disabled by default in `prod`.

## Current Workstream Notes

- Active branch target: `feature/admin-services-gallery`.
- New capabilities in progress:
  - Admin CRUD for services (`/api/admin/services`)
  - Admin/Public gallery management (`/api/admin/gallery`, `/api/public/gallery`)
  - Admin manual income CRUD (`/api/admin/metrics/income/manual`)
  - Monthly history filters in admin tabs (`stats`, `appointments`, `income`)
- Backend migrations must run automatically at startup.
  - Current implementation uses `backend/src/main/java/com/barberia/stylebook/config/SchemaMigrationConfig.java`.
  - Keep migration scripts in `backend/src/main/resources/db/migration` (`V1`, `V2`, `V3` currently).

## UI Parity Rule

- Preserve current production visual style exactly unless the user explicitly requests redesign.
- Functional changes (new endpoints/tabs/data binding) should reuse existing spacing, typography and component patterns.
- If there is a local vs production visual mismatch, prioritize parity with production.

## Handoff Convention

- Keep `NEXT_STEPS.md` updated with immediate next actions so work can continue in a new console/session.
