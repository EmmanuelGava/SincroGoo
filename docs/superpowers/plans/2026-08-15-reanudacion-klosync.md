# KloSync — Plan de reanudación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Volver a poner KloSync en marcha después de 6 meses parado y dejarlo listo para el primer usuario de pago, sin rehacer Sync Tools.

**Architecture:** Next.js 14 + NextAuth (Google JWT) + Supabase (Postgres, a menudo con service role en servidor). La frontera de seguridad real hoy son las API routes, no `auth.uid()` de Supabase Auth. WhatsApp vive en `server.js` + Socket.IO y no encaja en Vercel serverless.

**Tech Stack:** Next.js 14.1, TypeScript, NextAuth 4, Supabase JS, Material UI + shadcn, Google APIs, Baileys, Vercel. Pagos previstos: Lemon Squeezy. Emails: Resend o Brevo.

## Global Constraints

- Hablar y commitear en español cuando el usuario lo pida; UI actual hardcodeada en español.
- En PowerShell usar `;` no `&&`.
- No reabrir Sync Tools ni generación de slides (15/17 hecho; 5.4 y 5.5 pospuestos a propósito).
- Auth es NextAuth JWT, no Supabase Auth. `RLS auth.uid() = usuario_id` **no funciona** tal cual está escrito en el plan de febrero.
- Nunca aceptar `usuario_id` / `auth_id` del cliente como fuente de verdad. Usar `getUsuarioIdFromSession()`.
- `getSupabaseAdmin()` (service role) solo en servidor. RLS debe denegar al anon key.
- No cobrar WhatsApp hasta que corra fuera de Vercel y se verifique reconexión.
- No lanzar a Product Hunt / mercado EN hasta tener inglés. Validación en español sí.
- No implementar HubSpot, Airtable, Notion, IA, Fabric.js, API pública ni Workspace Add-on en este plan.
- Commits frecuentes, un entregable testeable por tarea. No commitear `.env`.
- Base de datos: org Supabase **propia de KloSync**, no compartir Hobby con ScrapTextil. Recrear esquema; no migrar datos viejos salvo que el usuario lo pida.
- MCP de este repo debe apuntar al project_ref nuevo (`https://mcp.supabase.com/mcp?project_ref=...`). El token MCP es un Personal Access Token de cuenta, no el JWT `service_role`.

---

## Docs de tasks que ya existían

Estos son los listados de febrero 2026. Este plan los consolida y corrige lo que el código desmiente.

| Doc | Qué es | Qué usar ahora |
|-----|--------|----------------|
| `docs/LISTADO-COMPLETO-MEJORAS-02-26.md` | Checklist maestro de pendientes | Fuente de verdad de **qué falta** |
| `docs/SincroGoo_Plan_Completo.md` | Plan producto + 14 días a lanzamiento | Fuente de **fases y pricing**; ignorar el calendario de 14 días (quedó viejo) |
| `docs/TASKS-SYNC-TOOLS.md` | 17 tareas de conversión/slides | **Cerrado.** 15/17 hecho, 2 pospuestos (email al terminar, editor Fabric.js) |
| `.kiro/specs/whatsapp-integration/tasks.md` | Tasks WhatsApp Lite | Backend marcado completo; sigue faltando estabilización en prod |
| `.kiro/specs/dashboard-mejoras/tasks.md` | Dashboard | Marcado completo; tests unitarios pendientes, no bloquean |
| `.cursor/plans/roadmap_general_klosync_38dcb4da.plan.md` | Roadmap Cursor | Archivo truncado / vacío. No usarlo |
| `docs/FUNCIONALIDADES-PROYECTO.md` | Vista de negocio | Contexto; no es lista de tasks |
| `docs/ESTADO-ACTUAL-PROYECTO.md` | — | Vacío. No usarlo |

Último commit de código: `da5fcc9` (2026-02-24). Repo en `main`.

---

## Qué no rehacer (ya está)

