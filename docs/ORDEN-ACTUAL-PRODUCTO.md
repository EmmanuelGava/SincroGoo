# KloSync — Orden de trabajo actual

> Actualizado: 21 agosto 2026.  
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

---

## Qué queremos ser (visión completa)

Un solo producto para vendedores:

**Explorador → Contactos → Chat WhatsApp → Kanban → Presentaciones desde Sheets.**

El norte de mensajería/CRM es **Kommo**: inbox de WhatsApp + embudo visual. El diferencial nuestro (que Kommo no tiene) es Sheets → Slides masivo, sync Google, explorador por zona y las 18 herramientas de conversión.

No es “cobrar $19”. Es que el loop de ventas cierre de punta a punta.

---

## Dónde estamos hoy (honesto)

**Ya anda (no rehacer):**

- Sync Tools y generación de slides (plantillas, preview, re-sync, enriquecimiento, historial).
- Explorador: buscar por zona y exportar a Sheets.
- WhatsApp Lite en Railway (QR, envío/recepción, live del inbox, media saliente imagen/audio, catch-up al reconectar).
- Chat unificado + Kanban básico (etapas, tarjetas, drag entre columnas).
- Login Google / NextAuth.

**No es MVP todavía.** Falta el loop tipo Kommo de verdad:

1. Chat nuevo aparece en la lista del CRM y se arrastra a una columna (código en prod; falta demo con celular real).
2. Arrastrar el chat a una columna crea el lead.
3. Desde el lead volvés al chat (y al revés).
4. No se pierde un envío si Railway pega un 428 (outbox en código; falta prueba worker down).
5. Una **ficha de contacto** con teléfono real, no un LID suelto (resolución LID→número en prod; tabla `contactos` con CRUD y ficha en `/contactos`).

Hasta que eso no se pueda demoar en klosync.vercel.app con un celular real, no hay producto para afuera.

---

## Orden de ahora (hacer en esta secuencia)

### Fase 0 — Cerrar el loop Chat ↔ Kanban (esta semana)

Sin esto el CRM es teatro.

- [x] Drag: lista de chats sin lead a la izquierda → soltar en una columna → se crea el lead y sale de la lista. (en `main`)
- [ ] Probar en prod: KloSync cerrado + worker up; worker down 2–5 min + contacto nuevo; reconectar sin 515 en bucle.
- [x] Etapas por defecto si el usuario no tiene columnas (Nuevo, Contactado, Calificado, Propuesta, Ganado, Perdido).
- [x] Ida y vuelta: del lead abrir el chat (`/chat?conversacion=`); del chat ver el lead y ir al Kanban (`/crm?lead=`).
- [x] Nombres reales en la lista del CRM (contact_name / teléfono; no LID). No fusionar dos LID distintos.
- [x] Resolver LID a teléfono real al abrir el chat y guardarlo en el lead (no mostrar el ID interno como número).

### Fase 1 — Mensajería que no miente

El catch-up cubre **entrantes** mientras el socket está caído. Los **salientes** todavía se pueden perder.

Hacer, en este orden (detalle en el plan de confiabilidad):

- [x] Outbox + reintento (worker caído → el mensaje queda queued y sale al volver). *Código listo; falta probar en prod: worker down 1 min, texto no se pierde.*
- [x] Ticks reales: enviado / entregado / leído / error (en `main`; falta demo 1 tilde → 2 grises → 2 celestes).
- [x] Media **entrante** persistida (no solo placeholder `[Imagen]` / `[Audio]` en el catch-up). *En `main`; falta prueba con foto/audio reales (se ven y siguen abriendo al día siguiente).*
- [x] Límites de tamaño/tipo visibles en la UI. *Código: imagen 5 MB, audio 16 MB, video rechazado. PNG de 6 MB se rechaza antes del outbox.*
- [x] Delay anti-ban entre envíos. *En `main`; en BD los envíos seguidos salen ~2.4–3.6 s, no en 200 ms. El chat no espera ni muestra los ms.*
- [x] Borrar servicios WhatsApp legacy (V2 / Old). La única clase viva es `WhatsAppLiteService`.

No hacer acá: Cloud API de Meta, multiagente, broadcast.

### Fase 2 — Contactos (base del CRM)

Sin esto el resto de Kommo se construye mal. Un chat no es un contacto.

- Migración `contactos_persona_deal` aplicada en prod (tabla `contactos`, FKs, RPC `buscar_contactos`).

- [x] Tabla `contactos` + CRUD + búsqueda (unaccent).
- [x] Ficha: conversaciones + lead del Kanban (presentaciones después).
- [x] Cruzar teléfono/WhatsApp entrante con contactos existentes (sin crear).
- [x] Al mover el lead de etapa, registrar en la ficha (timeline).
- [x] Importar Sheets, CSV y Google Contacts.

### Fase 3 — Que se sienta Kommo en el día a día

Cuando el loop y los contactos existen:

- [ ] Respuestas rápidas (`/` + templates).
- [ ] Búsqueda en historial de conversaciones.
- [ ] Valor monetario y fecha de cierre en la tarjeta del Kanban.
- [ ] Filtros del tablero: canal, valor, fecha.
- [ ] Lead scoring básico (alta / media / baja).
- [ ] Stats mínimas del inbox: nuevas, no respondidas, tiempo a primera respuesta, conversión por etapa.

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
| Kanban / embudo | Sí | Básico; loop chat→columna en prod, falta demo con celular |
| WhatsApp | Sí | Lite (Baileys), no oficial |
| Telegram | Kommo parcial | Recepción sí |
| Multiagente mismo número | Sí | No |
| Automatización / bienvenida / follow-up | Sí | No |
| Respuestas rápidas | Sí | No |
| Chatbot | Sí | No |
| Asignar chats | Sí | No |
| Programados | Casi todos | No |
| Broadcast | La mayoría | No |
| Módulo contactos | Sí | Sí (CRUD + match; sin import/timeline) |
| Reportes de funnel | Sí | No |
| Ticks entregado/leído | Sí | En prod (enviado / entregado / leído) |
| Sheet → Slides / sync Google / explorador | No | Sí (nuestro diferencial) |

### Fuera de este orden (guardar, no ejecutar)

Monetización (Lemon Squeezy, planes, límites), i18n inglés, Product Hunt, Reddit, G2, emails de onboarding, programa de referidos. Se retoman cuando el MVP de las fases 0–3 se pueda usar una semana seguida sin “se perdió el mensaje” / “no aparece en el Kanban”.

---

## Cómo decidir qué toca ahora

1. ¿El tester ve el WhatsApp en el Kanban arrastrando? Si no → Fase 0.  
2. ¿Se pierde un envío o un lead en una caída de Railway? Si sí → Fase 1.  
3. ¿El mismo humano es un LID en el chat y otra tarjeta en el Kanban? → Fase 2.  
4. Recién ahí features de Kommo (rápidas, filtros).
5. ¿El inbox ya no miente una semana? Recién ahí Instagram / ML. Después widget. Después bot.

No saltar a widget, chatbot, multiagente, Cloud API o cobro para “parecer más Kommo”. Kommo se parece en el **loop diario**, no en el catálogo de features.
