# KloSync — Orden de trabajo actual

> Actualizado: 27 agosto 2026.  
> Este archivo es el **orden de ahora**. No reemplaza los docs de detalle; apunta a ellos.  
> Monetización, precios y lanzamiento comercial **no están en el camino**. Primero hay que tener un MVP que un vendedor use todos los días.

**Docs de detalle (no perder):**

| Tema | Archivo |
|---|---|
| WhatsApp cómo funciona hoy | [`MENSAJERIA-WHATSAPP-FLUJO.md`](./MENSAJERIA-WHATSAPP-FLUJO.md) |
| Confiabilidad chat (outbox, ticks, media) | [`superpowers/plans/2026-08-16-mensajeria-confiabilidad.md`](./superpowers/plans/2026-08-16-mensajeria-confiabilidad.md) |
| Listado histórico de mejoras | [`LISTADO-COMPLETO-MEJORAS-02-26.md`](./LISTADO-COMPLETO-MEJORAS-02-26.md) |
| Qué es el producto (módulos) | [`FUNCIONALIDADES-PROYECTO.md`](./FUNCIONALIDADES-PROYECTO.md) |
| Inbox, canales, widget, bot (orden) | [`superpowers/specs/2026-08-20-widget-chatbot-canales-design.md`](./superpowers/specs/2026-08-20-widget-chatbot-canales-design.md) |
| Contactos CRM | [`superpowers/specs/2026-08-21-contactos-crm-design.md`](./superpowers/specs/2026-08-21-contactos-crm-design.md) |
| UI chat, rápidas y catálogo (no estaba planificado) | [`superpowers/specs/2026-08-21-catalogo-respuestas-design.md`](./superpowers/specs/2026-08-21-catalogo-respuestas-design.md) |
| Catálogo: categoría, stock y listas | [`superpowers/specs/2026-08-22-catalogo-categoria-stock-listas-design.md`](./superpowers/specs/2026-08-22-catalogo-categoria-stock-listas-design.md) — **base; primero** |
| Carrito, nuevo pedido, tags, motivo | [`superpowers/specs/2026-08-22-carrito-pedido-tags-motivo-design.md`](./superpowers/specs/2026-08-22-carrito-pedido-tags-motivo-design.md) — **después** de categoría/stock |
| Equipo v1 (org, roles, asignación) | [`superpowers/specs/2026-08-27-equipo-v1-design.md`](./superpowers/specs/2026-08-27-equipo-v1-design.md) — **core; antes de canales** |
| Recordatorio de seguimiento (alerta interna inbox) | [`superpowers/specs/2026-08-24-recordatorio-seguimiento-design.md`](./superpowers/specs/2026-08-24-recordatorio-seguimiento-design.md) |
| Roadmap inbox + Kanban (P0–P1, N1, catálogo stock) | [`ROADMAP-MENSAJERIA-KANBAN.md`](./ROADMAP-MENSAJERIA-KANBAN.md) |
| Comparativa competencia + gap tasks | [`comparativa-competencia-klosync(2).md`](./comparativa-competencia-klosync(2).md) |

---

## Qué queremos ser (visión completa)

Un solo producto para vendedores:

**Explorador → Contactos → Chat WhatsApp → Kanban → Presentaciones desde Sheets.**

El norte de mensajería/CRM es **Kommo**: inbox de WhatsApp + embudo visual. El diferencial nuestro (que Kommo no tiene) es Sheets → Slides masivo, sync Google, explorador por zona y las 18 herramientas de conversión.

No es “cobrar $19”. Es que el loop de ventas cierre de punta a punta.

---

## Dónde estamos hoy (honesto)

**Resumen por fase (27 ago 2026):**

