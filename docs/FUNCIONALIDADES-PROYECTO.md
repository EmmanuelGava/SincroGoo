# KloSync — Funcionalidades del producto

> Estado real del producto, verificado contra el código.
> Última actualización: 12 octubre 2026.
> El orden de trabajo vive en [`ORDEN-ACTUAL-PRODUCTO.md`](./ORDEN-ACTUAL-PRODUCTO.md); la competencia en [`comparativa-competencia-klosync(2).md`](./comparativa-competencia-klosync(2).md).

Leyenda: ✅ en código y usable · 🧪 en código, falta QA en prod · 🟡 parcial · ❌ no existe.

---

## Qué es KloSync

CRM de ventas para PyMEs argentinas (2–5 personas) que venden por WhatsApp: **inbox unificado + contactos + Kanban de deals + catálogo y cotizaciones**, con un equipo compartiendo el mismo CRM. El norte de UX es Kommo.

El diferencial frente a los CRM de WhatsApp es la suite Google (Sheets → Slides masivo, sync programada, explorador de negocios por zona). Hoy es secundaria: el foco es el CRM.

Loop objetivo: **Explorador → Contactos → Chat → Kanban → Presentación / cotización → Ganado.**

---

## 1. Inbox unificado (`/chat`)

### Canales

| Canal | Recibir | Responder | Estado | Notas |
|---|---|---|---|---|
| WhatsApp Lite (Baileys, worker en Railway) | ✅ | ✅ | ✅ certificado en prod (26 ago) | QR por organización (solo admin). Texto, imagen, audio, archivos; video rechazado. |
| Instagram DM | ✅ | ✅ | 🧪 | OAuth de cuenta profesional, firma de webhook, ventana de 24 h con aviso. Falta cargar credenciales de Meta y probar. |
| Mercado Libre (preguntas) | ✅ | ✅ | 🧪 | Una conversación por comprador + publicación; responde la pregunta pendiente más vieja. Falta app de ML y probar. |
| Mercado Libre (post-venta) | ❌ | ❌ | ❌ | Segundo corte de Fase 5. |
| Telegram | 🟡 | ❌ | 🟡 | Entra por webhook del bot; `sendViaTelegram` devuelve "no implementado". |
| Email | 🟡 | ❌ | 🟡 | Hay handler entrante; `sendViaEmail` devuelve "no implementado". |
| Facebook Messenger | ❌ | ❌ | ❌ | Lo tienen Whaticket, BotIA, Poli. |
| Widget web | ❌ | ❌ | ❌ | Fase 6. |

### Mensajería (WhatsApp)

- ✅ Outbox con reintento cuando el worker está caído; catch-up de entrantes al reconectar.
- ✅ Ticks reales: enviando, enviado, entregado, leído, error.
- ✅ Media entrante persistida en Storage; límites de tamaño visibles en la UI.
- ✅ Anti-ban: 2–4 s entre salientes.
- ✅ Mensajes programados, archivar, responder citando (reply-to).

### Interfaz

- ✅ UI estilo WhatsApp Web (compositor `+`, emoji, grabación de audio, burbujas).
- ✅ Respuestas rápidas con `/`, variables (`{{nombre}}`) y editor.
- ✅ Catálogo y carrito en el compositor (presupuesto multi-producto, listas por categoría `/categoría`, fotos múltiples).
- ✅ Búsqueda en el historial de conversaciones.
- ✅ Filtros por canal; badge de canal en lista, header y burbuja.
- ✅ Notas internas con autor, ancladas al header (no salen al cliente).
- ✅ Asignar la conversación a un miembro del equipo.
- ✅ Seguimiento: alerta interna "esperando tu respuesta" (12 h Nuevo/Contactado, 24 h resto), ordenada arriba.
- ✅ Notificaciones del navegador y tiempo real (Supabase Realtime).
- ✅ Drawer de contacto/deal dentro del chat (lead, líneas del deal, campos personalizados).

---

## 2. CRM / Kanban (`/crm`)

- ✅ Kanban por etapa con drag & drop; etapas por defecto (Nuevo, Contactado, Calificado, Propuesta, Ganado, Perdido) y etapas editables.
- ✅ Chats entrantes sin lead en un costado: arrastrar a una columna crea el lead.
- ✅ Ida y vuelta lead ↔ chat (`/chat?conversacion=`, `/crm?lead=`).
- ✅ Tarjeta: valor, fecha de cierre, scoring alta/media/baja, asignado, próxima tarea, seguimiento, campos personalizados marcados.
- ✅ Filtros: Todos / Mis leads / Sin asignar, búsqueda (incluye valores de campos personalizados), canal, valor, fecha de cierre, etiquetas, solo seguimiento.
- ✅ Motivo obligatorio al pasar a Perdido.
- ✅ Historial de etapas (`lead_etapa_historial`) con timeline en el drawer.
- ✅ Líneas del deal (`lead_lineas`): productos, cantidad y precio en el lead.
- ✅ Stock: reserva en Propuesta, descuento al Ganado, toast al mover.
- ✅ Stats del inbox: nuevas, sin responder, tiempo a primera respuesta, conversión por etapa.
- ✅ **Reportes por agente** (`/crm/reportes`): leads abiertos/nuevos, ganados, perdidos, conversión, valor ganado, mensajes, mediana de tiempo de respuesta, sin responder. Períodos 7/30/90 días.
- ✅ "Recordarme" desde la tarjeta: crea una tarea con fecha ligada al lead.
- ❌ Varios embudos (pipelines) por organización.
- ❌ Vista calendario / agenda de tareas y citas.
- ❌ Exportar leads a CSV/Excel.

---

## 3. Contactos (`/contactos`)

