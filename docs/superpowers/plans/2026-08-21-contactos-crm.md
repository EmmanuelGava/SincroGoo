# Contactos CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persona + deal: tabla `contactos`, CRUD/búsqueda, match WhatsApp sin crear siempre, Kanban que pregunta si ya hay lead abierto, y el chat muestra el nombre del contacto vinculado.

**Architecture:** El dueño es `usuarios.id` (UUID). Las conversaciones siguen con Google ID en `usuario_id` texto; un helper único resuelve Google ID → UUID vía `usuarios.google_id` (relleno desde `auth_id`). El match de teléfono vive en `src/lib/contactos/normalizarTelefono.ts`. Las APIs siguen el patrón de leads: session NextAuth + `getSupabaseAdmin` filtrando por `usuario_id`. El Kanban no mueve `estado_id` por mensajes.

**Tech Stack:** Next.js App Router, NextAuth Google, Supabase Postgres (MCP `user-supabase klosync`, project `nwxhggmjsyvbnaoefrxl`), Vitest en `src/lib/**/__tests__/**/*.test.ts`, MUI.

## Global Constraints

- Hablar en español en UI y mensajes de error.
- Windows PowerShell: encadenar con `;`, no `&&`.
- `session.user.id` es Google ID; `usuarios.id` es UUID; `conversaciones.usuario_id` es Google ID texto.
- El estado del lead **nunca** cambia por actividad del chat.
- Un mensaje de número desconocido **no** crea contacto.
- No fusionar LID distintos ni contactos duplicados en este corte.
- No import CSV/Sheets/Google Contacts.
- No commitear `.cursor/mcp.json` ni `.cursor/plans/`.
- Tests: `npx vitest run <archivo>`. Deploy = push a `main` solo si el usuario lo pide.
- Migraciones remotas: MCP `user-supabase klosync` → `apply_migration`. No inventar schema a mano en el dashboard.

**Spec:** `docs/superpowers/specs/2026-08-21-contactos-crm-design.md`

## File map

| File | Role |
|---|---|
| `src/lib/contactos/normalizarTelefono.ts` | `telefonoDigits()` AR |
| `src/lib/contactos/usuarioGoogle.ts` | Google ID ↔ UUID |
| `src/lib/contactos/matchContacto.ts` | Decisión de match + upsert |
| `src/lib/contactos/estadoLead.ts` | `isEstadoTerminal()` |
| `src/app/api/contactos/route.ts` | GET lista/búsqueda, POST crear |
| `src/app/api/contactos/[id]/route.ts` | GET ficha, PATCH, DELETE |
| `src/app/contactos/page.tsx` | Listado |
| `src/app/contactos/[id]/page.tsx` | Ficha |
| `src/lib/chat/handleIncomingMessage.ts` | Vincular si hay match |
| `src/app/api/crm/conversaciones/entrantes/route.ts` | Upsert contacto al drag |
| `src/app/crm/componentes/KanbanLeads.tsx` | Pregunta lead abierto + globo unread |
| `src/app/componentes/EncabezadoSistema.tsx` | Nav Contactos |
| `src/app/api/chat/conversaciones/route.ts` | Nombre desde contacto |

---

### Task 1: Normalizar teléfono Argentina

**Files:**
- Create: `src/lib/contactos/normalizarTelefono.ts`
- Test: `src/lib/contactos/__tests__/normalizarTelefono.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `telefonoDigits(value: string | null | undefined): string | null`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { telefonoDigits } from '../normalizarTelefono';

describe('telefonoDigits', () => {
  it('deja 549… intacto y saca no-dígitos', () => {
    expect(telefonoDigits('+54 9 11 1234-5678')).toBe('5491112345678');
    expect(telefonoDigits('5491112345678')).toBe('5491112345678');
  });

  it('inserta el 9 si viene 54 + área sin 9', () => {
    expect(telefonoDigits('541112345678')).toBe('5491112345678');
  });

  it('devuelve null si no hay dígitos de teléfono', () => {
    expect(telefonoDigits('')).toBeNull();
    expect(telefonoDigits('1203634@lid')).toBeNull();
    expect(telefonoDigits(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/contactos/__tests__/normalizarTelefono.test.ts`

Expected: FAIL — `Cannot find module '../normalizarTelefono'`

- [ ] **Step 3: Write minimal implementation**