| Fase | Código | Certificado en prod |
|------|--------|-------------------|
| **0** Loop Chat ↔ Kanban | ✅ en `main` | ✅ A1–A8 OK (26 ago) |
| **1** Mensajería confiable | ✅ en `main` | ✅ B1–B7 OK (26 ago) |
| **2** Contactos (base CRM) | ✅ **cerrada** | ✅ migración + CRUD en prod |
| **3** Kommo día a día | ✅ core + catálogo stock | ✅ seguimiento OK en prod (A8, 26 ago) |
| **3½** Equipo v1 (org, roles, asignar) | ✅ en local (sin push) | QA manual pendiente |
| **4+** Diferencial / canales | — | no empezado |

**MVP Fase 0 + 1 certificado en prod (26 ago 2026).** Roadmap mensajería-Kanban P0+P1 en código (27 ago). **Siguiente prioritario: Fase 3½ Equipo v1** (spec 27 ago). En paralelo opcional: backlog catálogo o Fase 4 Explorador.

**Ya anda (no rehacer):**

- Sync Tools y generación de slides (plantillas, preview, re-sync, enriquecimiento, historial).
- Explorador: buscar por zona y exportar a Sheets.
- WhatsApp Lite en Railway (QR, envío/recepción, live del inbox, media saliente imagen/audio/video, catch-up al reconectar, outbox, ticks, programados).
- Chat unificado + Kanban (drag chat→columna, ida y vuelta chat↔CRM, filtros, scoring, stats, carga leads con auth correcta).
- Inbox estilo WhatsApp Web, respuestas rápidas (`/`), catálogo + carrito multi-producto en `/catalogo`.
- Contactos: CRUD, ficha, match automático, timeline, import, etiquetas, nuevo pedido.
- Seguimiento inbox: alerta interna “esperando tu respuesta” (12 h / 24 h); dismiss desde card Kanban (chip o ✓).
- Notas internas ancladas al header del chat (no van a WhatsApp).
- Catálogo: descontar stock al **Ganado**, alertas bajo stock en `/catalogo`, toast al mover deal.
- Login Google / NextAuth.
- **Equipo v1:** org, roles, asignación, `/configuracion/equipo`, invitaciones — código local; falta push + QA.

**Certificado en prod (26 ago 2026):** checklist A (incl. A8) + B completos con celular real en klosync.vercel.app.

**Opcional pendiente:** revalidar persistencia media entrante “al día siguiente” (B4).

---

## Orden de ahora (hacer en esta secuencia)

### Fase 0 — Cerrar el loop Chat ↔ Kanban

Sin esto el CRM es teatro. **Certificado en prod (26 ago 2026).**

- [x] Drag: lista de chats sin lead a la izquierda → soltar en una columna → se crea el lead y sale de la lista.
- [x] **Prod:** demo completa con celular (checklist A) — 26 ago 2026.
- [x] Etapas por defecto si el usuario no tiene columnas (Nuevo, Contactado, Calificado, Propuesta, Ganado, Perdido).
- [x] Ida y vuelta: del lead abrir el chat (`/chat?conversacion=`); del chat ver el lead y ir al Kanban (`/crm?lead=`).
- [x] Nombres reales en la lista del CRM (contact_name / teléfono; no LID). No fusionar dos LID distintos.
- [x] Resolver LID a teléfono real al abrir el chat y guardarlo en el lead (fix `0a9cbff`).

### Fase 1 — Mensajería que no miente

Catch-up cubre **entrantes** con socket caído. **Salientes** dependen del outbox. **Certificado en prod (26 ago 2026).**

- [x] Outbox + reintento (`whatsapp_outbox`, worker claim al reconectar).
- [x] **Prod:** worker down 1–2 min → texto queued → sale al volver (checklist B2) — 24 ago 2026.
- [x] Ticks reales: enviado / entregado / leído / error.
- [x] **Prod:** ver progresión de tildes en burbuja (checklist B3) — 24 ago 2026.
- [x] Media **entrante** persistida (Storage, no solo placeholder).
- [x] **Prod:** foto/audio entrante visibles en KloSync (checklist B4) — 24 ago 2026; revalidar al día siguiente si se quiere.
- [x] Límites de tamaño/tipo visibles en la UI (imagen 5 MB, audio 16 MB, video rechazado).
- [x] **Prod:** media saliente + rechazo &gt;5 MB (checklist B5) — 26 ago 2026.
- [x] **Prod:** anti-ban 2–4 s entre salientes (checklist B7) — 26 ago 2026.
- [x] Borrar servicios WhatsApp legacy. Solo vive `WhatsAppLiteService`.

