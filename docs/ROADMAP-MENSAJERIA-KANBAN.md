# Roadmap — Mensajería + Kanban (post-MVP)

*Agosto 2026. MVP Fase 0 + 1 certificado en prod. Este doc prioriza lo que un **dueño solo** extraña en la primera semana de uso diario.*

Referencias:
- [ORDEN-ACTUAL-PRODUCTO.md](./ORDEN-ACTUAL-PRODUCTO.md) — fases globales
- [comparativa-competencia-klosync(2).md](./comparativa-competencia-klosync(2).md) — competencia LATAM

---

## Estado de implementación (27 ago 2026)

| ID | Estado | Notas |
|----|--------|-------|
| **K6** | ✅ | Seguimiento en cards + filtro + **dismiss** (chip / ✓ atendido) |
| **K2** | ✅ | Búsqueda Kanban con debounce + siguiente hit |
| **K3** | ✅ | Etiquetas contacto en card + filtro |
| **K5** | ✅ | Timeline en modal + drawer (sin chip en card) |
| **K1** | ✅ | `ContactDealDrawer` en `/chat` |
| **K4** | ✅ | Recordatorio + badge en card |
| **M2** | ✅ | Filtros inbox + `?filtro=` |
| **M1** | ✅ | Programar envío; fix cancelar / no envío inmediato; pacing skip programados |
| **M3** | ✅ | Archivar/desarchivar + vista Archivados |
| **M4** | ✅ | Reply-to con quote en Baileys |
| **M5** | ✅ | Video MP4 saliente ≤16 MB |
| **N1** | ✅ | Notas internas en **header** del chat (post-it; no en hilo WA) |
| **Cat** | ✅ | Stock al Ganado + alertas bajo stock + toast Kanban |

**Leyenda checkboxes abajo:** `[x]` = hecho en código · `[ ]` = opcional diferido o no hecho a propósito.

**Tests:** lib OK · `tsc --noEmit` OK · **P0+P1 + N1 + catálogo stock en `main`** (commits 27 ago). Pendiente: QA prod tras cada deploy.

---

## Lo fuerte hoy (no rehacer)

- Inbox WA: búsqueda, unread, seguimiento, live, notificaciones, respuestas `/`, catálogo + carrito
- Mensajería confiable: outbox, ticks, anti-ban 2–4 s, media in/out (video saliente MP4)
- Kanban: drag entrantes → columna, orden manual, filtros canal/valor/fecha/etiquetas/seguimiento, score, stats, multi-deal, carga leads fiable
- Puente chat ↔ CRM ↔ contactos (certificado A1–A8, B1–B7)

---

## Criterio de prioridad

> ¿Un vendedor solo con ~30 chats/día lo extraña en la **primera semana**, o solo lo conoce porque vio Kommo?

| Tier | Significado |
|------|-------------|
| **P0** | Primera semana — cierra sensación de “incompleto” |
| **P1** | Segunda semana — paridad operativa con Leadsales/Kommo básico |
| **P2** | Después — nice-to-have o requiere equipo/bot |
| **No ahora** | Multiagente, bot, broadcast, Instagram, widget, Cloud API |

---

## Orden sugerido de implementación

### Track A — uso diario con volumen (default)

```
K6 → K2 → K3 → K5 → K1 → K4 → M2 → M1
```

| Orden | ID | Por qué este orden |
|-------|-----|-------------------|
| 1 | **K6** | A8 ya certificado pero invisible en Kanban; ~0.25 d, mismo archivo que K2 |
| 2 | **K2** | Bajo esfuerzo (~0.5 d); desbloquea tablero con 50+ leads |
| 3 | **K3** | Reusa `contactos.etiquetas`; mejora filtros sin schema nuevo |
| 4 | **K5** | API ya existe; solo UI en panel/drawer |
| 5 | **K1** | Mayor impacto UX; depende de tener datos contacto/deals accesibles |
| 6 | **K4** | Complementa seguimiento (A8) con acción explícita |
| 7 | **M2** | Inbox más manejable sin tocar worker |
| 8 | **M1** | Requiere cambios en outbox + worker |

**Batch recomendado día 1:** K6 + K2 juntos en `KanbanLeads.tsx` (~0.75 d).

### Track B — demo / validación con pocos leads