```ts
export function telefonoDigits(value: string | null | undefined): string | null {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('54') && digits[2] !== '9') {
    return `549${digits.slice(2)}`;
  }
  return digits;
}
```

Para LID tipo `120363419999999@lid` (muchos dígitos): si `value` incluye `@lid`, return null **antes** de contar dígitos:

```ts
if (String(value || '').includes('@lid')) return null;
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/contactos/__tests__/normalizarTelefono.test.ts`

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```
git add src/lib/contactos/normalizarTelefono.ts src/lib/contactos/__tests__/normalizarTelefono.test.ts
git commit -m "feat: normalizar telefono Argentina para match de contactos"
```

---

### Task 2: Terminal de Kanban + decisión de match (puro)

**Files:**
- Create: `src/lib/contactos/estadoLead.ts`
- Create: `src/lib/contactos/matchContacto.ts`
- Test: `src/lib/contactos/__tests__/matchContacto.test.ts`

**Interfaces:**
- Consumes: nada de DB
- Produces:
  - `isEstadoTerminal(nombre: string): boolean` — true si el nombre (trim, case-insensitive) es `ganado` o `perdido`
  - `decideIncomingContactLink(opts): IncomingLinkDecision`

```ts
export type IncomingLinkDecision =
  | { action: 'keep'; contactoId: string }
  | { action: 'lookup'; telefonoDigits: string }
  | { action: 'skip' };

export function decideIncomingContactLink(opts: {
  existingContactoId?: string | null;
  telefonoDigits?: string | null;
}): IncomingLinkDecision {
  if (opts.existingContactoId) return { action: 'keep', contactoId: opts.existingContactoId };
  if (opts.telefonoDigits) return { action: 'lookup', telefonoDigits: opts.telefonoDigits };
  return { action: 'skip' };
}
```

- [ ] **Step 1: Tests**

```ts
import { describe, expect, it } from 'vitest';
import { isEstadoTerminal } from '../estadoLead';
import { decideIncomingContactLink } from '../matchContacto';

describe('isEstadoTerminal', () => {
  it('Ganado y Perdido son terminales', () => {
    expect(isEstadoTerminal('Ganado')).toBe(true);
    expect(isEstadoTerminal('perdido')).toBe(true);
    expect(isEstadoTerminal('Nuevo')).toBe(false);
  });
});

describe('decideIncomingContactLink', () => {
  it('respeta contacto ya vinculado', () => {
    expect(decideIncomingContactLink({
      existingContactoId: 'c1',
      telefonoDigits: '5491112345678',
    })).toEqual({ action: 'keep', contactoId: 'c1' });
  });

  it('busca si hay teléfono y no hay contacto', () => {
    expect(decideIncomingContactLink({
      existingContactoId: null,
      telefonoDigits: '5491112345678',
    })).toEqual({ action: 'lookup', telefonoDigits: '5491112345678' });
  });

  it('no crea si no hay teléfono', () => {
    expect(decideIncomingContactLink({ existingContactoId: null, telefonoDigits: null }))
      .toEqual({ action: 'skip' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL missing modules**

`npx vitest run src/lib/contactos/__tests__/matchContacto.test.ts`

- [ ] **Step 3: Implement `estadoLead.ts` y `matchContacto.ts` as above**

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit** `feat: reglas de match de contacto y etapas terminales`

---

### Task 3: Migración Postgres

**Files:**
- Modify: none in git until types if generated
- Apply vía MCP `apply_migration` name: `contactos_persona_deal`

**SQL completo (una migración):**

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS google_id text;

UPDATE public.usuarios
SET google_id = auth_id
WHERE google_id IS NULL AND auth_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_google_id_key
  ON public.usuarios (google_id)
  WHERE google_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.contactos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  telefono text,
  telefono_digits text,
  email text,
  empresa text,
  notas text,
  wa_jid text,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_actualizacion timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contactos_usuario_telefono_digits_key
  ON public.contactos (usuario_id, telefono_digits)
  WHERE telefono_digits IS NOT NULL AND telefono_digits <> '';

CREATE INDEX IF NOT EXISTS contactos_usuario_telefono_digits_idx
  ON public.contactos (usuario_id, telefono_digits);

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contacto_id uuid REFERENCES public.contactos(id) ON DELETE SET NULL;

ALTER TABLE public.conversaciones
  ADD COLUMN IF NOT EXISTS contacto_id uuid REFERENCES public.contactos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_contacto_id_idx ON public.leads (contacto_id);
CREATE INDEX IF NOT EXISTS conversaciones_contacto_id_idx ON public.conversaciones (contacto_id);

ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

CREATE POLICY contactos_service ON public.contactos
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

Nota: las APIs usan service role (como leads). La policy permisiva + filtro en API es el patrón actual. No exponer escrituras desde el browser con anon key.

Después de aplicar, verificar con `execute_sql`:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'contactos' ORDER BY ordinal_position;
```