No hacer acá: Cloud API de Meta, multiagente, broadcast.

### Fase 2 — Contactos (base del CRM) — **CERRADA**

Sin esto el resto de Kommo se construye mal. Un chat no es un contacto.

- [x] Migración `contactos_persona_deal` en prod (tabla `contactos`, FKs, RPC `buscar_contactos`).
- [x] Tabla `contactos` + CRUD + búsqueda (unaccent).
- [x] Ficha: conversaciones + leads del Kanban (presentaciones después).
- [x] Cruzar teléfono/WhatsApp entrante con contactos existentes (sin crear automático).
- [x] Al mover el lead de etapa, registrar en la ficha (`lead_etapa_historial`).
- [x] Importar Sheets, CSV y Google Contacts.

### Fase 3 — Que se sienta Kommo en el día a día — **CORE CERRADO**

Backlog de catálogo (stock al Ganado, variantes, etc.) queda abajo; no bloquea MVP.

UI chat, respuestas rápidas, catálogo y módulo `/catalogo` (hecho):

- [x] UI del chat al estilo WhatsApp Web (compositor `+` / emoji / rayo, grabación, burbujas, ticks).
- [x] Respuestas rápidas (`/` + plantillas, variables, editor). Spec: [`2026-08-21-catalogo-respuestas-design.md`](./superpowers/specs/2026-08-21-catalogo-respuestas-design.md).
- [x] Catálogo seleccionable en el compositor (chip, placeholders de producto/precio/incluye, adjunto).
- [x] Módulo `/catalogo` fuera del chat: import masivo CSV/Excel/Sheets y carga de a muchos archivos.

Catálogo + venta real (hecho):

- [x] `categoria` + `stock` en `chat_catalogo` (CRUD, import, UI `/catalogo`).
- [x] “Lista: {categoría}” en el picker: solo `stock > 0`, nombre + precio.
- [x] Ocultar / deshabilitar ítems sin stock en picker y carrito.
- [x] Presupuesto multi-producto (carrito 3–4 ítems + total). Carrito **arriba** del textbox.
- [x] **Nuevo pedido** en ficha contacto (lead nuevo en Nuevo, sin pisar Ganado).
- [x] Etiquetas en contacto (chips + filtro `/contactos?etiqueta=`).
- [x] Motivo obligatorio al mover a **Perdido**.

CRM inbox / tablero (hecho):

- [x] Búsqueda en historial de conversaciones.
- [x] Valor monetario y fecha de cierre en la tarjeta del Kanban.
- [x] Filtros del tablero: canal, valor, fecha.
- [x] Lead scoring básico (alta / media / baja).
- [x] Stats mínimas del inbox: nuevas, no respondidas, tiempo a primera respuesta, conversión por etapa.
- [x] Seguimiento A8 en card Kanban + filtro “Solo seguimiento”; **marcar atendido** desde chip o botón ✓ (sin abrir chat).
- [x] Timeline de etapas en drawer/modal (K5); **no** chip “último mov” en la card.
- [x] Fix carga Kanban: leads tras login + API CRM con service role (RLS).
- [x] Sin bloque “Configuración de mensajería” en `/crm` (solo en `/configuracion/mensajeria` y chat).

**Recordatorio de seguimiento** (alerta interna; spec [`2026-08-24-recordatorio-seguimiento-design.md`](./superpowers/specs/2026-08-24-recordatorio-seguimiento-design.md)) — independiente del catálogo; puede adelantarse como primer “wow”:

