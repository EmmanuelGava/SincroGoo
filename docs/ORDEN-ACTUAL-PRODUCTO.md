# KloSync — Orden de trabajo actual

> Actualizado: 24 agosto 2026.  
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
| Recordatorio de seguimiento (alerta interna inbox) | [`superpowers/specs/2026-08-24-recordatorio-seguimiento-design.md`](./superpowers/specs/2026-08-24-recordatorio-seguimiento-design.md) |

---

## Qué queremos ser (visión completa)

Un solo producto para vendedores:

**Explorador → Contactos → Chat WhatsApp → Kanban → Presentaciones desde Sheets.**

El norte de mensajería/CRM es **Kommo**: inbox de WhatsApp + embudo visual. El diferencial nuestro (que Kommo no tiene) es Sheets → Slides masivo, sync Google, explorador por zona y las 18 herramientas de conversión.

No es “cobrar $19”. Es que el loop de ventas cierre de punta a punta.

---

## Dónde estamos hoy (honesto)

**Resumen por fase (24 ago 2026):**

| Fase | Código | Certificado en prod |
|------|--------|-------------------|
| **0** Loop Chat ↔ Kanban | ✅ en `main` | ❌ falta demo con celular |
| **1** Mensajería confiable | ✅ en `main` | ⚠️ B1–B4+B6 OK (24 ago); faltan B5 media saliente / B7 anti-ban |
| **2** Contactos (base CRM) | ✅ **cerrada** | ✅ migración + CRUD en prod |
| **3** Kommo día a día | ✅ core cerrado | ⚠️ seguimiento recién deployado; backlog catálogo opcional |
| **4+** Diferencial / canales | — | no empezado |

**El cuello de botella no es más código:** es la **sesión de prueba en prod** (checklist abajo). Hasta que Fase 0 + 1 pasen con celular real en klosync.vercel.app, no hay MVP para afuera.

**Ya anda (no rehacer):**

- Sync Tools y generación de slides (plantillas, preview, re-sync, enriquecimiento, historial).
- Explorador: buscar por zona y exportar a Sheets.
- WhatsApp Lite en Railway (QR, envío/recepción, live del inbox, media saliente imagen/audio, catch-up al reconectar, outbox, ticks).
- Chat unificado + Kanban (drag chat→columna, ida y vuelta chat↔CRM, filtros, scoring, stats).
- Inbox estilo WhatsApp Web, respuestas rápidas (`/`), catálogo + carrito multi-producto en `/catalogo`.
- Contactos: CRUD, ficha, match automático, timeline, import, etiquetas, nuevo pedido.
- Seguimiento inbox: alerta interna “esperando tu respuesta” (12 h / 24 h).
- Login Google / NextAuth.

**Lo que falta certificar (no construir):**

1. Chat nuevo en sidebar CRM → arrastrar a columna → lead creado (celular real).
2. Ida y vuelta lead ↔ chat en esa demo.
3. Outbox: worker caído 1–2 min → texto no se pierde al volver.
4. Ticks: 1 tilde → 2 grises → 2 celestes (con el otro celular).
5. Media entrante: foto/audio se ven hoy y mañana (no solo `[Imagen]`).
6. Identidad: un solo chat por contacto (LID + teléfono unificados); saludo sin número en `/hola`.

---

## Orden de ahora (hacer en esta secuencia)

### Fase 0 — Cerrar el loop Chat ↔ Kanban

Sin esto el CRM es teatro. **Código listo; falta certificar en prod** (ver checklist § abajo).

- [x] Drag: lista de chats sin lead a la izquierda → soltar en una columna → se crea el lead y sale de la lista.
- [ ] **Prod:** demo completa con celular (checklist A).
- [x] Etapas por defecto si el usuario no tiene columnas (Nuevo, Contactado, Calificado, Propuesta, Ganado, Perdido).
- [x] Ida y vuelta: del lead abrir el chat (`/chat?conversacion=`); del chat ver el lead y ir al Kanban (`/crm?lead=`).
- [x] Nombres reales en la lista del CRM (contact_name / teléfono; no LID). No fusionar dos LID distintos.
- [x] Resolver LID a teléfono real al abrir el chat y guardarlo en el lead (fix `0a9cbff`).

### Fase 1 — Mensajería que no miente

Catch-up cubre **entrantes** con socket caído. **Salientes** dependen del outbox. **Código listo; falta certificar en prod** (checklist B).

- [x] Outbox + reintento (`whatsapp_outbox`, worker claim al reconectar).
- [x] **Prod:** worker down 1–2 min → texto queued → sale al volver (checklist B2) — 24 ago 2026.
- [x] Ticks reales: enviado / entregado / leído / error.
- [x] **Prod:** ver progresión de tildes en burbuja (checklist B3) — 24 ago 2026.
- [x] Media **entrante** persistida (Storage, no solo placeholder).
- [x] **Prod:** foto/audio entrante visibles en KloSync (checklist B4) — 24 ago 2026; revalidar al día siguiente si se quiere.
- [x] Límites de tamaño/tipo visibles en la UI (imagen 5 MB, audio 16 MB, video rechazado).
- [x] Delay anti-ban entre envíos (~2.4–3.6 s entre salientes).
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