Expected: filas `id, usuario_id, nombre, telefono, telefono_digits, ...`

**Datos de prueba:** no truncar en esta tarea. Truncar `conversaciones` / `leads` / `mensajes_conversacion` solo si el usuario lo pide explícitamente (spec: backup `pg_dump` antes).

- [ ] **Step 1:** `apply_migration` con el SQL de arriba
- [ ] **Step 2:** Verificar columnas con `execute_sql`
- [ ] **Step 3:** Commit no aplica a SQL remoto; en repo no hay carpeta `supabase/migrations` obligatoria. Si existe `supabase/migrations`, copiar el mismo SQL. Si no, una línea en `docs/ORDEN-ACTUAL-PRODUCTO.md` bajo Fase 2: “migración `contactos_persona_deal` aplicada en prod”.
- [ ] **Step 4: Commit** `chore: documentar migracion contactos persona-deal` (solo docs si no hay carpeta local)

---

### Task 4: Helper Google ID → UUID

**Files:**
- Create: `src/lib/contactos/usuarioGoogle.ts`
- Modify: `src/lib/supabase/client.ts` — no reemplazar `getUsuarioIdFromSession`; el helper nuevo es el único cruce conversación→usuario UUID
- Test: no hay DB en Vitest; documentar firma. Un test de contrato de tipos no aporta. Skip test de red.

**Produces:**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function usuarioUuidFromGoogleId(
  supabase: SupabaseClient,
  googleId: string | null | undefined
): Promise<string | null> {
  if (!googleId) return null;
  const { data } = await supabase
    .from('usuarios')
    .select('id')
    .or(`google_id.eq.${googleId},auth_id.eq.${googleId}`)
    .maybeSingle();
  return data?.id ?? null;
}
```

Cuidado: `.or()` con IDs que contienen comas. Google IDs son numéricos. Si `googleId` no es `[a-zA-Z0-9_-]+`, return null.

Al crear/actualizar usuarios (NextAuth `options.ts` y `DatabaseManager.ts`): setear `google_id: auth_id` (mismo valor).

- [ ] **Step 1:** Implementar `usuarioGoogle.ts`
- [ ] **Step 2:** En `src/app/api/auth/[...nextauth]/options.ts` donde se hace upsert de `usuarios`, agregar `google_id: user.id` junto a `auth_id`
- [ ] **Step 3:** En `DatabaseManager` create user, mismo campo
- [ ] **Step 4: Commit** `feat: resolver UUID de usuario desde Google ID`

---

### Task 5: Vincular incoming sin crear

**Files:**
- Modify: `src/lib/chat/handleIncomingMessage.ts` — después de `findOrCreateConversation`, antes o después de guardar el mensaje
- Create lookup in `src/lib/contactos/matchContacto.ts`: `linkConversacionAContactoSiExiste`

**Produces:**

```ts
export async function linkConversacionAContactoSiExiste(
  supabase: SupabaseClient,
  opts: {
    conversacionId: string;
    googleUserId: string | null | undefined;
    existingContactoId?: string | null;
    rawPhone?: string | null;
  }
): Promise<string | null> {
  const decision = decideIncomingContactLink({
    existingContactoId: opts.existingContactoId,
    telefonoDigits: telefonoDigits(opts.rawPhone),
  });
  if (decision.action === 'keep') return decision.contactoId;
  if (decision.action === 'skip') return null;
  const usuarioUuid = await usuarioUuidFromGoogleId(supabase, opts.googleUserId);
  if (!usuarioUuid) return null;
  const { data } = await supabase
    .from('contactos')
    .select('id')
    .eq('usuario_id', usuarioUuid)
    .eq('telefono_digits', decision.telefonoDigits)
    .maybeSingle();
  if (!data?.id) return null;
  await supabase
    .from('conversaciones')
    .update({ contacto_id: data.id })
    .eq('id', opts.conversacionId)
    .is('contacto_id', null);
  return data.id;
}
```

En `handleIncomingMessage`, tras tener `conversacionId` y `phoneNumber`:

1. Leer `contacto_id` actual de esa conversación (puede ir en el select de findOrCreate; si no, `select('contacto_id')`).
2. Llamar `linkConversacionAContactoSiExiste` con `googleUserId: data.metadata?.userId`.
3. **No** insertar en `contactos`.

- [ ] **Step 1:** Agregar la función y el call. No hay test de integración DB; el decision tree ya está testeado.
- [ ] **Step 2:** `npx tsc --noEmit` OK
- [ ] **Step 3: Commit** `feat: vincular chat a contacto existente por telefono`

---

### Task 6: API CRUD + búsqueda unaccent

**Files:**
- Create: `src/app/api/contactos/route.ts`
- Create: `src/app/api/contactos/[id]/route.ts`

Auth: igual que `src/app/api/crm/conversaciones/entrantes/route.ts` — `getServerSession` + `getUsuarioIdFromSession()` (eso ya es UUID).

**GET `/api/contactos?q=`**

- Sin `q`: `select * from contactos where usuario_id = uuid order by fecha_actualizacion desc limit 100`
- Con `q`: normalizar teléfono; buscar

```ts
const q = searchParams.get('q')?.trim() || '';
const digits = telefonoDigits(q);
let query = supabase.from('contactos').select('*').eq('usuario_id', usuarioId);
if (q) {
  const orParts = [
    `nombre.ilike.%${q}%`,
    `email.ilike.%${q}%`,
  ];
  if (digits) orParts.push(`telefono_digits.ilike.%${digits}%`);
  query = query.or(orParts.join(','));
}
```

Para acentos: no usar solo `ilike` sobre `nombre`. RPC:

```sql
CREATE OR REPLACE FUNCTION public.buscar_contactos(p_usuario uuid, p_q text)
RETURNS SETOF public.contactos
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.contactos
  WHERE usuario_id = p_usuario
    AND (
      p_q IS NULL OR btrim(p_q) = ''
      OR unaccent(nombre) ILIKE '%' || unaccent(p_q) || '%'
      OR COALESCE(email, '') ILIKE '%' || p_q || '%'
      OR COALESCE(telefono_digits, '') LIKE '%' || regexp_replace(p_q, '\D', '', 'g') || '%'
    )
  ORDER BY fecha_actualizacion DESC
  LIMIT 100;