- [x] Regla server-side: último mensaje entrante + pasaron ≥ X hs + lead no Ganado/Perdido → `esperando_seguimiento`.
- [x] X configurable (default 12 h Nuevo/Contactado, 24 h resto) — constantes en código v1.
- [x] Badge/borde distinto en lista del inbox (`ChatSidebar`); contador “Seguim.” en stats.
- [x] Limpieza automática al responder; persiste al recargar (no depende del socket).
- [x] Ordenar inbox poniendo seguimiento arriba.
- [x] **Prod:** marcar seguimiento tras umbral (12 h / 24 h) — checklist A8 — 26 ago 2026.

### Fase 3½ — Equipo v1 (core producto, no “más adelante”)

Spec: [`2026-08-27-equipo-v1-design.md`](./superpowers/specs/2026-08-27-equipo-v1-design.md).

Para PyME con 2–5 personas, **asignar leads y ver el mismo CRM** es tan básico como el Kanban. Sin esto no compites con Kommo/Basework en la tabla comparativa.

**Equipo v1 (este corte):**

- [x] Organización / workspace: varios usuarios bajo la misma cuenta negocio.
- [x] Roles simples: `admin` (invita, conecta WA) y `agente`.
- [x] Asignar **lead** y **chat** a un miembro (dropdown en card Kanban + header chat).
- [x] Filtros Kanban: Todos | Mis leads | Sin asignar.
- [x] Notas en header del chat con **autor** visible para todo el equipo.
- [x] Un número WA por org (admin conecta QR; agentes responden desde KloSync).
- [ ] **QA prod:** invitar 2ª cuenta, asignar, filtros, agente sin QR en UI, contactos compartidos por org.

**No es Equipo v1 (queda Fase 8 — escala):**

- Varios agentes con sesiones Baileys paralelas en el mismo número.
- Chat interno tipo Slack (sin cliente).
- Broadcast / campañas.
- Cloud API Meta.

**Esfuerzo estimado:** ~4–5 d dev (ver spec).

### Fase 4 — Pegar el diferencial (Explorador + Slides al CRM)

Lo que nos distingue de Kommo. No tiene sentido si la ficha de contacto no existe.

- [ ] Explorador → guardar directo como contactos (sin pasar por Sheet).
- [ ] Explorador → Excel además de Sheets; filtros por categoría; búsquedas guardadas.
- [ ] Enriquecer (email, LinkedIn) si se puede sin frenar el MVP.
- [ ] Al terminar una generación larga de slides: avisar por WhatsApp (o al menos en el inbox). Ese es el diferenciador único vs Rollstack/Slideform.

### Fase 5 — Sumar canales al inbox (cuando WA + Kanban + contacto ya se usan)

Mismo `handleIncomingMessage`, badge de canal, mismo drag al Kanban. No widget. No bot.

- [ ] Instagram DM (Meta, cuenta profesional, ventana 24 h).
- [ ] Mercado Libre: preguntas de publicación, después mensajería post-venta.
- [ ] Email completo (SMTP/SendGrid) si hace falta un tercer canal simple.

### Fase 6 — Widget en la web del comerciante

Canal `web`: snippet + iframe, mismo inbox. Recién cuando el inbox ya atiende más de un `servicio_origen` de verdad.

- [ ] Snippet, allowlist de dominios, visitante anónimo, humano responde desde `/chat`.

### Fase 7 — Chatbot semi-automático (un motor, todos los canales)

Después del widget, no antes. Reglas primero; IA después y opt-in.

- [ ] Bienvenida, fuera de horario, menú, FAQ, handoff a humano.
- [ ] “Si no responde en X días, recordatorio” y mensajes programados.
- [ ] IA FAQ / borrador (opt-in). Nunca stock o precio inventado.

### Fase 8 — Equipo escala (multi-WA, broadcast, Cloud API)

Solo cuando Equipo v1 ya se usa en prod con 2+ usuarios reales.