- Sync Tools (Excel/CSV/Sheets/Slides/Word/PDF/PPTX, merge, clean-data)
- Sheet → Slides con plantillas, paletas, logo, portada, filtros, re-sync, enriquecimiento, preview carrusel, historial
- Sync programada (`supabase/functions/sync-programada`) + webhook `/api/webhooks/sheet-change`
- CRM Kanban visual + leads
- Chat unificado (recepción Telegram / WhatsApp Lite / email parcial)
- Explorador Maps → export a Sheets
- Dashboard con widgets
- Login Google

Helper ya existente y **subusado**:

```120:131:src/lib/supabase/client.ts
export async function getUsuarioIdFromSession(): Promise<string | null> {
  if (isClient) return null;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const admin = getSupabaseAdmin();
  const { data: usuario, error } = await admin.from('usuarios').select('id').eq('auth_id', session.user.id).single();
  if (error || !usuario?.id) return null;

  return usuario.id;
}
```

Hoy solo lo usan `src/app/api/supabase/leads/route.ts` y `src/app/api/supabase/estados_lead/route.ts`. Projects y verify **no**.

---

## File map (Fase 0 — lo que se toca primero)

| Archivo | Rol |
|---------|-----|
| `src/lib/supabase/client.ts` | `getUsuarioIdFromSession`, `getSupabaseAdmin` |
| `src/lib/auth.ts` y `src/app/api/auth/[...nextauth]/options.ts` | NextAuth Google JWT |
| `src/app/api/supabase/projects/route.ts` | Lista/crea proyectos; confía `usuario_id` del query/body |
| `src/app/api/supabase/projects/[id]/route.ts` | GET/PUT/DELETE por id **sin chequear dueño** |
| `src/app/api/supabase/users/verify/route.ts` | Crea usuario con `auth_id` del query |
| `src/app/api/supabase/usuarios/verify/route.ts` | Duplicado del anterior |
| `src/lib/supabase/services/projects.ts` | Queries; `getSupabaseClient()` sin auth |
| `supabase/migrations/` (crear) | RLS deny-anon + policies |
| `server.js` | Socket.IO + Next custom server (WhatsApp) |

---

## Decisión táctica (distinta al plan de 14 días de febrero)

Después de 6 meses parado, el objetivo no es “perfecto en inglés en 14 días”. Es **primer usuario de pago**.

1. Org + proyecto Supabase nuevos (fuera de ScrapTextil) y MCP apuntando ahí.
2. Despertar el repo (build + smoke contra esa BD).
3. Cerrar agujero de IDOR en projects/verify.
4. RLS: anon no lee nada; el server usa service role **después** de validar NextAuth.
5. Monetización mínima en español (Lemon Squeezy + `/precios` + límites Free).
6. WhatsApp **fuera del camino crítico** del cobro. Si no está estable, no se vende en Pro todavía.
7. i18n inglés + Product Hunt = fase posterior, plan aparte.

Contactos, scoring, chatbot, HubSpot, IA: no entran hasta haber cobrado.

Cada fase posterior (1, 2, 3) debe tener su propio plan de implementación detallado al empezar. Este documento es el mapa; la Fase 0 sí está lista para ejecutar.

---

### Task 0: Org Supabase dedicada + recrear esquema + MCP

**Por qué:** Hobby se cobra/limita por **organización**. ScrapTextil y KloSync en la misma org se pisan (pausa a los 7 días, egress, 2 proyectos free). El MCP actual está roto y apunta a un proyecto viejo.

Estado detectado el 2026-08-15:

| Qué | Project ref | Estado |
|-----|-------------|--------|
| MCP `user-supabase-sincrogoo` | `wlznkmbkeikgbiwisrnx` | URL responde; `list_tables` / SQL = Unauthorized |
| App `.env.local` y `.cursor/mcp.json` | `jqxvlkdjuggsrtzjfyxj` | Distinto al MCP de arriba |
| MCP ScrapTextil | `kmfjvrwdqavampnsjpzs` | Funciona (otro proyecto, misma cuenta) |
| `.kiro/settings/mcp.json` server `fetch` | `wlznkmbkeikgbiwisrnx` | Token mal puesto: JWT `service_role` como `SUPABASE_ACCESS_TOKEN` |