Si el tablero tiene <15 deals, el dolor de scrollear (K2) no se siente. Priorizar **wow inmediato** en demo con dueño real:

```
K6 → K4 → M4 → K1 → K3 → K5 → M2 → M1
```

| Prioridad demo | ID | Por qué |
|----------------|-----|---------|
| 1 | **K6** | Muestra el diferencial A8 donde el dueño mira el día (Kanban) |
| 2 | **K4** | “Recordame mañana 9:00” — acción concreta, visible en card |
| 3 | **M4** | Citar mensaje — paridad WA básica, demo en vivo en chat |

Volver al Track A cuando haya volumen real o el dueño de prueba pida “no encuentro a X en el tablero”.

---

## Decisiones conscientes (no por default)

### Notas internas en el chat — **implementado (27 ago)**

**Qué es (y qué NO es):**

| Concepto | Qué guarda | Ejemplo |
|----------|------------|---------|
| **K1** panel contacto | Datos estructurados + deals | teléfono, etiquetas, etapa |
| **K4** recordatorio | Acción con fecha | “Llamar mañana 9:00” |
| `contactos.notas` | Nota única del contacto | Campo libre en ficha |
| **Notas internas (N1)** | Memoria libre **por hilo/deal**, sin fecha | “Cliente de fiar, ya le mandé catálogo 2 veces” |

Son cuatro cosas distintas. N1 no estaba cubierto por K1 ni K4; **ahora sí** vía notas en header del chat.

**Implementación (27 ago 2026):** `ChatHeaderNotes` + toggle “Nota interna” en composer; API `nota-interna`. Roadmap P0+P1 cerrado en código; post-27 ago: fix Kanban leads, stock al Ganado, dismiss seguimiento en card.

**Decisión de diseño:** notas en **header** (post-it), no burbuja en hilo WA — menos ruido visual y sin mezclar con mensajes del cliente.

> No agrupar N1 con multiagente/bot en “Fase 5–8”. Es producto solo-vendedor.

### A8 vs K4 — conviven (tabla de referencia)

| | **A8 Seguimiento** | **K4 Recordatorio** |
|--|-------------------|---------------------|
| Origen | Automático | Manual |
| Trigger | Cliente escribió, vos no respondiste ≥12–24 h | Vos elegís fecha/hora |
| UI inbox | Borde naranja + chip | — |
| UI Kanban | **K6** ✅ borde + chip + dismiss | Badge vence hoy / vencida ✅ |
| Certificado | ✅ inbox prod (A8) | ✅ dismiss en card (27 ago) |

---

# P0 — Kanban + chat operativos

---

## K6 — Seguimiento (A8) visible en card Kanban

**Esfuerzo:** ~0.25 día · **Dependencias:** ninguna · **Batch con K2**

### Problema
A8 está certificado en inbox (borde naranja, chip, orden prioritario) pero **invisible en el tablero**. Si el dueño solo vive en Kanban (“cómo va mi día”), un cliente que escribió hace 20 h sin respuesta no aparece ahí aunque grite en `/chat`.

K4 (recordatorio manual) no reemplaza esto: A8 es automático y es el diferencial vs competencia.

### Objetivo
> Como vendedor, quiero ver en la card del Kanban la misma señal de seguimiento que ya veo en el inbox, sin abrir el chat.

### Criterios de aceptación
- [x] Card con `esperando_seguimiento: true` → borde/icono naranja (mismo criterio visual que `ChatSidebar`).
- [x] Tooltip: “Esperando tu respuesta hace X h” (`humanizeSeguimientoHoras`).
- [x] Chip compacto “Seguimiento” en card (clic → marcar atendido).
- [x] Botón ✓ visible en card con seguimiento activo (`dismiss-seguimiento`).
- [x] Filtro Kanban “Solo seguimiento” (extiende `LeadKanbanFiltros` — complementa K3/M2).
- [x] Lógica **reuse** de `computeSeguimientoMeta` (`seguimientoInbox.ts`) — misma regla 12 h/24 h, no duplicar.
- [x] Lead en etapa terminal (Ganado/Perdido) → nunca seguimiento.

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| K6.1 | En `GET /api/supabase/leads`, traer direction + etapa; calcular seguimiento | ✅ | `supabase/leads/route.ts`, `seguimientoInbox.ts` |
| K6.2 | Extender tipo `Lead` con campos seguimiento | ✅ | `tipos/lead.ts` |
| K6.3 | UI borde + chip + tooltip en card | ✅ | `KanbanLeads.tsx` |
| K6.4 | Filtro `soloSeguimiento` en `leadKanbanFilters.ts` | ✅ | `leadKanbanFilters.ts` |
| K6.5 | Test: mismo input → mismo resultado que inbox | ✅ | `seguimientoInbox.test.ts` + filters |
| K6.6 | Dismiss seguimiento desde card (chip + ✓) | ✅ | `KanbanLeads.tsx` + `dismiss-seguimiento` |