**Recordatorio de seguimiento** (alerta interna; spec [`2026-08-24-recordatorio-seguimiento-design.md`](./superpowers/specs/2026-08-24-recordatorio-seguimiento-design.md)) — independiente del catálogo; puede adelantarse como primer “wow”:

- [x] Regla server-side: último mensaje entrante + pasaron ≥ X hs + lead no Ganado/Perdido → `esperando_seguimiento`.
- [x] X configurable (default 12 h Nuevo/Contactado, 24 h resto) — constantes en código v1.
- [x] Badge/borde distinto en lista del inbox (`ChatSidebar`); contador “Seguim.” en stats.
- [x] Limpieza automática al responder; persiste al recargar (no depende del socket).
- [x] Ordenar inbox poniendo seguimiento arriba.
- [ ] **Prod:** marcar seguimiento tras umbral (12 h / 24 h) — checklist A6 (opcional si no hay tiempo de esperar: bajar umbral en dev).

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

### Fase 8 — Equipo (cuando el vendedor individual ya lo usa)

- [ ] Asignación de chat y de lead a un agente.
- [ ] WhatsApp multiagente (varios en el mismo número).
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
| A5 | Desde el chat, ir al **Kanban** (`/crm?lead=…` o botón lead) → misma persona/deal. | [ ] | Fix: resaltar card, no abrir editar |
| A6 | Responder desde KloSync; el celular recibe. `/hola` con `{{nombre}}` **no** muestra el número como nombre. | [x] | 26 ago |
| A7 | Si el contacto ya existía en `/contactos`, verificar **match** (misma ficha, timeline con cambio de etapa). | [ ] | Fix dedupe aplicado; revalidar |
| A8 | *(Opcional)* Dejar entrante sin responder 12+ h → badge **Seguimiento** en `/chat` y contador en stats CRM. | [ ] | |

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

- [ ] Marcar arriba qué falló; si A3 o B2 fallan → **no MVP**; priorizar fix antes de Fase 4.
- [ ] Actualizar checkboxes de Fase 0/1 en este doc con fecha de la prueba.
- [ ] Si todo OK → **MVP certificado**; siguiente: Fase 4 (Explorador → contactos) o backlog catálogo.

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

- [ ] Descontar stock al marcar lead **Ganado** (o al confirmar pedido).
- [ ] Alertas de bajo stock (umbral por usuario / por ítem).
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
| Kanban / embudo | Sí | Sí (filtros, scoring, stats); falta **certificar** drag en prod |
| WhatsApp | Sí | Lite (Baileys), no oficial |
| Telegram | Kommo parcial | Recepción sí |
| Multiagente mismo número | Sí | No |
| Automatización / bienvenida / follow-up | Sí | No (seguimiento = alerta interna, no auto-mensaje) |
| Respuestas rápidas | Sí | Sí (`/` en el chat) |
| Catálogo / cotizaciones | Algunos | Sí: catálogo + **carrito multi-producto** |
| Chatbot | Sí | No |
| Asignar chats | Sí | No |
| Programados | Casi todos | No |
| Seguimiento / “te debe respuesta” | Sí | Sí (badge inbox + stats; umbral 12 h / 24 h) |
| Broadcast | La mayoría | No |
| Módulo contactos | Sí | Sí (CRUD + match + import + timeline + tags) |
| Reportes de funnel | Sí | Stats mínimas (nuevas, sin resp., seguim., embudo) |
| Ticks entregado/leído | Sí | Sí (falta certificar en prod) |
| Sheet → Slides / sync Google / explorador | No | Sí (nuestro diferencial) |

### Fuera de este orden (guardar, no ejecutar)

Monetización (Lemon Squeezy, planes, límites), i18n inglés, Product Hunt, Reddit, G2, emails de onboarding, programa de referidos. Se retoman cuando el MVP de las fases 0–3 se pueda usar una semana seguida sin “se perdió el mensaje” / “no aparece en el Kanban”.

---

## Cómo decidir qué toca ahora

1. **¿Pasó el checklist de prod (A + B)?** Si no → Fase 0 + 1 (solo prueba, no features nuevas).
2. ¿Se pierde un envío con worker down? → fix outbox antes de seguir.
3. ¿Dos chats por el mismo humano (LID vs teléfono)? → ya fixeado; revalidar en A6.
4. Fase 2 y core Fase 3 **cerrados** — no volver a “carrito/tags” salvo bugs.
5. Con MVP certificado → Fase 4 (Explorador → contactos) o backlog catálogo.
6. ¿Inbox estable una semana? → Instagram / ML. Después widget. Después bot.

No saltar a widget, chatbot, multiagente, Cloud API o cobro para “parecer más Kommo”. Kommo se parece en el **loop diario certificado en prod**, no en el catálogo de features.