El MCP necesita un **Personal Access Token** de https://supabase.com/dashboard/account/tokens, no la service_role key.

**Files:**
- Modify: `.env.local` (URL + anon + service_role del proyecto nuevo; no commitear)
- Modify: `.cursor/mcp.json` (`project_ref` del proyecto nuevo)
- Create: `supabase/migrations/` con el esquema reconstruido desde tipos + uso en código
- Deploy: `supabase/functions/sync-programada/index.ts`

**No migrar datos** de las BDs viejas (6 meses, Hobby colapsado). Esquema vacío. El primer login Google recrea `usuarios`.

Tablas mínimas a recrear (desde `database.ts` + uso en APIs):

- Core: `usuarios`, `proyectos`, `sheets`, `slides`, `diapositivas`, `elementos`, `celdas`, `asociaciones`, `configuracion_proyecto`, `historial_cambios`, `cache`
- Jobs: `generacion_jobs`, `generacion_job_items`
- CRM/chat: `leads`, `estados_lead`, `interacciones_lead`, `historial_estados_lead`, `conversaciones`, `mensajes_conversacion`, `configuracion_mensajeria_usuario`
- WhatsApp: `whatsapp_lite_sessions`, `whatsapp_messages`
- Dashboard: `dashboard_preferences`, `tasks` (si el código las usa)

Extensiones: `pg_cron` (sync programada), `pgcrypto` (gen_random_uuid). RLS deny-anon se aplica en Task 4; en Task 0 basta con tablas + FKs + índices.

**Paso humano (no lo puede hacer el agente):**

1. En el mismo login de Supabase: **New organization** → nombre `KloSync` (no hace falta otro email).
2. En esa org: **New project** → `klosync`, región cercana (p. ej. `sa-east-1` o `us-east-1`).
3. Settings → API: copiar URL, publishable/anon, service_role.
4. Cursor → Settings → MCP: autenticar el servidor Supabase de **este** workspace contra el proyecto nuevo (OAuth o PAT).
5. Avisar al agente con el `project_ref` (subdominio `xxxx.supabase.co`).

**Paso agente (cuando exista el proyecto y el MCP autentique):**

- [ ] Escribir migración inicial `supabase/migrations/YYYYMMDDHHMMSS_init_klosync.sql` con `npx supabase migration new init_klosync`
- [ ] Aplicarla vía MCP `apply_migration` (remoto) o `execute_sql` para iterar
- [ ] Actualizar `.env.local` y `.cursor/mcp.json`
- [ ] `list_tables` + un `select count(*) from usuarios` para verificar
- [ ] Deploy edge function `sync-programada`
- [ ] No commitear keys. Sí commitear la migración SQL

**Criterio de hecho:** MCP de este chat lista tablas de KloSync; ScrapTextil sigue intacto en su org.

---

### Task 1: Despertar el repo

**Files:**
- Ninguno de producto. Verificar `package.json`, `.env.local` (no commitear).
- Test: build local.

**Interfaces:**
- Consumes: Node 18+, `.env.local` con `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Produces: `npm run build` en verde y `npm run dev` sirviendo login.

- [x] **Step 1: Instalar e inspeccionar**

```powershell
node -v
npm install
npx tsc --noEmit
```

Expected: Node 18+. `tsc` puede mostrar errores viejos; anotarlos, no “arreglar todo el mundo” en este task.

- [x] **Step 2: Build**

```powershell
npm run build
```

Expected: build Next completa. Si falla, el bloqueante de reanudación es el build, no una feature nueva. Arreglar solo lo que impide el build.

- [x] **Step 3: Smoke manual**

Site de producción https://klosync.vercel.app responde 200 (2026-08-15). Login Google + rutas internas: smoke del usuario.

```powershell
npm run dev
```

Abrir `http://localhost:3000`, login Google, entrar a `/proyectos`, `/dashboard`, `/crm`, `/chat`. Anotar qué rota. No implementar features.