### Notas técnicas
- Hoy `attachLeadConversationMeta` solo une unread + preview; no calcula seguimiento.
- Inbox ya lo hace en `api/chat/conversaciones/route.ts` — **misma función**, mismos inputs.
- Si perf costoso: calcular solo para leads con `conversacion_id` vinculada.

### Cómo probar
1. Cliente escribe, no respondés ≥12 h, lead en “Nuevo” → card naranja en Kanban **e** inbox.
2. Respondés → desaparece en ambos sin refresh manual (poll existente).
3. Lead “Ganado” con mensaje viejo entrante → sin señal.

---

## K2 — Buscar leads en Kanban

**Esfuerzo:** ~0.5 día · **Dependencias:** ninguna

### Problema
El chat tiene búsqueda con debounce (`ChatSidebar` + `buscarConversaciones.ts`). El Kanban solo filtra por canal, valor y fecha de cierre. Con 30+ leads, encontrar “Emma” o “+54911…” implica scrollear columnas.

### Objetivo (user story)
> Como vendedor, quiero escribir nombre o teléfono en el tablero y ver solo las cards que matchean, resaltadas y con scroll automático a la primera coincidencia.

### Criterios de aceptación
- [x] Input de búsqueda visible en la barra de filtros del Kanban (junto a canal/valor/fecha).
- [x] Debounce ~300 ms (mismo patrón que chat).
- [x] Match por: `nombre`, `empresa`, `telefono`, `email` (case-insensitive; teléfono por dígitos si query ≥ 3 dígitos).
- [x] Cards que no matchean se ocultan (o se atenúan — elegir una y ser consistente).
- [x] Contador “X de Y leads” cuando hay query activa.
- [ ] Enter o botón “Ir al siguiente” opcional si hay múltiples hits en distintas columnas. *(opcional — **hecho** navegación siguiente hit)*
- [x] Limpiar búsqueda restaura vista completa sin recargar.

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| K2.1 | Extender `LeadKanbanFiltros` con `query?: string` | ✅ | `leadKanbanFilters.ts` |
| K2.2 | Función `leadMatchesSearch(lead, query)` | ✅ | mismo + `buscarConversaciones` |
| K2.3 | Integrar en `filtrarLeadsKanban` | ✅ | `leadKanbanFilters.ts` |
| K2.4 | `TextField` búsqueda en barra de filtros | ✅ | `KanbanLeads.tsx` |
| K2.5 | Resaltar card activa si deep link `?lead=` | ✅ | `KanbanLeads.tsx` |
| K2.6 | Tests unitarios match nombre/teléfono | ✅ | `leadKanbanFilters.test.ts` |

### Fuera de scope (K2)
- Búsqueda server-side (todos los leads ya están en memoria vía context).
- Buscar por contenido de mensajes.

### Cómo probar
1. Kanban con ≥10 leads en distintas columnas.
2. Buscar “Emma” → solo cards Emma visibles.
3. Buscar “54911” → match parcial de teléfono.
4. Combinar búsqueda + filtro canal → intersección correcta.
5. Borrar query → tablero completo.

---

## K3 — Tags en card + filtro

**Esfuerzo:** ~1 día · **Dependencias:** ninguna (ideal después de K2)

### Problema
Las etiquetas viven en `contactos.etiquetas[]`. El lead tiene `tags[]` en DB/types pero **sin UI en CRM**. No podés segmentar el tablero por “mayorista”, “urgente”, etc.

### Objetivo
> Como vendedor, quiero ver las etiquetas del contacto en cada card del Kanban y filtrar el tablero por una o más etiquetas.

