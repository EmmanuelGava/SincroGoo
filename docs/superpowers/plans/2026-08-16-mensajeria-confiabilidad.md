# Mensajería KloSync — confiabilidad, media y deudas conscientes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pasar el chat WhatsApp Lite de “funciona en la demo” a envíos recuperables, mensajes no duplicados, ticks reales y media persistida, sin construir Kommo ni Cloud API todavía.

**Architecture:** Vercel (Next.js + NextAuth) orquesta; Railway (`worker/whatsapp.ts` + Baileys) tiene el socket 24/7; Supabase guarda inbox, sesión y (nuevo) outbox. Los acks y la cola viven en el worker porque Vercel se duerme. El browser nunca escribe Storage ni Postgres con la anon key.

**Tech Stack:** Next.js 14.1, NextAuth Google JWT, Supabase Postgres + Storage (`chat-images`, `chat-audio`), Baileys 6.7.18, worker HTTP en Railway, UI chat en MUI.

**Fuente de verdad del canal actual:** `docs/MENSAJERIA-WHATSAPP-FLUJO.md`

## Global Constraints

- Hablar y commitear en español. PowerShell: `;` no `&&`. Deploy: `git push` a `main` (Vercel + Railway).
- Login = NextAuth. `session.user.id` es Google ID. No usar `auth.uid()` de Supabase para RLS de chat.
- Canal productivo hoy = WhatsApp **Lite** (Baileys). Cloud API / Evolution no están en el camino caliente.
- 1 número Lite = 1 vendedor (`conversaciones.usuario_id` = Google ID). No diseñar round-robin hasta la tarea 9.
- LID (`@lid`) no es teléfono. No guardar LID como `phone_number`. Enviar al `remote_jid`.
- `getSupabaseAdmin()` solo en servidor / worker. Uploads de media por `/api/chat/upload` o service role en el worker.
- No commitear `.env`, `.cursor/mcp.json` ni secretos.
- Cada tarea termina en algo verificable en prod (chat real o SQL). Commits chicos.
- Tareas 8–10 están **gateadas**: no implementar hasta el criterio de “empezar” de cada una.

---

## Mapa de archivos

| Archivo | Rol en este plan |
|---|---|
| `src/lib/chat/sendMessage.ts` | Deja de mandar directo al worker; encola en outbox |
| `src/app/api/chat/send/route.ts` | Sigue autenticando; no cambia el contrato del frontend salvo `outbox_id` |
| `src/app/api/chat/upload/route.ts` | Límites por tipo (tarea 5) |
| `src/app/servicios/storage/FileUploadService.ts` | Validación cliente alineada a límites |
| `src/lib/chat/handleIncomingMessage.ts` | Dedupe por `wa_message_id`; persistir media |
| `src/app/api/integrations/incoming/whatsapp/route.ts` | Lite: secret; Business: firma (tarea 8) |
| `src/app/servicios/messaging/whatsapp/modules/EventManager.ts` | `messages.upsert` con `key.id`; `messages.update` acks; media buffer |
| `src/app/servicios/messaging/whatsapp/WhatsAppLiteService.ts` | Send con delay; devolver `key.id`; borrar V2/Old en tarea 7 |
| `worker/whatsapp.ts` | Loop outbox, `/send` interno, delay, media incoming |
| `src/lib/whatsapp/workerClient.ts` | `liteSend` puede quedar para el worker interno; la app usa outbox |
| `src/app/chat/components/MessageStatus.tsx` | Ticks enviado / entregado / leído / error |
| `src/app/chat/components/ChatWindow.tsx` | Optimistic + `estado_envio` del poll |
| `src/lib/chat/conversationIdentity.ts` | Sin cambios de identidad; no fusionar LID |
| `docs/MENSAJERIA-WHATSAPP-FLUJO.md` | Actualizar al cerrar cada fase |

Tablas nuevas/columnas (Supabase klosync, MCP `user-supabase klosync`):

- `whatsapp_outbox` (tarea 1)
- `mensajes_conversacion.wa_message_id`, `mensajes_conversacion.estado_envio` (tareas 2–3)
- `conversaciones.asignado_a` recién en tarea 9

---

## Orden y por qué