- [ ] WhatsApp multiagente técnico (varios en el mismo número con inbox compartido real).
- [ ] Chat interno de equipo (hilos sin cliente — “grupo de trabajo”).
- [ ] Campañas / broadcast a una lista de contactos.
- [ ] WhatsApp Business API oficial (Meta Cloud API), cuando Lite ya no alcance.

---

## Checklist — certificar MVP en prod (30–45 min)

**Preparación (5 min)**

- [x] **P0** Abrir [klosync.vercel.app](https://klosync.vercel.app) logueado; worker Railway **Up** (`/configuracion/mensajeria` → conectado / QR no visible). — 24 ago 2026
- [x] **P1** Segundo celular (o contacto de prueba) con WhatsApp listo para escribir al número vinculado. — 24 ago 2026
- [ ] **P2** Pestaña `/crm` y `/chat` abiertas; consola del navegador por si hay 401/500.

**A — Fase 0: loop Chat ↔ Kanban (~15 min)**

| # | Acción | OK | Notas |
|---|--------|----|-------|
| A1 | Desde el **celular de prueba**, mandar un mensaje nuevo a tu WA vinculado (contacto que **no** tenga lead aún). | [x] | 26 ago |
| A2 | En `/crm`, el chat aparece en **“Chats entrantes”** (sidebar izquierdo) con nombre/teléfono legible (no LID crudo). | [x] | 26 ago |
| A3 | **Arrastrar** el chat a columna **Nuevo** (o Contactado). El chat **sale** de entrantes y aparece tarjeta en la columna. | [x] | 26 ago: drag OK + orden en posición de drop |
| A4 | Clic en tarjeta → **Editar** o ícono chat → abre `/chat?conversacion=…` con el hilo correcto. | [x] | 26 ago |
| A5 | Desde el chat, ir al **Kanban** (`/crm?lead=…` o botón lead) → misma persona/deal. | [x] | 26 ago: resalta card, sin abrir editar |
| A6 | Responder desde KloSync; el celular recibe. `/hola` con `{{nombre}}` **no** muestra el número como nombre. | [x] | 26 ago |
| A7 | Si el contacto ya existía en `/contactos`, verificar **match** (misma ficha, timeline con cambio de etapa). | [x] | 26 ago: dedupe wa_jid OK |
| A8 | *(Opcional)* Dejar entrante sin responder 12+ h → badge **Seguimiento** en `/chat` y contador en stats CRM. | [x] | 26 ago |

**B — Fase 1: mensajería confiable (~20 min)**

| # | Acción | OK | Notas |
|---|--------|----|-------|
| B1 | Con worker **Up**, enviar texto desde `/chat` → llega al celular; burbuja pasa de “enviando” a **enviado** (1 tilde). | [x] | Cubierto en flujo B2 (24 ago) |
| B2 | **Outbox:** en Railway, **Stop** el servicio 1–2 min. Enviar texto desde `/chat` (debe quedar queued / no error fatal). **Start** worker → el mensaje **sale solo** al celular en &lt;2 min. | [x] | 24 ago: `queued` → enviado; burbuja `entregado`; texto “en este momento el server esta offline” |
| B3 | **Ticks:** con el otro celular online, ver **2 grises** (entregado) y **2 celestes** (leído) al abrir el chat en el celular. | [x] | 24 ago: confirmado por usuario |
| B4 | **Media entrante:** mandar **foto** y **audio** desde celular de prueba → se ven en KloSync (no solo `[Imagen]`). Recargar `/chat` al día siguiente → siguen abriendo. | [x] | 24 ago: foto+audio OK (persistencia “mañana” pendiente si se quiere revalidar) |
| B5 | **Media saliente:** enviar imagen &lt;5 MB desde KloSync → llega al celular. Probar PNG &gt;6 MB → **rechazo** visible en UI antes de enviar. | [x] | 26 ago |
| B6 | **Reconexión:** con worker caído 2–5 min, que el otro celular escriba. Al levantar worker → mensaje aparece (catch-up). **Sin bucle 515** en logs Railway. | [x] | 24 ago: tras levantar Railway llegan msgs (`Ooooooo` entrante + hilo vivo); sesión `connected` |
| B7 | Enviar 3 mensajes seguidos → en BD/logs, intervalo ~2–4 s entre salientes (anti-ban). | [x] | 26 ago |

**C — Cierre de sesión**

- [x] Checklist A + B pasaron en prod (26 ago 2026).
- [x] Actualizar checkboxes de Fase 0/1 en este doc.
- [x] **MVP Fase 0 + 1 certificado**; siguiente: Fase 4 (Explorador → contactos) o backlog catálogo.

**Consultas útiles en prod (Supabase MCP / SQL):**

```sql
-- Outbox pendiente
select id, status, attempts, created_at from whatsapp_outbox
where status in ('queued','sending') order by created_at desc limit 10;

-- Último mensaje por conversación (dirección)
select c.id, m.fecha_mensaje, m.usuario_id, m.metadata->>'direction' as dir
from conversaciones c
join lateral (
  select * from mensajes_conversacion where conversacion_id = c.id
  order by fecha_mensaje desc limit 1
) m on true
order by m.fecha_mensaje desc limit 5;
```

---

## Backlog catálogo (Fase 3+, no bloquea MVP)

- [x] Descontar stock al marcar lead **Ganado** (presupuesto del chat → RPC `decrement_catalogo_stock`; toast en Kanban).
- [x] Alertas de bajo stock (umbral por ítem `stock_minimo`; default 5 en `/catalogo`).
- [ ] Variantes anidadas (talle / color / sabor como sub-SKU).
- [ ] Al enviar una lista, adjuntar varias fotos.
- [ ] Atajo `/vapers` que inserte la lista si la categoría coincide.
- [ ] Tabla `catalogo_categorias` + rename masivo.
- [ ] Opción de mostrar “sin stock” en el mensaje (hoy se ocultan).
- [ ] Reserva / hold de stock mientras el lead está en Propuesta.

---

## Visión completa — backlog que no se tira

Todo esto **sigue siendo el producto**. Solo no se hace ahora. Si hay duda, no borrar: bajar de fase.

### Sync Tools y Slides (casi listo)

Hecho: conversión Excel/CSV/Sheets/Slides/Word/PDF/PPTX, sync programada, trigger por Sheet, limpiar datos, fusionar sheets, personalización de plantillas, preview, re-sync, enriquecimiento, historial.

Pendiente, no MVP:

- [ ] Editor visual propio (Fabric.js).
- [ ] Historial de versiones de presentaciones.
- [ ] Rate limit / backoff 429 / dashboard de quota de Google APIs.
- [ ] IA: insights del Sheet en slides; plantilla desde un texto; sugerir plantilla según columnas.

### Integraciones

- [ ] HubSpot, Airtable, Notion, Looker Studio.
- [ ] API pública documentada.
- [ ] Google Workspace Add-on.

### Infra de producto (cuando haya usuarios reales, no para “lanzar a cobrar”)

- [ ] Validar sesión en APIs que todavía confían en el `usuario_id` del cliente.
- [ ] RLS donde corresponda (ojo: chat = NextAuth, no `auth.uid()` de Supabase).
- [ ] Corregir rutas rotas (`/precios`, `/proyectos/editar/[id]`, etc.).
- [ ] Sentry.
- [ ] Dominio propio.

### Comparativa CRM (lo que ellos tienen y nosotros no)

Para no olvidar el norte tipo Kommo / Leadsales / Callbell / Clientify:

| Feature | Ellos | KloSync |
|---|---|---|
| Kanban / embudo | Sí | Sí (filtros, scoring, stats, seguimiento en card) |
| WhatsApp | Sí | Lite (Baileys), no oficial |
| Telegram | Kommo parcial | Recepción sí |
| Multiagente mismo número | Sí | No |
| Automatización / bienvenida / follow-up | Sí | No (seguimiento = alerta interna, no auto-mensaje) |
| Respuestas rápidas | Sí | Sí (`/` en el chat) |
| Catálogo / cotizaciones | Algunos | Sí: catálogo + carrito; stock al Ganado |
| Chatbot | Sí | No |
| Asignar chats | Sí | **v1 pendiente** (BD `asignado_a` sin UI; spec 3½) |
| Roles / equipo | Sí | **v1 pendiente** (spec 3½) |
| Programados | Casi todos | Sí (outbox + composer) |
| Seguimiento / “te debe respuesta” | Sí | Sí (inbox + Kanban; dismiss en card) |
| Broadcast | La mayoría | No |
| Módulo contactos | Sí | Sí (CRUD + match + import + timeline + tags) |
| Reportes de funnel | Sí | Stats mínimas (nuevas, sin resp., seguim., embudo) |
| Ticks entregado/leído | Sí | Sí (certificado B3 prod) |
| Sheet → Slides / sync Google / explorador | No | Sí (nuestro diferencial) |

### Backlog comparativa (gaps del doc competencia — no en fases 0–3½)

Tareas derivadas de [`comparativa-competencia-klosync(2).md`](./comparativa-competencia-klosync(2).md) § Gap vs competencia. **No bloquean Equipo v1.**

**Equipo y operación (después de 3½):**

- [ ] Reportes / supervisión por agente (tiempo respuesta, conversión por asignado) — Chatty, Darwin.
- [ ] Agenda / citas ligadas a contacto o lead — Basework.
- [ ] Campos personalizados en lead/contacto (más allá de etiquetas) — Whaticket, Kommo.
- [ ] Telegram: paridad inbox (saliente + lista unificada) — hoy recepción parcial.

**E-commerce e integraciones (Chatsell / Aoki):**

- [ ] Integración Tiendanube (pedidos, stock sync).
- [ ] Integración Mercado Libre — además de inbox Fase 5.
- [ ] Shopify (sync catálogo/pedidos).
- [ ] ERP argentinos (Tango, Odoo, Dux) — evaluar por demanda.
- [ ] Link de pago / cobro en hilo — Poli, Chatsell.
- [ ] Carrito abandonado / remarketing — WhatChimp.

**IA y marketing (opt-in / nicho):**

- [ ] Resumen IA de conversación — Leadsales.
- [ ] Atribución ads / Meta Conversions API / ROAS — Chatty (solo si ICP pauta).

**Comercial (fuera de orden técnico pero gap vs Basework/BotIA):**

- [ ] Planes públicos con usuarios incluidos (ej. hasta 5 usuarios).
- [ ] Facturación en pesos (ARS) — tabla mínima Argentina.

### Fuera de este orden (guardar, no ejecutar)

Monetización (Lemon Squeezy, planes, límites), i18n inglés, Product Hunt, Reddit, G2, emails de onboarding, programa de referidos. Se retoman cuando el MVP de las fases 0–3 se pueda usar una semana seguida sin “se perdió el mensaje” / “no aparece en el Kanban”.

---

## Cómo decidir qué toca ahora

1. **MVP Fase 0 + 1** — ✅ certificado (26 ago 2026). Checklist A1–A8 + B1–B7.
2. **Fase 3½ Equipo v1** — **siguiente prioritario** (org, roles, asignación); ver spec 27 ago.
3. **Roadmap mensajería + Kanban** — P0+P1 + N1 + catálogo stock en código (27 ago). Pendiente: QA prod post-deploy.
4. Paralelo opcional: backlog catálogo o **Fase 4** (Explorador → contactos).
5. ¿Se pierde un envío con worker down? → fix outbox antes de features nuevas.
6. ¿Inbox estable + equipo en prod? → Instagram / ML. Después widget. Después bot.

No saltar a widget, chatbot, multiagente técnico, Cloud API o cobro para “parecer más Kommo”. Kommo se parece en **loop diario + equipo básico** certificado en prod.