### Criterios de aceptación
- [x] Cada card muestra hasta 2 chips de etiqueta (+ “+N” si hay más).
- [x] Filtro multi-select de etiquetas en barra Kanban (solo etiquetas que existen en contactos de leads visibles).
- [x] Lead sin contacto → sin chips; no rompe filtro.
- [x] Editar etiquetas sigue siendo en `/contactos/[id]` (no duplicar CRUD en Kanban en v1).
- [x] Opcional v1: sincronizar `leads.tags` ← `contactos.etiquetas` en lectura (mostrar contacto, no lead.tags).

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| K3.1 | Batch `contactos(etiquetas)` por `contacto_id` | ✅ | `supabase/leads/route.ts` |
| K3.2 | Tipo `Lead.contacto_etiquetas` | ✅ | `tipos/lead.ts` |
| K3.3 | Filtro `etiquetas` + match | ✅ | `leadKanbanFilters.ts` |
| K3.4 | Chips en card Kanban | ✅ | `KanbanLeads.tsx` |
| K3.5 | Multi-select etiquetas | ✅ | `KanbanLeads.tsx` |
| K3.6 | Helper `collectEtiquetasUnicas` | ✅ | `leadKanbanFilters.ts` |

### Decisiones de diseño
- **Fuente de verdad v1:** `contactos.etiquetas` (ya tiene UI y normalización en `contactoWrite.ts`).
- **No** crear editor de tags en formulario lead en v1 — evita desincronización.

### Cómo probar
1. Contacto con etiquetas `vip`, `mayorista` → chips en card.
2. Filtro “vip” → solo leads de contactos vip.
3. Lead sin `contacto_id` → card sin chips, visible sin filtro de etiqueta.

---

## K5 — Timeline de etapas en panel lead

**Esfuerzo:** ~0.5–1 día · **Dependencias:** K1 (panel) o modal existente

### Problema
Al mover un lead se escribe en `lead_etapa_historial` (`leadEtapaHistorial.ts`, `supabase/leads/route.ts`). La ficha contacto ya lo muestra (`contactos/[id]/page.tsx` + `formatEtapaHistorialLine`). En chat solo hay `LeadProfileModal` con interacciones (top 5), **sin historial de etapas**.

### Objetivo
> Como vendedor, quiero ver “Nuevo → Contactado → Propuesta (motivo: precio)” en el contexto del deal, sin ir a `/contactos/[id]`.

### Criterios de aceptación
- [x] Lista cronológica (más reciente arriba) de cambios de etapa del lead activo.
- [x] Muestra: fecha, etapa anterior → nueva, motivo si estado Perdido.
- [x] Vacío: “Sin movimientos de etapa”.
- [x] Carga lazy al abrir panel/modal (no en listado Kanban).
- [x] **No** mostrar “último mov” en la card del Kanban (solo en timeline K5/K1).

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| K5.1 | Endpoint `GET /api/leads/[id]/etapa-historial` | ✅ | `api/leads/[id]/etapa-historial` |
| K5.2 | Componente `LeadEtapaTimeline.tsx` | ✅ | `crm/componentes/` |
| K5.3 | Montar en `LeadProfileModal` | ✅ | `LeadProfileModal.tsx` |
| K5.4 | Montar en drawer K1 | ✅ | `ContactDealDrawer.tsx` |
| K5.5 | ~~“Último mov” en card~~ — **removido** (solo timeline K5/K1) | ✅ decisión UX | — |

### Datos existentes
```sql
lead_etapa_historial: lead_id, contacto_id, fecha,
  estado_anterior_nombre, estado_nuevo_nombre, motivo
```

### Cómo probar
1. Mover lead entre 3 columnas → timeline muestra 3 entradas.
2. Mover a Perdido con motivo → línea incluye motivo.
3. Lead nuevo sin movimientos → mensaje vacío.

---

## K1 — Panel contacto/deals en `/chat`

**Esfuerzo:** ~2–3 días · **Dependencias:** K5 recomendado (timeline dentro del panel)

### Problema
Para ver persona + todos los deals + historial hay que abrir modal limitado o navegar a `/contactos/[id]`. Kommo/Leadsales muestran un **drawer derecho** fijo mientras chateás.