```
1 outbox → 2 dedupe → 3 acks → 4 media in → 5 límites UI
       → 6 delay anti-ban → 7 borrar legacy
       → [gate] 8 Meta → [gate] 9 asignación → [anotar] 10 transcripción
```

1 desbloquea 3 (el outbox guarda el `wa_message_id` del send). 2 desbloquea Kanban limpio. 4 usa los buckets que ya existen. 6 se monta sobre el loop del outbox. 8–9 no se tocan si el gate no se cumple.

---

### Task 1: Outbox y reintento de salientes

**Por qué:** Si Railway reinicia o Baileys da 428 a mitad del POST, el mensaje no queda en ningún lado. El retry actual es del mismo request.

**Files:**
- Create: `src/lib/chat/outbox.ts`
- Modify: `src/lib/chat/sendMessage.ts`, `worker/whatsapp.ts`, `src/app/api/chat/send/route.ts`
- Test: envío con worker parado → mensaje en `queued` → worker up → sale y pasa a `sent`

**Interfaces:**
- Consumes: `SendMessageData` actual (`platform`, `to`, `message`, `messageType`, `filePath`, `userId`, `metadata.conversacion_id`)
- Produces: `enqueueWhatsAppOutbox(row) → { id }`; worker `processOutboxBatch(limit = 10)`; estados `queued | sending | sent | failed`

**Schema (ejecutar en Supabase klosync con `execute_sql`, no `apply_migration` a ciegas):**

```sql
create table if not exists public.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  usuario_id text not null,
  conversacion_id uuid references public.conversaciones(id) on delete set null,
  to_jid text not null,
  message_type text not null default 'text',
  contenido text not null default '',
  file_url text,
  mimetype text,
  file_name text,
  status text not null default 'queued'
    check (status in ('queued','sending','sent','failed')),
  attempts int not null default 0,
  max_attempts int not null default 8,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  wa_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_outbox_due_idx
  on public.whatsapp_outbox (next_attempt_at)
  where status in ('queued','sending');

alter table public.whatsapp_outbox enable row level security;
```

Backoff: `min(30s * 2^attempts, 15min)` más jitter 0–20%. Tras `max_attempts` → `failed` y `metadata.estado_envio = error` en el mensaje del inbox.

- [x] **Step 1: Crear tabla** con el SQL de arriba. Verificar `select * from whatsapp_outbox limit 1;` (0 filas, sin error).
- [x] **Step 2: `enqueueWhatsAppOutbox`** en `src/lib/chat/outbox.ts`. Inserta fila `queued`. No llama al worker.
- [x] **Step 3: Cambiar `sendMessage`** para WhatsApp: (a) guardar el mensaje del inbox con `estado_envio: 'enviando'` y `outbox_id`; (b) encolar; (c) `return { success: true }` si encoló. El socket ya no se toca desde Vercel.
- [x] **Step 4: Loop en el worker** cada 2s: claim atómico + `whatsappLiteService.sendMessage`.
- [ ] **Step 5: Probar** apagar Railway, mandar un texto desde el chat (queda enviando), prender worker, el mensaje sale y el tilde pasa a enviado. *RPC claim + failed permanente verificado contra prod; falta el loop en el worker de Railway (redeploy) y el ciclo worker-down desde el chat.*
- [x] **Step 6: Commit** `feat: cola outbox para envios WhatsApp`
- [x] **Step 7: Actualizar** `docs/MENSAJERIA-WHATSAPP-FLUJO.md` sección 6 (flujo saliente = outbox).

**No hacer en esta tarea:** delay anti-ban (tarea 6), acks de entregado (tarea 3). El send de Baileys puede devolver `key.id`; guardarlo ya en `wa_message_id` para no rehacer el claim después.

---

### Task 2: Idempotencia de entrantes (`wa_message_id`)

**Por qué:** Baileys reemite `messages.upsert` (notify vs append) y Vercel puede reintentar el POST a `/api/integrations/incoming/whatsapp`. Sin dedupe, el Kanban duplica.

**Files:**
- Modify: `src/app/servicios/messaging/whatsapp/modules/EventManager.ts`, `src/app/api/integrations/incoming/whatsapp/route.ts`, `src/lib/chat/handleIncomingMessage.ts`
- Test: reenviar el mismo POST incoming dos veces → una sola fila