- [ ] **Step 4: Commit solo si hubo fixes de build**

```powershell
git add <archivos-de-fix>
git commit -m "fix: hacer que el build vuelva a pasar tras 6 meses parado"
```

Si no hubo cambios, no commitear.

---

### Task 2: Helper de sesión obligatorio

**Files:**
- Create: `src/lib/auth/requireUsuario.ts`
- Create: `src/lib/auth/__tests__/requireUsuario.test.ts` (si el repo ya corre Vitest; si no, testear vía ruta en Task 3)
- Modify: ninguno todavía; las rutas se cablean en Task 3.

**Interfaces:**
- Consumes: `getUsuarioIdFromSession()` en `src/lib/supabase/client.ts`
- Produces:

```typescript
export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function requireUsuarioId(): Promise<string>
```

Lanza `AuthError(401)` si no hay sesión o no hay fila en `usuarios`.

- [x] **Step 1: Escribir el helper**

```typescript
// src/lib/auth/requireUsuario.ts
import { getUsuarioIdFromSession } from '@/lib/supabase/client'

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function requireUsuarioId(): Promise<string> {
  const usuarioId = await getUsuarioIdFromSession()
  if (!usuarioId) {
    throw new AuthError(401, 'No autenticado')
  }
  return usuarioId
}

export function jsonAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return { body: { error: error.message }, status: error.status }
  }
  return null
}
```

- [x] **Step 2: Verificar a mano que `getUsuarioIdFromSession` resuelve `usuarios.id` y no el Google `sub`**