### Objetivo
> Como vendedor, quiero un panel lateral en el chat con datos del contacto, sus deals abiertos/cerrados y accesos rápidos (Kanban, nuevo pedido, editar contacto).

### Criterios de aceptación
- [x] Botón toggle en header (icono persona/panel) abre drawer ~360px a la derecha del chat.
- [x] Si hay `contacto_id`: nombre, teléfono, email, empresa, etiquetas (chips), notas (solo lectura o link editar).
- [x] Lista de deals del contacto: nombre, etapa (color), valor, link “Ver en Kanban” (`/crm?lead=`).
- [x] Si hay `lead_id` en conversación: deal activo resaltado.
- [x] Timeline etapas del deal activo (K5).
- [x] Sin contacto: CTA “Vincular contacto” o datos mínimos de conversación.
- [x] Layout: sidebar chat 350px + ventana mensajes flexible + drawer; no romper `100vw` en desktop.
- [x] Cerrar drawer no cierra conversación.

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| K1.1 | Componente `ContactDealDrawer.tsx` | ✅ | `chat/components/` |
| K1.2 | Fetch `GET /api/contactos/[id]` | ✅ | drawer |
| K1.3 | Fallback lead sin contacto | ✅ | route lead existente |
| K1.4 | Toggle header / ChatWindow | ✅ | `ConversationHeader`, `ChatWindow` |
| K1.5 | Layout 3 columnas | ✅ | `chat/page.tsx` |
| K1.6 | Acciones nuevo pedido / abrir ficha | ✅ | drawer |
| K1.7 | Integrar `LeadEtapaTimeline` | ✅ | drawer |
| K1.8 | Skeleton + error states | ✅ | drawer |

### Reutilizar (no copiar)
- UI etiquetas de `contactos/[id]/page.tsx`
- Lista deals + etapa de misma ficha
- `formatEtapaHistorialLine` de `leadEtapaHistorial.ts`

### Fuera de scope (K1 v1)
- Edición inline de todos los campos lead.
- Notas internas en el hilo.

### Cómo probar
1. Chat con contacto vinculado + 2 deals → panel lista ambos.
2. Click “Ver en Kanban” → `/crm?lead=` resalta card (fix A5).
3. Conversación sin contacto pero con lead → panel muestra deal.
4. Toggle abrir/cerrar sin perder mensajes ni scroll.

---

## K4 — Tarea “recordame” en deal

**Esfuerzo:** ~1.5 días · **Dependencias:** tabla `tasks` ya existe

### Problema
**Seguimiento (A8)** = alerta pasiva en inbox (borde naranja). Las tareas viven solo en `/dashboard` (`TasksPanel`, `TasksService`, tabla `tasks`). No hay “recordame mañana 9:00” desde el deal o el chat.

### Objetivo
> Como vendedor, quiero crear una tarea con fecha/hora ligada al lead desde Kanban o chat, y ver un badge cuando vence hoy o está vencida.

### Criterios de aceptación
- [x] Botón “Recordarme” en card Kanban y/o drawer K1 / header chat.
- [x] Modal: título (default “Seguimiento {nombre}”), fecha, hora, prioridad (normal/alta).
- [x] Persiste en `tasks`: `lead_id`, `conversation_id` (si hay), `task_type: 'follow_up'`, `due_date`, `status: 'pending'`.
- [x] Badge en card: 🔴 vencida, 🟡 vence hoy, ninguno si futura.
- [x] Completar tarea desde card o dashboard (reuse `TasksService.completeTask`).
- [x] No duplicar panel completo del dashboard — solo crear + badge + link “Ver tareas”.

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| K4.1 | `POST /api/leads/[id]/tasks` | ✅ | route |
| K4.2 | `proxima_tarea` en GET leads | ✅ | `supabase/leads/route.ts` |
| K4.3 | Modal `RecordatorioLeadModal.tsx` | ✅ | `crm/componentes/` |
| K4.4 | Botón + badge en card | ✅ | `KanbanLeads.tsx` |
| K4.5 | Botón en drawer / header chat | ✅ | chat components |
| K4.6 | Al completar: quitar seguimiento A8 | ✅ | dismiss-seguimiento + metadata |

### Modelo existente (`tasks`)
- `usuario_id`, `lead_id`, `conversation_id`, `task_type`, `title`, `due_date`, `priority`, `status`