- ✅ CRUD, búsqueda sin acentos, ficha con conversaciones, leads y timeline de etapas.
- ✅ Match automático del teléfono/WhatsApp entrante con contactos existentes.
- ✅ Importar desde Sheets, CSV y Google Contacts.
- ✅ Etiquetas (chips y filtro `/contactos?etiqueta=`).
- ✅ Nuevo pedido desde la ficha (lead nuevo sin pisar uno Ganado).
- ✅ Campos personalizados (también en leads).
- ❌ Fusionar contactos duplicados.
- ❌ Exportar contactos a CSV/Excel.

---

## 4. Catálogo y ventas (`/catalogo`)

- ✅ Ítems con categoría, stock, stock mínimo y alertas de bajo stock.
- ✅ Variantes (talle/color) anidadas.
- ✅ Categorías administrables (crear, renombrar con slug, borrar).
- ✅ Import masivo CSV/Excel/Sheets y carga de muchos archivos.
- ✅ Plantillas editables de presupuesto y propuesta.
- ❌ Link de pago / cobro en el hilo.
- ❌ Sync con Tiendanube, Shopify, Mercado Libre (stock/pedidos) o ERP.

---

## 5. Equipo y configuración

- 🧪 Organización con varios usuarios, roles `admin` / `agente`, invitaciones por enlace (`/configuracion/equipo`, `/invitar`).
- 🧪 Asignación de leads y chats; contactos compartidos por organización.
- ✅ Campos personalizados por organización (`/configuracion/campos`, solo admin): texto, número, fecha, opción, sí/no.
- ✅ Conexión de canales en `/configuracion/mensajeria` (WhatsApp QR, Instagram, Mercado Libre; solo admin).
- ✅ Etapas del Kanban compartidas por organización; solo el admin las crea, edita, reordena o borra.
- ✅ Tareas ("Recordarme") por organización, con asignado; la próxima tarea se ve en la tarjeta para todo el equipo.
- ❌ Chat interno de equipo, horarios de atención, multi-número.

---

## 6. Dashboard (`/dashboard`)

- ❌ Deshabilitado: desde el 13 oct `/dashboard` redirige a `/crm/reportes` y no figura en el menú. El código sigue en el repo, pero `DashboardMetricsService` devolvía **valores fijos** (95 s de respuesta, 12,5 % de conversión), filtraba solo por usuario y usaba el cliente anónimo. Se rehabilita cuando tenga datos reales por organización.

---

## 7. Suite Google (diferencial, secundaria)

- ✅ Sheets → Slides masivo con plantillas, tipografías, paletas, logo, portada, filtros y orden.
- ✅ Sync programada (hora/día/semana), trigger por cambio en el Sheet, re-sync, modo enriquecimiento, historial y preview.
- ✅ Conversiones: Excel/CSV → Sheets, Sheets → Excel/Word/Slides, Slides → Sheet/PPTX, PPTX → Slides, PDF → Sheets, fusionar Sheets, limpiar datos.
- ✅ Explorador de negocios por zona (Google Places) con export a Sheets.
- ❌ Explorador → contactos directo, export a Excel, búsquedas guardadas (Fase 4).
- ❌ Aviso por WhatsApp al terminar una generación de slides (Fase 4).

---

## 8. Infraestructura

- Next.js 14.1 (App Router), React, TypeScript, MUI; NextAuth con Google.
- Supabase (Postgres, Storage, Realtime); acceso server-side con service role y scope por `organizacion_id`.
- Vercel (app) + Railway (worker WhatsApp Baileys).
- Tests con Vitest (342 al 13 oct 2026); `tsc --noEmit` limpio.

---

## Brechas detectadas al cruzar docs y código (12 oct 2026)

Ordenadas por impacto. Están cargadas como tareas en [`ORDEN-ACTUAL-PRODUCTO.md`](./ORDEN-ACTUAL-PRODUCTO.md).

| # | Brecha | Por qué importa | Dónde |
|---|---|---|---|
| 1 | ~~**Etapas del Kanban por usuario.**~~ ✅ Resuelto el 13 oct: etapas por organización. | Un agente invitado veía columnas propias vacías. | Fase 3½ |
| 2 | ~~**Tareas por usuario.**~~ ✅ Resuelto el 13 oct: además el "Recordarme" no guardaba nada (cliente anónimo contra RLS sin políticas). | Base para la agenda de equipo. | Fase 3½ |
| 3 | ~~**Dashboard con métricas inventadas.**~~ ✅ 13 oct: redirige a `/crm/reportes`. Falta rehacerlo con datos reales. | Mostraba números falsos al cliente. | Infra producto |
| 4 | ~~**Rutas de prueba en producción.**~~ ✅ 13 oct: borradas (7 rutas). | Cualquier usuario logueado podía disparar envíos sin control de organización. | Infra producto |
| 5 | **Telegram y Email sin envío** aunque la UI los lista como canales. | El vendedor responde y el mensaje falla. | Backlog comparativa / Fase 5 |
| 6 | **Exportar contactos y leads** (CSV/Excel). | Pedido básico de cualquier PyME; también cubre "no me ato a la herramienta". | Backlog CRM |
| 7 | **Fusionar contactos duplicados.** | El match automático evita muchos, pero importaciones y canales distintos (IG, ML, WA) crean duplicados de la misma persona. | Backlog CRM |
| 8 | **Facebook Messenger** no figuraba en el orden. | Mismo stack de Meta que Instagram; lo tienen Whaticket, BotIA, Poli. | Fase 5 |
| 9 | **Varios embudos (pipelines).** | Kommo y Leadsales permiten ventas vs. post-venta vs. mayoristas. | Backlog comparativa |