**Interfaces:**
- Consumes: `message.key.id` de Baileys; body lite `{ from, fromJid, message, userId, wa_message_id }`
- Produces: `handleIncomingMessage` no inserta si ya existe `(usuario vía conversación, wa_message_id)`

```sql
alter table public.mensajes_conversacion
  add column if not exists wa_message_id text;

create unique index if not exists mensajes_wa_message_id_uidx
  on public.mensajes_conversacion (wa_message_id)
  where wa_message_id is not null;
```

- [x] **Step 1: Columna + unique index.**
- [x] **Step 2: EventManager** en `messages.upsert`: mandar `wa_message_id: message.key.id`. `fromMe` entra como saliente (eco del celular). No usar `participant` de grupos.
- [x] **Step 3: `handleIncomingMessage`:** si viene `wa_message_id`, select previo + unique index (`23505`). Responder `{ success: true, duplicate: true }` sin crear otra conversación.
- [ ] **Step 4: Probar** curl/replay del mismo body lite con el mismo `wa_message_id` → un solo mensaje.
- [x] **Step 5: Commit** `fix: deduplicar mensajes WhatsApp por wa_message_id`

**Nota:** el unique global asume que los `key.id` de Baileys no chocan entre usuarios. Si algún día hay multi-sesión en el mismo proyecto, cambiar a unique `(conversacion_id, wa_message_id)`. Hoy 1 sesión Lite es suficiente.

---

### Task 3: Estados enviado / entregado / leído / falló

**Por qué:** El check actual es “Baileys aceptó” o “lo guardamos”. Un CRM de ventas necesita saber si llegó al teléfono.

**Files:**
- Modify: `EventManager.ts` (`messages.update`), `WhatsAppLiteService.ts` (exponer socket events ya están), `MessageStatus.tsx`, `ChatWindow.tsx` / poll de `useChat`
- Modify: `handleIncomingMessage` no; actualizar `mensajes_conversacion.metadata.estado_envio` y columna `estado_envio`

**Interfaces:**
- Consumes: Baileys `messages.update` → `update.key.id` + `update.update.status` (proto: 0 ERROR, 2 SERVER, 3 DELIVERY, 4 READ, 5 PLAYED)
- Produces: `estado_envio`: `enviando | enviado | entregado | leido | error`

```sql
alter table public.mensajes_conversacion
  add column if not exists estado_envio text;

create index if not exists mensajes_wa_id_lookup
  on public.mensajes_conversacion (wa_message_id)
  where wa_message_id is not null;
```

Mapa:

| Baileys status | UI | Tooltip |
|---|---|---|
| (outbox sending) | enviando | Enviando… |
| 2 SERVER / sent | enviado | Enviado |
| 3 DELIVERY | entregado | Entregado (doble tilde gris) |
| 4 READ / 5 PLAYED | leido | Leído (doble tilde azul/verde) |
| 0 ERROR / outbox failed | error | Error: {last_error} |

- [x] **Step 1: Columna `estado_envio`.** Seguir escribiendo también `metadata.estado_envio` para no romper la burbuja actual.
- [x] **Step 2: Listener `socket.ev.on('messages.update')`** en EventManager. Buscar mensaje por `wa_message_id`. Solo **avanzar** estado (no bajar de leido a enviado).
- [x] **Step 3: Al completar outbox sent**, set `wa_message_id` + `estado_envio = enviado` en el mensaje del inbox (match por `metadata.outbox_id`).
- [x] **Step 4: MessageStatus** casos `leido` (DoneAll color `#4FC3F7`) y no tratar `undefined` como enviado si `id` empieza con `temp-`.
- [x] **Step 5: Probar** mandar a un contacto real: 1 tilde → 2 tildes al llegar al celular → azules al abrir. Apagar datos del destinatario: se queda en enviado, no en leído.
- [x] **Step 6: Commit** `feat: ticks de entrega y lectura WhatsApp`

---

### Task 4: Media entrante al bucket (no perder el archivo)

**Por qué:** Baileys te da el binario un rato. Si no lo subís a `chat-images` / `chat-audio`, el chat queda en “mensaje sin texto” y se omite (hoy `extractIncomingText` descarta imagen/audio).