$$;
```

Agregar esta función en una segunda `apply_migration` name `buscar_contactos_unaccent` si no se metió en Task 3. Preferible **meterla en Task 3** si todavía no se aplicó; si Task 3 ya está en prod, migración aparte.

GET llama `supabase.rpc('buscar_contactos', { p_usuario: usuarioId, p_q: q })`.

**POST** body `{ nombre, telefono, email, empresa, notas, wa_jid }`

- `nombre` required
- `telefono_digits = telefonoDigits(telefono)`
- insert; si unique violation, return 409 `{ error: 'Ya existe un contacto con ese teléfono' }`

**GET `/api/contactos/[id]`:** contacto + `conversaciones` (`id, remitente, servicio_origen, fecha_mensaje, metadata`) + `leads` (`id, nombre, estado_id, estados_lead(nombre, color)`). 404 si no es del usuario.

**PATCH:** mismos campos; recalcular `telefono_digits`.

**DELETE:** delete contacto (chats/leads quedan, `ON DELETE SET NULL`).

- [ ] **Step 1:** RPC `buscar_contactos` si falta
- [ ] **Step 2:** Implementar las dos rutas
- [ ] **Step 3:** `npx tsc --noEmit` OK
- [ ] **Step 4: Commit** `feat: API CRUD y busqueda de contactos`

---

### Task 7: UI listado `/contactos`

**Files:**
- Create: `src/app/contactos/page.tsx`
- Create: `src/app/contactos/ContactosList.tsx` (client)
- Modify: `src/app/componentes/EncabezadoSistema.tsx` — agregar `{ name: "Contactos", href: "/contactos" }` en `primaryNav` **entre Chat y CRM**. En el menú móvil, el mismo link con icono `Users` de lucide-react (ya usado el paquete).

Página: `'use client'` list + `EncabezadoSistema`, mismo padding `pt: '70px'` que CRM.

- TextField búsqueda con debounce 300ms → `GET /api/contactos?q=`
- Botón Nuevo: Dialog nombre + teléfono + email
- Click fila → `/contactos/[id]`
- Vacío: “No hay contactos. Creá uno o arrastrá un chat al Kanban.”

No tests de componente (Vitest solo cubre `src/lib/**/__tests__`).

- [ ] **Step 1:** Nav
- [ ] **Step 2:** Listado + crear
- [ ] **Step 3:** `npx tsc --noEmit` OK
- [ ] **Step 4: Commit** `feat: listado y alta de contactos`

---

### Task 8: Ficha `/contactos/[id]`

**Files:**
- Create: `src/app/contactos/[id]/page.tsx`

Muestra: nombre, teléfono, email, empresa, notas (editables PATCH). Lista de chats (link `/chat?conversacion=`). Lista de leads (etapa + link `/crm?lead=`).

Botón eliminar con confirmación → DELETE → redirect `/contactos`.

- [ ] **Step 1:** Implementar ficha
- [ ] **Step 2:** `npx tsc --noEmit` OK
- [ ] **Step 3: Commit** `feat: ficha de contacto con chats y deals`

---

### Task 9: Drag al Kanban — upsert + pregunta lead abierto

**Files:**
- Modify: `src/app/api/crm/conversaciones/entrantes/route.ts` POST
- Modify: `src/lib/contactos/matchContacto.ts` — `upsertContactoPorTelefono`
- Modify: `src/app/crm/contexts/LeadsKanbanContext.tsx`
- Modify: `src/app/crm/componentes/KanbanLeads.tsx`

**Upsert (nunca throw por duplicado):**

```ts
export async function upsertContactoPorTelefono(
  supabase: SupabaseClient,
  input: {
    usuarioId: string;
    nombre: string;
    telefonoDisplay: string | null;
    waJid?: string | null;
  }
): Promise<string | null> {
  const digits = telefonoDigits(input.telefonoDisplay);
  if (!digits) {
    const { data } = await supabase.from('contactos').insert({
      usuario_id: input.usuarioId,
      nombre: input.nombre,
      telefono: input.telefonoDisplay,
      wa_jid: input.waJid,
    }).select('id').single();
    return data?.id ?? null;
  }
  const { data, error } = await supabase
    .from('contactos')
    .upsert(
      {
        usuario_id: input.usuarioId,
        nombre: input.nombre,
        telefono: input.telefonoDisplay,
        telefono_digits: digits,
        wa_jid: input.waJid,
      },
      { onConflict: 'usuario_id,telefono_digits' }
    )
    .select('id')
    .single();
  if (error) {
    const existing = await supabase.from('contactos').select('id')
      .eq('usuario_id', input.usuarioId).eq('telefono_digits', digits).maybeSingle();
    return existing.data?.id ?? null;
  }
  return data?.id ?? null;
}
```

Postgres unique **parcial** (`WHERE telefono_digits <> ''`) a veces no sirve como `onConflict` target. Si el upsert falla, el fallback select+update de arriba es obligatorio. Preferir:

```sql
-- en migración, unique constraint nombrado no parcial si podemos garantizar null vs empty:
-- ya está el índice único parcial. Entonces: SELECT; si existe UPDATE nombre; else INSERT.
```

Implementar **select-then-insert** con retry on unique violation, no depender de `onConflict` del índice parcial.

**POST existing flow** (después de resolver `nombre`/`telefono`, antes del insert lead):

1. `upsertContactoPorTelefono`
2. Buscar leads del contacto cuyo `estados_lead.nombre` no es terminal:

```ts
const { data: abiertos } = await supabase
  .from('leads')
  .select('id, nombre, estado_id, estados_lead(nombre)')
  .eq('contacto_id', contactoId)
  .eq('asignado_a', client.usuarioId);