### Relación con A8 (seguimiento)
Ver tabla **A8 vs K4** en [Decisiones conscientes](#decisiones-conscientes-no-por-default). K6 lleva A8 al Kanban; K4 agrega recordatorio manual encima.

### Cómo probar
1. Crear recordatorio mañana → badge none hoy.
2. Crear con fecha ayer → badge vencida.
3. Completar → badge desaparece.
4. Tarea visible en dashboard TasksPanel.

---

# P1 — Mensajería

---

## M2 — Filtros en inbox

**Esfuerzo:** ~1 día · **Dependencias:** ninguna

### Problema
`ChatSidebar` lista todo mezclado. Hay datos (`unread_count`, `esperando_seguimiento`, `servicio_origen`) pero sin filtros UI.

### Objetivo
> Como vendedor, quiero ver solo no leídas, solo seguimiento, o solo WhatsApp, sin perder la búsqueda por texto.

### Criterios de aceptación
- [x] Chips o tabs: **Todos** | **No leídas** | **Seguimiento** | canal (WA / Telegram / Email).
- [x] Filtros combinables con búsqueda `q`.
- [x] Contador por filtro activo (“12 no leídas”).
- [x] Orden existente se mantiene (seguimiento primero cuando filtro “Todos”).
- [x] Estado filtro en URL opcional (`?filtro=unread`) para compartir/bookmark.

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| M2.1 | `InboxFiltro` + `filtrarConversaciones` | ✅ | `inboxFilters.ts` |
| M2.2 | UI chips bajo barra búsqueda | ✅ | `ChatSidebar.tsx` |
| M2.3 | Filtro client-side | ✅ | `ChatSidebar.tsx` |
| M2.4 | Param API `?unread=1` (paginación futura) | ✅ | `conversaciones/route.ts` |
| M2.5 | Tests unitarios filtros | ✅ | `inboxFilters.test.ts` |

### Cómo probar
1. Mezclar chats leídos/no leídos → “No leídas” correcto.
2. Chat con seguimiento → aparece en filtro Seguimiento.
3. Búsqueda + filtro canal WA → intersección.

---

## M1 — Mensaje programado

**Esfuerzo:** ~2 días · **Dependencias:** outbox + worker Railway

### Problema
Todo envío es inmediato. `whatsapp_outbox.next_attempt_at` hoy solo stagger anti-ban, no scheduling usuario.

### Objetivo
> Como vendedor, quiero escribir un mensaje y elegir “enviar mañana 9:00”, viéndolo en cola hasta que se envíe.

### Criterios de aceptación
- [x] En composer: toggle “Programar” → date + time picker (hora local; default = ahora al activar).
- [x] No enviar optimista hasta `send_at`; outbox `queued` + `metadata.scheduled_by_user` + `next_attempt_at = send_at`.
- [x] Lista “Programados” en composer (cancelar con ✕).
- [x] Worker `claim_whatsapp_outbox` solo toma filas con `next_attempt_at <= now()`.
- [x] Al disparar: flujo normal (pacing, ticks, anti-ban) + persist inbox.
- [x] Media programada: mismo soporte que envío inmediato.

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| M1.1 | `metadata.scheduled_by_user` (sin enum nuevo) | ✅ | outbox |
| M1.2 | `enqueueWhatsAppOutbox({ sendAt })` | ✅ | `outbox.ts` |
| M1.3 | UI picker en `MessageInput.tsx` | ✅ | composer |
| M1.4 | `POST /api/chat/send` + `scheduled_for` | ✅ | `send/route.ts` |
| M1.5 | Lista programados + cancel | ✅ | `MessageInput` + `/api/chat/scheduled` |
| M1.6 | Worker no claim antes de hora | ✅ | RPC existente |
| M1.7 | Toast/banner al programar; poll lista | ✅ | banner + toast al disparar programado |

### Riesgos
- Reloj servidor vs timezone usuario — guardar UTC, mostrar local.
- Cancelar a último momento si ya `sending`.

### Cómo probar
1. Programar 2 min en futuro → no llega antes; llega después.
2. Cancelar antes → no se envía.
3. Verificar pacing post-disparo (B7 sigue OK).

---

## M3 — Archivar chat

**Esfuerzo:** ~1 día · **Dependencias:** migración DB

### Problema
Solo **eliminar** (`DELETE` conversación + mensajes). No hay forma de sacar ruido del inbox sin perder historial.

### Objetivo
> Como vendedor, quiero archivar un chat muerto; desaparece del inbox principal pero puedo recuperarlo.

### Criterios de aceptación
- [x] Columna `archived_at timestamptz null` en `conversaciones`.
- [x] Acción “Archivar” en menú header (reemplaza o complementa eliminar).
- [x] Inbox default: `archived_at IS NULL`.
- [x] Filtro/vista “Archivados” en sidebar.
- [x] Desarchivar restaura a inbox.
- [x] Lead/Kanban no se borra al archivar.

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| M3.1 | Migración Supabase `archived_at` | ✅ | migration + MCP |
| M3.2 | `PATCH` `{ archived }` | ✅ | `conversaciones/[id]` |
| M3.3 | Filtrar GET conversaciones | ✅ | `conversaciones/route.ts` |
| M3.4 | UI archivar / desarchivar | ✅ | header + sidebar |
| M3.5 | Confirmación distinta de eliminar | ✅ | dialog |

---

## M4 — Responder citando mensaje

**Esfuerzo:** ~1.5 días · **Dependencias:** Baileys quote en worker

### Problema
No hay reply-to. `WhatsAppLiteService` ya acepta `MessageOptions.quoted`.

### Objetivo
> Como vendedor, quiero responder citando un mensaje del cliente para dar contexto.

### Criterios de aceptación
- [x] Hover/long-press en burbuja entrante → “Responder”.
- [x] Composer muestra preview citado (texto truncado).
- [x] Envío incluye referencia WA (`stanzaId` / `quoted` en metadata).
- [x] Burbuja saliente muestra bloque citado.
- [x] Cancelar cita con ✕ en composer.

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| M4.1 | `wa_message_id` en entrantes / GET mensajes | ✅ | ingest + mensajes API |
| M4.2 | Estado `replyTo` composer | ✅ | chat components |
| M4.3 | `quoted` → outbox metadata | ✅ | send + outbox |
| M4.4 | Worker → Baileys quoted | ✅ | worker + LiteService |
| M4.5 | Render quote en burbuja | ✅ | `MessageBubble.tsx` |

---

## M5 — Video corto saliente

**Esfuerzo:** ~1 día · **Dependencias:** worker send media

### Problema
`validateOutgoingMedia` rechaza video explícitamente. Entrante muestra placeholder.

### Objetivo
> Como vendedor, quiero enviar un video MP4 corto (≤16 MB) como en WhatsApp normal.

### Criterios de aceptación
- [x] Aceptar `video/mp4` ≤ 16 MB en `FileUpload` / `mediaLimits.ts`.
- [x] Upload a storage + outbox tipo video.
- [x] Worker envía vía Baileys `video` message.
- [x] Preview en composer antes de enviar (video MP4).
- [x] Rechazar otros codecs con mensaje claro.

### Subtasks

| # | Tarea | Estado | Archivo(s) |
|---|-------|--------|------------|
| M5.1 | Quitar block video en `mediaLimits` | ✅ | `mediaLimits.ts` |
| M5.2 | Upload path video/mp4 | ✅ | `FileUpload` + send |
| M5.3 | Worker branch video | ✅ | `worker/whatsapp.ts` |
| M5.4 | Player/placeholder en burbuja | ✅ | `MessageBubble` / `FileAttachment` |

---

# Parcial — conectar, no reinventar *(fuera del P0/P1 core; aún abiertos)*

| ID | Feature | Estado | Acción mínima | Esfuerzo |
|----|---------|--------|---------------|----------|
| **P1** | Typing indicator | ✅ | `TypingIndicator` en `ChatWindow` |
| **P2** | MessagingQuickSetup | ✅ removido de Kanban | Solo `/configuracion/mensajeria` + chat |
| **P3** | Crear lead desde chat | ✅ | Botón “Pasar al Kanban” en header |
| **P4** | Tags lead ↔ contacto | ✅ lectura (K3) | Sync write opcional |
| **P5** | Stats CRM multi-tenant | ✅ | `usuario_id` en chats sin lead |

---

# P2 — Semana 2+ (subir si uso real lo pide)

## N1 — Notas internas (header del chat)

**Estado:** ✅ implementado (27 ago 2026).

**Qué hay:** toggle “Nota interna” en composer; notas en **header** del chat (`ChatHeaderNotes`), no en el hilo WhatsApp. API `GET/POST/DELETE` en `nota-interna/route.ts`.

**Esfuerzo:** ~1–1.5 d (cerrado).

---

## Cat — Stock al Ganado + alertas (27 ago 2026)

**Estado:** ✅ en `main` (ver backlog catálogo en ORDEN-ACTUAL-PRODUCTO).

- [x] Descontar stock al mover lead a **Ganado** (último presupuesto del chat; RPC `decrement_catalogo_stock`).
- [x] Metadata `presupuesto_catalogo_ids` al enviar carrito.
- [x] Toast en Kanban al descontar (éxito / parcial / sin presupuesto).
- [x] Alertas bajo stock en `/catalogo` (`stock_minimo` por ítem; default 5).

---

## N1 (histórico) — posponer referencia

Decisión original de posponer notas en hilo — ver [Decisiones conscientes](#decisiones-conscientes-no-por-default). **Implementado 27 ago** en header; sección activa arriba.

---

# No ahora (infra / equipo / escala)

- Multiagente, asignación, inbox compartido
- Bot, bienvenida automática, IA autónoma
- Broadcast / listas de difusión
- Plantillas HSM Meta Business
- Instagram, ML, widget web
- Campos personalizados ilimitados, múltiples pipelines
- Mobile / PWA (layout responsive chat+crm)
- SLA timers en card

Ver [comparativa](./comparativa-competencia-klosync(2).md): Basework/Chatsell compiten en equipo+IA; tu espacio despejado es **micro/dueño solo**.

---

# Checklist de paridad operativa (P0 + P1)

### Implementado en código — falta QA / certificar en prod

- [x] **K6** Seguimiento A8 visible en card Kanban + dismiss atendido
- [x] **K1** Desde chat veo persona + deals + timeline sin salir del hilo
- [x] **K2** Encuentro un lead por nombre en Kanban en <3 s (+ siguiente hit)
- [x] **K3** Filtro tablero por etiqueta
- [x] **K4** Programo follow-up para mañana 9:00 con badge en card
- [x] **K5** Veo historial de etapas del deal en panel (no en card)
- [x] **M2** Filtro inbox: no leídas / seguimiento / canal
- [x] **M1** Programo un mensaje WA para hora futura
- [x] **M3** Archivo chat muerto sin borrar historial
- [x] **M4** Respondo citando un mensaje del cliente
- [x] **M5** Envío video corto saliente

### Post-roadmap (27 ago 2026)

- [x] **N1** Notas internas en header del chat (no hilo WA)
- [x] **Kanban** Fix carga leads (auth + `crmApiClient` service role)
- [x] **Kanban** Sin bloque MessagingQuickSetup en `/crm`
- [x] **Cat** Stock al Ganado + alertas + toast
- [x] **Opcionales:** K2 siguiente hit, K4.6 dismiss A8 al completar tarea, M1 media programada, M1 toast, M2.4 API unread, M5 preview
- [x] **Parciales:** typing, crear lead desde chat, stats multi-tenant
- [x] **K5.5** Chip “último mov” **removido** de card (decisión UX 27 ago)

---

# Resumen de esfuerzo

| ID | Días approx | Acumulado |
|----|-------------|-----------|
| K6 | 0.25 | 0.25 |
| K2 | 0.5 | 0.75 |
| K3 | 1 | 1.75 |
| K5 | 0.75 | 2.5 |
| K1 | 2.5 | 5 |
| K4 | 1.5 | 6.5 |
| M2 | 1 | 7.5 |
| M1 | 2 | 9.5 |
| M3 | 1 | 10.5 |
| M4 | 1.5 | 12 |
| M5 | 1 | 13 |
| N1 | 1.25 | 14.25 *(hecho 27 ago)* |
| Cat | 0.5 | 14.75 *(stock Ganado + alertas)* |

**P0+P1 core (K6–K4 + M2 + M1):** ~7.5 días dev *(cerrado)*  
**P1 completo + M3–M5 + N1 + Cat:** ~14.75 días dev *(cerrado en código 27 ago)*
