# Release Checklist

Usa esta lista en cada release para reducir riesgo en produccion.

## Fast Checklist (5 min)

### 1) Antes de deploy (1 min)

- [ ] `mvn -f backend/pom.xml test` en verde
- [ ] `npm run build` en verde
- [ ] Rama/commit correcto confirmado

### 2) Variables criticas (1 min)

- [ ] Backend: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET_BASE64`, `CORS_ALLOWED_ORIGINS`
- [ ] Frontend: `VITE_API_BASE_URL`

### 3) Smoke post-deploy (2 min)

- [ ] `GET /api/public/services` responde `200`
- [ ] Login admin funciona
- [ ] Editar un precio en admin servicios funciona
- [ ] Landing publica refleja el cambio

### 4) Rollback listo (1 min)

- [ ] Commit/tag anterior identificado
- [ ] Si falla login/booking/admin: rollback inmediato

## Comandos Rapidos (copiar/pegar)

### A) Validacion local minima

```powershell
mvn -f backend/pom.xml test
npm run build
git branch --show-current
git rev-parse --short HEAD
```

### B) Smoke de backend desplegado

Reemplaza `<BACKEND_URL>` y ejecuta:

```powershell
curl -i "<BACKEND_URL>/api/public/services"
```

### C) Login admin para smoke

Reemplaza `<BACKEND_URL>`, `<ADMIN_EMAIL>`, `<ADMIN_PASSWORD>`:

```powershell
curl -X POST "<BACKEND_URL>/api/auth/login" `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"<ADMIN_EMAIL>\",\"password\":\"<ADMIN_PASSWORD>\"}"
```

Si devuelve `accessToken`, el login esta OK.

### D) Guardar commit/tag de rollback

```powershell
git log --oneline -n 5
```

Anota el hash anterior al deploy para rollback rapido.

## 1) Pre-release tecnico

- [ ] `mvn -f backend/pom.xml test` en verde
- [ ] `npm run test` en verde
- [ ] `npm run build` en verde
- [ ] `git status` limpio (sin cambios accidentales)
- [ ] Rama correcta confirmada: `git branch --show-current`

## 2) Configuracion y seguridad

- [ ] `VITE_API_BASE_URL` apunta al backend correcto
- [ ] `JWT_SECRET_BASE64`, `DB_URL`, `DB_USER`, `DB_PASSWORD` cargados
- [ ] `CORS_ALLOWED_ORIGINS` incluye frontend real
- [ ] Backup Neon confirmado (o snapshot reciente)

## 3) Smoke test backend (post deploy)

- [ ] `GET /api/public/services` responde `200`
- [ ] `POST /api/auth/login` admin devuelve token valido
- [ ] `GET /api/admin/appointments` con Bearer responde `200`

## 4) QA funcional publico

- [ ] Landing carga sin errores
- [ ] Seccion servicios muestra datos actualizados
- [ ] Seccion galeria muestra imagenes cargadas (URL)
- [ ] Crear turno valido funciona
- [ ] Doble reserva mismo servicio/hora devuelve error esperado

## 5) QA funcional admin

- [ ] Crear servicio nuevo
- [ ] Editar precio/duracion/activo de servicio existente
- [ ] Eliminar servicio sin turnos funciona
- [ ] Eliminar servicio con turnos queda bloqueado con mensaje
- [ ] Crear imagen en galeria
- [ ] Editar imagen (titulo/categoria/url/orden/activo)
- [ ] Eliminar imagen

## 6) Regresion minima

- [ ] Listado de turnos admin sigue visible
- [ ] Cambio de estado (`PENDING -> CONFIRMED -> COMPLETED`) funciona
- [ ] Metricas `overview`, `income`, `clients` cargan sin error

## 7) Cierre

- [ ] Revisar logs Render sin errores criticos
- [ ] Verificar primera carga publica en incognito
- [ ] Anotar version/commit desplegado
- [ ] Si falla algo critico: rollback al commit/tag anterior
