# Equipo v1 — org, roles, asignación (core producto)

Fecha: 2026-08-27.  
**Prioridad:** subir de “Fase 8” a **Fase 3½** — antes de canales/widget/bot.  
**Objetivo:** que un negocio con 2–5 personas use KloSync sin “un Google login = un mundo aislado”.

## Qué es y qué NO es

| Equipo v1 (este spec) | Equipo escala (Fase 8+, otro spec) |
|------------------------|-------------------------------------|
| Workspace / organización compartida | Varios agentes en el **mismo** número WA (inbox compartido Baileys) |
| Roles `admin` y `agente` | Broadcast / campañas masivas |
| Asignar lead y chat a un miembro | WhatsApp Cloud API / Coexistence Meta |
| Filtros “Mis / Todos / Sin asignar” | Chat interno tipo Slack (hilos sin cliente) |
| Notas de equipo en el hilo del cliente | Permisos granulares por módulo |

**Hoy:** `leads.asignado_a` existe y siempre se setea al usuario logueado. No hay org, roles ni UI de asignación.

**WhatsApp v1:** sigue **un número conectado por organización** (dueño/admin conecta QR). Los agentes responden desde la misma cuenta en KloSync; no es multi-sesión Baileys paralela.

## Modelo de datos

```
organizaciones (id, nombre, created_at)
organizacion_miembros (organizacion_id, usuario_id, rol, created_at)
  rol ∈ { admin, agente }

usuarios
  └── organizacion_id  (nullable hasta backfill; luego NOT NULL para usuarios activos)

leads
  asignado_a → usuarios.id (ya existe; miembro del equipo responsable)
  organizacion_id → organizaciones.id (nuevo; scope de queries)

contactos, chat_catalogo, configuracion_mensajeria_usuario
  organizacion_id (nuevo; mismo scope)

conversaciones
  usuario_id → texto Google ID del **dueño de la cuenta WA** (no cambiar en v1)
  asignado_a → usuarios.id (nuevo, nullable; sync con lead si hay lead_id)
  organizacion_id (nuevo)

notas_conversacion (o tabla actual de nota-interna)
  + autor_usuario_id (nuevo)
  visible para todos los miembros de la org (mismo conversacion_id)
```

### Backfill migración

1. Por cada `usuarios` existente: crear `organizaciones` (“Mi negocio” o nombre del usuario).
2. Insertar `organizacion_miembros` rol `admin`.
3. Setear `organizacion_id` en leads, contactos, catálogo, conversaciones del usuario.
4. Usuarios nuevos: al primer login crear org automática (igual que hoy pero con org).

### Roles

| Rol | Ve datos | Invita miembros | Conecta WhatsApp | Asigna leads |
|-----|----------|-----------------|------------------|--------------|
| **admin** | Toda la org | Sí | Sí | Sí (a cualquier miembro) |
| **agente** | Toda la org *(v1)* | No | No | Sí *(solo a sí o reasignar si admin lo permite — v1: cualquier miembro)* |

**v1 simplificado:** agente ve **toda** la org (como admin en lectura). Filtro “Mis leads” es UX, no RLS duro. RLS duro “solo lo mío” = v2 si hace falta.

## APIs (patrón existente)

- Session NextAuth → `usuarios.id` → `organizacion_id` vía `organizacion_miembros`.
- Todas las queries CRM/chat/catálogo filtran `organizacion_id = mi org`, no solo `asignado_a = yo`.
- `PATCH /api/supabase/leads/[id]` acepta `asignado_a` (uuid de miembro de la misma org).
- `PATCH /api/chat/conversaciones/[id]` acepta `asignado_a`; si hay `lead_id`, opcional sync al lead.
- `GET /api/organizacion/miembros` — lista para dropdowns.
- `POST /api/organizacion/invitar` — admin envía link o email invite *(v1: link con token; email opcional)*.

Helper único: `getOrganizacionContext(session)` → `{ usuarioId, organizacionId, rol }`.

## UI

### Kanban (`/crm`)

- Avatar o chip **asignado** en la card (nombre corto del miembro).
- Dropdown en card o en drawer editar: “Asignar a…” (lista de miembros).
- Filtro tablero: **Todos | Mis leads | Sin asignar** (extiende `LeadKanbanFiltros`).

### Chat (`/chat`)

- Header: selector “Asignado: {nombre}” (mismo dropdown).
- Al asignar conversación sin lead, solo `conversaciones.asignado_a`.
- Al asignar con lead vinculado, actualizar lead + conversación.

### Configuración (`/configuracion/equipo` o pestaña en mensajería)

- Lista de miembros (nombre, email, rol).
- Admin: invitar por link, cambiar rol, quitar miembro.
- Agente: solo ver lista.

### Notas de equipo (evolución N1)

- Notas en header del chat: mostrar **autor** + timestamp.
- Texto: “Nota de equipo — no se envía al cliente”.
- Todos los miembros de la org ven las mismas notas del hilo.

## WhatsApp y worker (v1)

- `whatsapp_lite_sessions` / `configuracion_mensajeria_usuario`: scoped por `organizacion_id` (admin conecta).
- Mensajes salientes: metadata incluye `enviado_por_usuario_id` (uuid) para auditoría en UI (“Emma respondió”).
- **No** abrir múltiples sockets Baileys por agente en v1.

## Fuera de corte (explícito)

- Inbox compartido con varios números o varias sesiones WA.
- Chat interno sin cliente (grupo de trabajo Kommo).
- Permisos por columna del Kanban o por catálogo.
- Asignación automática (round-robin).
- Notificaciones push/email al asignar.

## Esfuerzo estimado

| Bloque | Días approx |
|--------|-------------|
| Migración + backfill + helper org | 1 |
| APIs scope org + asignación | 1–1.5 |
| UI Kanban + chat + filtros | 1–1.5 |
| Página equipo + invitaciones mínimas | 1 |
| Notas con autor + QA | 0.5 |
| **Total** | **~4–5 d** |

## Criterios de aceptación

1. Admin invita un segundo usuario; ambos ven los mismos leads y chats de la org.
2. Admin asigna un lead a el agente; el agente lo ve en “Mis leads”.
3. “Sin asignar” muestra entrantes/leads sin `asignado_a`.
4. Agente **no** puede conectar otro QR (solo admin).
5. Nota en header visible para el otro miembro con nombre del autor.
6. Un usuario de **otra** org no ve datos (test con dos cuentas Google).

## Orden de implementación

1. Migración `organizaciones` + miembros + `organizacion_id` + backfill.
2. `getOrganizacionContext` + refactor queries leads/conversaciones/contactos/catálogo.
3. PATCH asignación + GET miembros.
4. UI Kanban + filtros.
5. UI chat header asignación.
6. `/configuracion/equipo` + invite link.
7. Notas con autor.

## Referencias

- Dueño actual de datos: [`2026-08-21-contactos-crm-design.md`](./2026-08-21-contactos-crm-design.md) (`usuario_id` → migrar mentalidad a `organizacion_id`).
- Orden de producto: [`ORDEN-ACTUAL-PRODUCTO.md`](../../ORDEN-ACTUAL-PRODUCTO.md) Fase 3½.