`session.user.id` es `token.sub` (Google). `proyectos.usuario_id` es UUID de `usuarios`. Mezclarlos es un bug. El helper debe devolver el UUID.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/auth/requireUsuario.ts
git commit -m "feat: helper requireUsuarioId para no confiar en usuario_id del cliente"
```

---

### Task 3: Cerrar IDOR en projects y verify

**Files:**
- Modify: `src/app/api/supabase/projects/route.ts`
- Modify: `src/app/api/supabase/projects/[id]/route.ts`
- Modify: `src/app/api/supabase/users/verify/route.ts`
- Modify: `src/app/api/supabase/usuarios/verify/route.ts`
- Modify: `src/lib/supabase/services/projects.ts` (GET by id debe filtrar por `usuario_id`)

**Interfaces:**
- Consumes: `requireUsuarioId()`, `jsonAuthError()`
- Produces: list/create/update/delete de proyectos solo del usuario de la sesión. Verify ignora `auth_id`/`email` del query y usa la sesión.

Comportamiento actual a reemplazar:

```12:39:src/app/api/supabase/projects/route.ts
export async function GET(request: NextRequest) {
  // ...
  const usuario_id = searchParams.get('usuario_id');
  // ...
  const projects = await projectsService.listProjects({
    usuario_id,
    // ...
  });
```

```52:74:src/app/api/supabase/projects/route.ts
export async function POST(request: NextRequest) {
  const data = await request.json();
  if (!data.nombre || !data.usuario_id) { /* 400 */ }
  const projectId = await projectsService.createProject({
    usuario_id: data.usuario_id,
    // ...
  });
```

`GET /api/supabase/projects/[id]` no chequea dueño: cualquiera autenticado (o el service role vía API) puede leer el proyecto de otro.

- [x] **Step 1: GET lista — ignorar query `usuario_id`**

```typescript
export async function GET(request: NextRequest) {
  try {
    const usuario_id = await requireUsuarioId()
    const searchParams = request.nextUrl.searchParams
    const projects = await projectsService.listProjects({
      usuario_id,
      busqueda: searchParams.get('busqueda') || undefined,
      ordenPor: (searchParams.get('ordenPor') || 'created_at') as 'created_at' | 'updated_at' | 'nombre',
      orden: (searchParams.get('orden') || 'desc') as 'asc' | 'desc',
      pagina: searchParams.has('pagina') ? parseInt(searchParams.get('pagina')!) : 1,
      porPagina: searchParams.has('porPagina') ? parseInt(searchParams.get('porPagina')!) : 20,
    })
    return NextResponse.json({ projects })
  } catch (error) {
    const auth = jsonAuthError(error)
    if (auth) return NextResponse.json(auth.body, { status: auth.status })
    const { error: errorMessage, status } = formatErrorResponse(error)
    return NextResponse.json({ error: errorMessage }, { status })
  }
}
```

- [x] **Step 2: POST create — `usuario_id` siempre de sesión**

```typescript
const usuario_id = await requireUsuarioId()
const data = await request.json()
if (!data.nombre) {
  return NextResponse.json({ error: 'Se requiere nombre' }, { status: 400 })
}
const projectId = await projectsService.createProject({
  nombre: data.nombre,
  descripcion: data.descripcion,
  usuario_id,
  presentacion_id: data.presentacion_id,
  hoja_calculo_id: data.hoja_calculo_id,
  modo: data.modo,
  metadata: data.metadata,
})
```

- [x] **Step 3: `[id]` GET/PUT/DELETE — 404 si no es del usuario**

En `ProjectsService` agregar (o usar en la ruta):

```typescript
async getProjectOwnedBy(projectId: string, usuarioId: string) {
  const project = await this.getProjectById(projectId)
  if (!project || project.usuario_id !== usuarioId) return null
  return project
}
```

PUT/DELETE: si `getProjectOwnedBy` es null → 404 (no 403, para no filtrar IDs).

- [x] **Step 4: verify — no crear usuarios ajenos**

En ambos `users/verify` y `usuarios/verify`:

```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.id || !session.user.email) {
  return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
}
const auth_id = session.user.id
const email = session.user.email
const nombre = session.user.name ?? email
```

Ignorar query `auth_id` / `email` / `nombre`. Unificar después (no en este task) los dos endpoints duplicados; por ahora parchear los dos.

- [ ] **Step 5: Probar**

1. Logueado: `GET /api/supabase/projects` lista solo los propios (aunque pases `?usuario_id=` de otro).
2. Logueado: `GET /api/supabase/projects/<uuid-ajeno>` → 404.
3. Sin cookie: 401.
4. Verify con query de otro email no crea/altera ese usuario.

- [ ] **Step 6: Commit**

```powershell
git add src/app/api/supabase/projects src/app/api/supabase/users/verify/route.ts src/app/api/supabase/usuarios/verify/route.ts src/lib/supabase/services/projects.ts
git commit -m "fix: validar sesión en projects y verify en vez de usuario_id del cliente"
```

---

### Task 4: RLS deny-anon (el modelo de auth real)

**Files:**
- Create: `supabase/migrations/20260815_rls_deny_anon.sql`

**Interfaces:**
- Consumes: tablas existentes (`proyectos`, `usuarios`, `leads`, `conversaciones`, `mensajes_conversacion`, etc.)
- Produces: con la anon key, SELECT/INSERT/UPDATE/DELETE fallan. Service role (server) sigue funcionando.

El plan viejo decía `auth.uid() = usuario_id`. Eso asume Supabase Auth. Este repo usa NextAuth. Políticas `auth.uid()` dejarían **todo vacío** para el server si el server usara anon, y no protegerían nada si usa service role.

Estrategia correcta:

1. `ENABLE ROW LEVEL SECURITY` en tablas de datos de usuario.
2. **Ninguna policy para `anon` / `authenticated`** (o policies que retornan false). El browser con la anon key no lee filas.
3. El server sigue con `getSupabaseAdmin()` **solo después** de `requireUsuarioId()`.
4. No exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente (ya está gated con `isServer`).

- [x] **Step 1: Listar tablas reales en Supabase** (MCP `user-supabase klosync`). 26 tablas public, todas con `rls_enabled: true` y 0 policies (deny-anon). Hecho en Task 0.

- [x] **Step 2: Migración** — RLS deny-anon ya aplicado en `init_klosync`. No hace falta otra migración.

Aplicar a **cada** tabla de datos de usuario (completar la lista con el output del step 1):

```sql
alter table public.proyectos enable row level security;
alter table public.usuarios enable row level security;
alter table public.leads enable row level security;
alter table public.estados_lead enable row level security;
alter table public.conversaciones enable row level security;
alter table public.mensajes_conversacion enable row level security;

-- Sin policies = nadie con anon/authenticated pasa.
-- El service role bypasea RLS. Las API routes deben usar admin SOLO tras requireUsuarioId().
```

Si alguna tabla ya tiene policies abiertas (`using (true)`), `drop policy` esas policies.

- [x] **Step 3: Verificar que ProjectsService no se rompe**

`listProjects` usa `getSupabaseClient()` (anon, sin sesión Supabase). Con RLS deny-anon, **esa llamada va a devolver 0 filas o error**. Hay que cambiar `ProjectsService` para usar `getSupabaseAdmin()` ahora que la ruta ya filtró por `usuario_id` de sesión.

En `src/lib/supabase/services/projects.ts`, reemplazar `getSupabaseClient()` por `getSupabaseAdmin()` en list/create/update/delete.

- [ ] **Step 4: Probar**

Desde el browser console (anon key pública): `supabase.from('proyectos').select('*')` → 0 filas o error RLS.
Desde la app logueada: `/proyectos` sigue listando los propios.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations/20260815_rls_deny_anon.sql src/lib/supabase/services/projects.ts
git commit -m "fix: activar RLS deny-anon y usar admin solo en servidor autenticado"
```

---

### Task 5: Barrido rápido de otras APIs que aceptan IDs del cliente

**Files:**
- Modify: cualquier `src/app/api/supabase/**/route.ts` que lea `usuario_id` o `auth_id` del query/body sin sesión.
- Ya OK (referencia): `leads/route.ts`, `estados_lead/route.ts`, `projects/[id]/sync-config/route.ts`.

**Interfaces:**
- Consumes: `requireUsuarioId()`
- Produces: mismas rutas, mismo contrato para el frontend salvo que `usuario_id` extra se ignora.

- [x] **Step 1: Buscar**

```powershell
rg "searchParams.get\('usuario_id'\)|searchParams.get\('auth_id'\)|data\.usuario_id" src/app/api
```

- [x] **Step 2: Parchear cada match** con el mismo patrón del Task 3 (sesión manda, 401 si no hay). No refactorizar servicios enteros.

- [ ] **Step 3: Commit**

```powershell
git add src/app/api
git commit -m "fix: exigir sesión en APIs que aún confiaban en usuario_id del cliente"
```

---

## Fase 1 — Monetización mínima (plan aparte al empezar)

No ejecutar hasta cerrar Tasks 1–5. Al empezar, escribir `docs/superpowers/plans/YYYY-MM-DD-monetizacion-lemon.md`.

Checklist heredado de `docs/SincroGoo_Plan_Completo.md` §4.1, recortado:

| Item | Notas de implementación |
|------|-------------------------|
| Tabla `subscriptions` | `usuario_id` → `usuarios.id`; `plan` `free\|pro\|business`; `estado` `active\|cancelled\|past_due`; `lemon_squeezy_id`; `current_period_end` |
| `getCurrentUserWithPlan()` | Encima de `requireUsuarioId()` + join subscriptions; default `free` si no hay fila |
| Límites Free | 3 proyectos; 50 syncs/mes. Chequear en `POST /api/supabase/projects` y en generate/sync |
| `/precios` | 3 columnas; Pro destacado; CTA Free vs checkout Lemon |
| Webhook `/api/webhooks/lemon-squeezy` | `subscription_created`, `subscription_cancelled`, `subscription_payment_failed` |
| Redirect `/proyectos/editar/[id]` → `/proyectos/[id]` o `/editor-proyectos/[projectId]` | Ruta rota listada en el listado de febrero |
| Modal upgrade | Cuando el límite Free se toca |

Fuera de esta fase: i18n completo, emails de onboarding, Sentry (Sentry sí puede colarse como 1 tarde si el build ya está).

**Criterio de hecho:** un usuario Free choca el límite de 3 proyectos y ve upgrade; un webhook de test deja el plan en `pro`.

---

## Fase 2 — Lanzamiento de validación en español

Plan aparte: `docs/superpowers/plans/YYYY-MM-DD-lanzamiento-latam.md`.

- Dominio propio (`klosync.com` / `.app`) — acción humana, no código.
- Conectar dominio en Vercel.
- Video demo 60s (puede ser en español).
- Soft launch: 10–20 usuarios conocidos, no Product Hunt.
- Legal: TOS / privacy ya existen (`src/app/terms-of-service`, `privacy-policy`, `data-deletion`). Revisar que nombren KloSync y no SincroGoo.

WhatsApp: **no se cobra**. En UI, marcar como beta o ocultar si Railway no está.

---

## Fase 3 — WhatsApp estable (solo si se va a vender)

Plan aparte: `docs/superpowers/plans/YYYY-MM-DD-whatsapp-railway.md`.

Del listado de febrero, lo que sigue pendiente de verdad:

- Mover `server.js` + Socket.IO a Railway/Render.
- Sesiones persistentes (Supabase Storage, no memoria del proceso).
- Reconexión con backoff.
- Indicador de estado en UI (`/configuracion/mensajeria`).
- Envío real (hoy parte del flujo solo persiste en BD).
- Copy legal: conexión no oficial (Baileys).

No hacer en esta fase: WhatsApp Business API oficial, multiagente, broadcast, chatbot.

---

## Fase 4 — i18n inglés + lanzamiento global

Plan aparte. Estimación original 5–8 días, realista más si se extrae todo el copy hardcodeado.

- `next-intl`, `messages/en.json` + `messages/es.json`
- No Product Hunt / Reddit EN / HN hasta esto.

---

## Fuera de alcance (backlog, no reanudación)

Tomado de `LISTADO-COMPLETO-MEJORAS-02-26.md`. No empezar hasta haber cobrado.

- Módulo Contactos (CRUD, import Sheets/CSV, ficha unificada)
- CRM: valor, fecha cierre, filtros, scoring, asignación equipo, reportes funnel
- Chat: respuestas rápidas, programados, seguimiento auto, búsqueda historial, email SMTP completo
- Explorador: export Excel, export a Contactos, búsquedas guardadas, enriquecimiento
- Editor Fabric.js, notificación al terminar generación
- HubSpot / Airtable / Notion / Looker / IA
- API pública, Workspace Add-on, rate limit Google quota dashboard
- Programa de referidos, directorios G2/Capterra

---

## Orden de ejecución recomendado

```
Task 0 org + proyecto Supabase nuevo + MCP
  → Task 1 despertar (build contra la BD nueva)
    → Task 2 helper
      → Task 3 IDOR projects/verify
        → Task 4 RLS + admin en ProjectsService
          → Task 5 barrido APIs
            → [plan nuevo] Fase 1 Lemon + límites
              → [plan nuevo] Fase 2 dominio + 10 usuarios
                → paralelo: Fase 3 WhatsApp O Fase 4 i18n según si se vende chat o mercado EN
```

**Definición de “reanudación hecha”:** Tasks 1–5 mergeadas, build verde, no se puede leer el proyecto de otro usuario.

**Definición de “listo para cobrar”:** Fase 1 hecha.

**Definición de “lanzado”:** Fase 2 hecha (usuarios reales en dominio propio).