**Files:**
- Modify: `EventManager.ts` (`downloadMediaMessage` de baileys), worker (tiene service role), `handleIncomingMessage.ts`
- Reuse: buckets `chat-images`, `chat-audio` ya creados

**Interfaces:**
- Consumes: `message.message.imageMessage` / `audioMessage` / `documentMessage`
- Produces: incoming con `messageType: 'image'|'audio'|'file'`, `metadata.file_url`, `duration` si audio

Flujo:

```
messages.upsert (no fromMe)
  → downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: socket.updateMediaMessage })
  → supabase.storage.from(bucket).upload(`${userId}/in/${msg.key.id}.${ext}`)
  → POST incoming { type, file_url, wa_message_id, duration? }
  → handleIncomingMessage guarda contenido placeholder + metadata.file_url
```

- [x] **Step 1:** Dejar de `continue` cuando no hay texto si hay imagen/audio. Caption si existe.
- [x] **Step 2:** Subir buffer con service role desde el **worker** (no desde Vercel: el binario no viaja en el JSON). Mandar solo la URL pública al inbox.
- [x] **Step 3:** `FileAttachment` ya renderiza image/audio por `metadata.file_url`. Asegurar que `MessageBubble` pasa `file_type`.
- [ ] **Step 4: Probar** que te manden una foto y un audio: aparecen en el hilo y el archivo sigue abriendo al día siguiente.
- [ ] **Step 5: Commit** `feat: persistir imagen y audio entrantes en storage`

**Límites de descarga:** si el buffer > 16 MB, no subir; guardar `estado` omitido + log. No reventar el worker.

---

### Task 5: Límites de tamaño y tipo visibles (salientes)

**Por qué:** WhatsApp/Baileys rechazan en silencio o con error opaco. El usuario tiene que enterarse **antes** de encolar.

**Files:**
- Modify: `src/app/api/chat/upload/route.ts`, `FileUploadService.ts`, `FileUpload.tsx`, `AudioRecorder.tsx`, `ChatWindow.tsx`

Constantes canónicas en `src/lib/chat/mediaLimits.ts` (un solo lugar):

```ts
export const MEDIA_LIMITS = {
  image: { maxBytes: 5 * 1024 * 1024, types: ['image/jpeg','image/png','image/webp','image/gif'] },
  audio: { maxBytes: 16 * 1024 * 1024, types: ['audio/ogg','audio/webm','audio/mpeg','audio/mp4','audio/aac'] },
  video: { maxBytes: 16 * 1024 * 1024, types: ['video/mp4'] }, // no UI todavía, reservado
  file:  { maxBytes: 100 * 1024 * 1024, types: ['application/pdf'] }, // no Lite por ahora
} as const;
```

WhatsApp personal es más estricto que el bucket (bucket imagen 10 MB). El límite **de envío** es 5 MB imagen para no pelear con el cliente de WA.

- [x] **Step 1:** Crear `mediaLimits.ts`. Usarlo en upload API y FileUploadService.
- [x] **Step 2:** UI: toast/alert “La imagen no puede superar 5 MB” / “Audio máximo 16 MB”.
- [x] **Step 3:** Rechazar video en el clip por ahora (no hay bucket ni send de video).
- [ ] **Step 4: Probar** PNG de 6 MB → error claro, no outbox.
- [x] **Step 5: Commit** `fix: limites de media WhatsApp antes de subir`

---

### Task 6: Rate limiting no robótico (anti-ban)

**Por qué:** Ráfagas desde el CRM parecen bot. La investigación de baneos: pacing humano + tope por sesión.

**Files:**
- Modify: `worker/whatsapp.ts` (loop outbox), create `src/app/servicios/messaging/whatsapp/modules/sendPacing.ts`

**Interfaces:**
- Consumes: outbox rows ya claimed
- Produces: espera **antes** de `socket.sendMessage`

Reglas v1 (1 número = 1 vendedor):

- Gap aleatorio **800–2500 ms** entre dos envíos de la misma sesión.
- Techo **20 mensajes / 60 s** por `usuario_id`; si se pasa, `next_attempt_at = now() + 20–40s` y no marcar failed.
- No delay extra en el primer mensaje de una conversación si el último envío fue hace > 2 min (respuesta humana).
- Nunca `Promise.all` de sends.

