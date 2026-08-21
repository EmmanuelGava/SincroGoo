# Contactos CRM — persona + deal (v2)

Fecha: 2026-08-21. Modelo Kommo: el contacto es la persona; el lead del Kanban es el deal.

## Objetivo

Un vendedor busca a alguien por nombre o teléfono y abre una ficha. Ahí ve chats, el deal del Kanban y (más adelante) presentaciones. Un chat nuevo **no** crea solo un contacto. Un chat o lead puede existir sin contacto asociado (venta que no prosperó, no se agenda).

## Modelo

```
usuarios (UUID)
  └── contactos (persona: nombre, teléfono, email)
        ├── conversaciones.contacto_id
        └── leads.contacto_id   ← el Kanban sigue siendo deals
```

- Un contacto puede tener varios chats (WA, después otros canales).
- Un contacto puede tener varios leads (otra venta).
- Un lead sigue teniendo `estado_id` (columna del Kanban). **El estado del lead nunca cambia automáticamente por actividad del chat** — solo lo mueve el vendedor a mano.
- Dueño: `usuario_id` = `usuarios.id` (UUID), igual que `leads.asignado_a`.

### Mapeo Google ID ↔ usuario UUID

Las conversaciones siguen llegando con `usuario_id` texto (Google ID). Agregar columna `usuarios.google_id text UNIQUE` si no existe. Hoy `usuarios.auth_id` ya guarda el Google ID: `google_id` se rellena desde `auth_id` y el helper usa `google_id` (fallback `auth_id`).

Todo cruce entre `conversaciones` y `contactos`/`leads` pasa por: `usuarios.google_id = conversaciones.usuario_id` → `usuarios.id` (uuid). Documentar esta resolución en un solo helper. No repetir el join a mano en cada query.

## Tabla `contactos`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid NOT NULL | FK `usuarios.id` |
| nombre | text NOT NULL | |
| telefono | text | Display |
| telefono_digits | text | Solo dígitos normalizados, para match |
| email | text | Opcional |
| empresa | text | Opcional |
| notas | text | |
| wa_jid | text | `remote_jid` si todavía no hay teléfono real (LID) |
| fecha_creacion / fecha_actualizacion | timestamptz | |

Único: `(usuario_id, telefono_digits)` **donde** `telefono_digits` no es vacío.

Índice: `CREATE INDEX ON contactos (usuario_id, telefono_digits)` — el match corre en cada mensaje entrante.

No fusionar dos LID distintos. RLS on + APIs con session (mismo patrón que leads: admin fallback filtrando por `usuario_id`).

`leads.contacto_id` y `conversaciones.contacto_id`: uuid nullable FK, `ON DELETE SET NULL` (si se borra un contacto, el chat y el lead quedan sin persona, no se borran).

### Normalización de teléfono (Argentina)

Función determinística única, usada al guardar `contactos.telefono_digits` y al procesar el JID/teléfono entrante de WhatsApp:

- Quitar todo lo que no sea dígito.
- Si empieza con `54` y no tiene el `9` de celular después del código de país, insertarlo.
- Guardar siempre en formato `549` + código de área + número, sin el `+`.
- Un solo módulo (`src/lib/contactos/normalizarTelefono.ts`) en los dos lados del match. Nunca duplicar la lógica.

## Match WhatsApp (no crear siempre)

Al entrar un mensaje:

1. Si la conversación ya tiene `contacto_id`, usarlo.
2. Si hay teléfono real (no LID), normalizar y buscar `contactos` del mismo vendedor por `telefono_digits`.
3. Si hay match, setear `conversaciones.contacto_id`. La UI del chat muestra el nombre del contacto a partir de este vínculo, sin acción extra del vendedor.
4. Si no hay match, **no** crear contacto. Sigue siendo un chat.

**LID → teléfono real:** si un JID LID se resuelve después a un número, no hay fusión automática en este corte. El próximo mensaje con ese número corre los pasos 1–3. Fuera de corte: fusión de contactos duplicados.

Crear/vincular contacto:

- A mano en `/contactos`.
- Al arrastrar el chat al Kanban: upsert por `(usuario_id, telefono_digits)` con `ON CONFLICT DO UPDATE`; el lead nuevo apunta a ese contacto.
- Si el contacto ya tiene un lead abierto (`estado_id` no es terminal: Ganado/Perdido), preguntar al vendedor si quiere **mover ese lead** o **crear uno nuevo**. No decidir en silencio.

## Notificación de actividad en el Kanban

Cada tarjeta de lead muestra un indicador (globo/punto) si la conversación vinculada tiene mensajes no leídos (`conversaciones.unread_count` / `last_read_at`, ya existen). No dispara ningún cambio de `estado_id`.

## UI primer corte

- Nav: **Contactos** al lado de Chat / CRM.
- `/contactos`: búsqueda (nombre, teléfono, email) + crear + editar. Búsqueda insensible a acentos: extensión `unaccent` de Postgres, no un `LIKE` directo sobre `nombre`.
- `/contactos/[id]`: ficha mínima: datos, chats vinculados, lead(s) con etapa. Sin import CSV, sin presentaciones, sin timeline de etapas.

## Datos existentes

Sin backfill. `contacto_id` nace nulo. No hay testers reales: se puede truncar `conversaciones` y `leads` de prueba antes de lanzar. Si hay algo que conservar, `pg_dump` antes.

## Fuera de este corte

Import Sheets/CSV, import de Contactos de Google, Explorador → contactos, scoring, valor/fecha en la tarjeta, Cloud API, fusión de contactos duplicados, timeline de cambios de teléfono.

## Éxito

1. Crear “Juan Pérez” + teléfono y encontrarlo en la búsqueda (con o sin tilde).
2. Arrastrar un chat al Kanban deja el lead atado a ese contacto (o lo crea si el teléfono no existía).
3. Un mensaje de un número desconocido no inventa un contacto.
4. Un mensaje de un número ya conocido muestra el nombre del contacto en el chat sin acción manual.
5. El Kanban no se rompe: sigue siendo columnas de deals, y nada mueve una tarjeta de columna salvo el vendedor.