const abierto = (abiertos || []).find((l) => !isEstadoTerminal(l.estados_lead?.nombre || ''));
```

3. Si `abierto` y el body **no** trae `forceNewLead: true` ni `reuseLeadId`:

```json
{ "needsChoice": true, "openLead": { "id", "nombre", "estado_id" }, "contactoId": "..." }
```

Status 409 o 200 con `needsChoice` — usar **200 + needsChoice** para no romper el fetch actual que trata no-ok como error.

4. Si `reuseLeadId`: update `leads.estado_id = estadoId`, `conversaciones.lead_id` y `contacto_id`, return that lead. **Esto sí es el vendedor eligiendo mover.**
5. Si `forceNewLead` o no hay abierto: insert lead con `contacto_id`, update conversación `lead_id` + `contacto_id`.

**UI KanbanLeads** cuando `convertirIncomingEnLead` recibe `needsChoice`: Dialog “Este contacto ya tiene un deal en {etapa}. ¿Mover ese deal acá o crear uno nuevo?” Botones: Mover / Crear nuevo. Re-llamar POST con `reuseLeadId` o `forceNewLead: true`.

Extender `convertirIncomingEnLead(conversationId, estadoId, extra?: { reuseLeadId?: string; forceNewLead?: boolean })`.

- [ ] **Step 1:** Helper upsert select-insert
- [ ] **Step 2:** POST con needsChoice
- [ ] **Step 3:** Dialog en KanbanLeads
- [ ] **Step 4:** `npx tsc --noEmit` OK
- [ ] **Step 5: Commit** `feat: upsert de contacto al pasar chat al Kanban`

---

### Task 10: Globo unread en tarjeta Kanban + nombre en chat

**Files:**
- Modify: `src/app/api/supabase/leads/route.ts` GET — para cada lead, adjuntar `unread_count` de la conversación vinculada (`lead_id` o `contacto_id`)
- Modify: `src/app/crm/componentes/KanbanLeads.tsx` — punto/globo si `unread_count > 0`. **No** tocar `estado_id`
- Modify: `src/app/api/chat/conversaciones/route.ts` — join `contactos(nombre)` por `contacto_id`; si hay nombre, usarlo como `display_name` (gana sobre `contact_name` de metadata)

En GET conversaciones, tras armar `view`:

```ts
display_name: conv.contactos?.nombre || conversationDisplayName(view)
```

Select: agregar `contacto_id, contactos(nombre)`.

- [ ] **Step 1:** leads GET incluye unread
- [ ] **Step 2:** globo en card
- [ ] **Step 3:** chat lista/header usan `contactos.nombre`
- [ ] **Step 4:** `npx tsc --noEmit` OK
- [ ] **Step 5: Commit** `feat: nombre de contacto en chat y unread en Kanban`

---

### Task 11: Docs de orden

**Files:**
- Modify: `docs/ORDEN-ACTUAL-PRODUCTO.md` — tabla de docs + checkboxes Fase 2
- Modify: `docs/MENSAJERIA-WHATSAPP-FLUJO.md` — una línea: match de contacto por `telefono_digits`, no crea siempre

Fase 2 checkboxes:

- [x] Tabla `contactos` + CRUD + búsqueda (unaccent).
- [x] Ficha: conversaciones + lead del Kanban (presentaciones después).
- [x] Cruzar teléfono/WhatsApp entrante con contactos existentes (sin crear).
- [ ] Al mover el lead de etapa, registrar en la ficha. *(fuera de este corte — timeline)*
- [ ] Importar Sheets y CSV.

Agregar fila: Contactos CRM → `docs/superpowers/specs/2026-08-21-contactos-crm-design.md`

- [ ] **Step 1:** Actualizar docs
- [ ] **Step 2: Commit** `docs: contactos persona-deal en el orden del producto`

---

## Coverage vs spec

| Spec | Task |
|---|---|
| Tabla + FKs SET NULL + índice teléfono | 3 |
| `usuarios.google_id` + helper único | 3, 4 |
| `telefonoDigits` AR un solo módulo | 1 |
| Incoming match 1–4 sin crear | 2, 5 |
| LID sin fusión | 5 skip / 1 null |
| CRUD + unaccent | 6, 7, 8 |
| Drag upsert + pregunta lead abierto | 9 |
| Estado solo a mano | 9 reuse es acción del vendedor; 5 no toca estado |
| Globo unread, no cambia columna | 10 |
| Nav Contactos | 7 |
| Sin backfill / truncate opcional | 3 nota |
| Éxito 1–5 | 7, 9, 5, 10, 9 |

## Cómo probar (manual, al final)

1. `/contactos` → crear Juan Pérez + `11 1234-5678` → buscar `Perez` y `Pérez`.
2. Chat de ese número: el nombre debe ser Juan sin tocar nada (hace falta un mensaje *después* de crear el contacto, o reabrir el match).
3. Chat de número nuevo: no aparece en `/contactos`.
4. Arrastrar ese chat al Kanban: se crea contacto + lead.
5. Arrastrar **otro** chat del mismo teléfono (si hubiera) o volver a arrastrar: debe preguntar Mover vs Crear.
6. Mandar un WhatsApp: la tarjeta no salta de columna; sí puede verse el globo.