```ts
export function nextSendDelayMs(lastSentAt: number | null): number {
  if (!lastSentAt || Date.now() - lastSentAt > 120_000) return 0;
  return 800 + Math.floor(Math.random() * 1700);
}
```

- [x] **Step 1:** Módulo `sendPacing.ts` con in-memory `Map<userId, { lastSentAt, window }>`. El worker es un proceso: memoria alcanza.
- [x] **Step 2:** Enganchar en `processOutboxBatch` **después** del claim, **antes** del send. El delay es solo worker (logs `⏳ pacing`); el front sigue encolando al toque.
- [ ] **Step 3: Probar** mandar 5 textos seguidos: salen escalonados, no en 200 ms. Logs `⏳ pacing 1.4s`.
- [x] **Step 4: Commit** `feat: pacing anti-ban en envios WhatsApp`

No implementar cola global Redis. Un worker, una sesión.

---

### Task 7: Borrar código duplicado V1/V2/Old

**Por qué:** El worker importa `WhatsAppLiteService` (singleton). `V2` y `Old` no corren, pero un grep en un incidente te hace dudar.

**Files a eliminar (verificar que nadie importe, luego borrar):**
- `src/app/servicios/messaging/whatsapp/WhatsAppLiteServiceV2.ts`
- `src/app/servicios/messaging/whatsapp/WhatsAppLiteServiceOld.ts`
- `src/app/servicios/messaging/whatsapp/modules/EventManager.backup.ts`
- `src/app/servicios/messaging/whatsapp/modules/EventManager.clean.ts`
- Stubs solo usados por Old (`SessionManager.ts` si queda huérfano)

**Files que se quedan:** `WhatsAppLiteService.ts`, `modules/EventManager.ts`, `ConnectionManager.ts`, `DatabaseManager.ts`, `AuthManager.ts`, `socketHealth.ts`, `worker/whatsapp.ts`

- [ ] **Step 1:** `rg "WhatsAppLiteServiceV2|WhatsAppLiteServiceOld|EventManager.backup|EventManager.clean" src worker`
- [ ] **Step 2:** Si solo hay auto-referencias, borrar archivos. Si algo de tests los usa, actualizar tests o borrar tests muertos.
- [ ] **Step 3:** `npx tsc --noEmit` OK.
- [ ] **Step 4: Commit** `chore: borrar servicios WhatsApp legacy`
- [ ] **Step 5:** Una línea en el doc canónico: “la única clase viva es `WhatsAppLiteService`”.

---

### Task 8: Firma Meta y tokens (GATEADA)

**Empezar solo si:** hay un número Cloud API / WhatsApp Business conectado a `klosync.vercel.app/api/integrations/incoming/whatsapp` o se agenda esa conexión en la semana.

**Hoy:** el GET verifica `hub.verify_token`; el POST Business **no** chequea `X-Hub-Signature-256`. Lite usa `x-worker-secret` (eso sí está).

**Files:**
- Modify: `src/app/api/integrations/incoming/whatsapp/route.ts`
- Create: `src/lib/whatsapp/verifyMetaSignature.ts`

```ts
import { createHmac, timingSafeEqual } from 'crypto';

export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

Importante: leer **raw body** (no `request.json()` primero). En App Router: `const raw = await request.text(); JSON.parse(raw)`.

Tokens: documentar en el doc canónico `WHATSAPP_APP_SECRET`, rotación, y que el token de sandbox expira. Guardar `expires_at` en `configuracion_mensajeria_usuario` cuando exista el flujo OAuth Business. **No** implementar OAuth completo en esta tarea si solo se valida la firma.

- [ ] **Step 1:** Confirmar con el usuario “¿hay WABA en este entorno?”. Si no → skip, dejar este bloque intacto.
- [ ] **Step 2:** Firma + 401 si falla. Lite no pasa por este check.
- [ ] **Step 3:** Test: POST sin firma → 401; con HMAC correcto → 200.
- [ ] **Step 4: Commit** `fix: verificar firma del webhook Meta`

---

### Task 9: Asignación multi-vendedor (GATEADA)

**Empezar solo si:** dos usuarios de KloSync tienen que atender el **mismo** número, o se vende plan “equipo”.

**Hoy el modelo ya es 1 a 1:** `whatsapp_lite_sessions` / `configuracion_mensajeria_usuario` por usuario, `conversaciones.usuario_id` = Google ID. Un mensaje Lite entra al inbox de quien tiene el socket. No hay conflicto de escritura entre vendedores.

Si el gate se abre, diseño mínimo (no round-robin todavía):

```sql
alter table public.conversaciones
  add column if not exists asignado_a text; -- Google ID
```

- Incoming: si la conversación no tiene `asignado_a`, `asignado_a = usuario_id` del dueño del número.
- UI: chip “Asignado a …” en header. Cambio manual después.
- Concurrencia: outbox ya serializa envíos; dos agentes escribiendo = dos outbox rows, WhatsApp acepta ambos (como dos ventanas Web). No hace falta lock de fila salvo “typing” (fuera de alcance).

- [ ] **Step 1:** Gate. Si 1 número = 1 login, **no code**.
- [ ] **Step 2:** Columna + default al crear conversación.
- [ ] **Step 3:** Filtro inbox `asignado_a = session.user.id` OR rol admin (cuando exista).
- [ ] **Step 4: Commit** `feat: asignacion manual de conversaciones`

---

### Task 10: Transcripción de audios (deuda consciente, no implementar)

**No code de Whisper/Gemini en este plan.**

Sí anotar y dejar el campo listo para no rehacer schema después:

```sql
alter table public.mensajes_conversacion
  add column if not exists audio_duration_sec numeric,
  add column if not exists audio_transcript text;
```

En tarea 4, al persistir audio, llenar `audio_duration_sec` desde `audioMessage.seconds` de Baileys (viene en el proto) o desde el recorder (`duration` ya existe en ChatWindow).

En `docs/MENSAJERIA-WHATSAPP-FLUJO.md` sección nueva **Deudas conscientes:**

- Transcribir audios para priorizar en el CRM (vendedor no escucha 40 notas).
- Candidato: job async (Railway o cron) → `audio_transcript`.
- No bloquear envío/recepción.

- [ ] **Step 1:** Columnas + guardar duración en incoming/outgoing audio (puede ir pegado a la tarea 4).
- [ ] **Step 2:** Párrafo en el doc. **No** API de transcripción.
- [ ] **Step 3: Commit** si hubo SQL/duración: `chore: duracion de audio y deuda de transcripcion`

---

## Criterios de hecho por fase (prod)

| Tarea | Listo cuando |
|---|---|
| 1 | Worker down 1 min, texto no se pierde, sale al volver |
| 2 | Replay del mismo `wa_message_id` no duplica |
| 3 | Tilde simple → doble → azul en un chat real |
| 4 | Foto y audio de un contacto se ven al día siguiente |
| 5 | Archivo oversized no se encola y muestra el límite |
| 6 | 5 mensajes no salen en el mismo segundo |
| 7 | `tsc` verde y grep sin V2/Old |
| 8 | (si gate) POST Business sin firma = 401 |
| 9 | (si gate) inbox filtrado por asignado |
| 10 | Duración visible o en metadata; transcripción solo en el doc |

---

## Fuera de alcance (no colarse)

- Evolution API, multi-device extra, grupos `@g.us`, stories.
- Video send, documentos PDF por Lite.
- `postgres_changes` (sigue NextAuth).
- Redis, BullMQ, Kubernetes.
- Facturación, planes equipo, roles admin (salvo el gancho de la 9).
- Reescribir el chat en shadcn.

---

## Self-review

| Punto original | Tarea |
|---|---|
| Cola y reintentos | 1 |
| Idempotencia / message_id | 2 |
| Estados enviado/entregado/leído/falló | 3 |
| Media: no perder archivo + límites canal | 4 y 5 |
| Transcripción / duración | 10 |
| Multi-sesión asignación | 9 (gate) |
| Concurrencia dos vendedores | 9 + outbox de 1 |
| Sesión en BD no filesystem | ya hecho; no reabrir. Tarea 7 evita dudas de qué corre |
| Rate limiting no robótico | 6 |
| Código V1/V2/Old | 7 |
| Firma Meta / tokens | 8 (gate) |

Hueco cubierto extra: media **entrante** (Claude habló sobre todo de URLs de Meta; en Lite el equivalente es bajar el buffer de Baileys).
