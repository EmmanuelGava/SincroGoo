LISTADO COMPLETO DE MEJORAS — SINCROGOO
========================================

## PRIORIDAD INMEDIATA (antes de lanzar)

[ ] Seguridad: cerrar vulnerabilidad /api/supabase/projects
[ ] Seguridad: activar RLS en tabla proyectos en Supabase
[ ] Dominio propio (sincrogoo.com o .app)
[ ] Mover servidor WhatsApp a Railway
[ ] Página /precios + integración Lemon Squeezy
[ ] Tabla subscriptions + helper getCurrentUserWithPlan()
[ ] Límites por plan (Free: 3 proyectos, 50 syncs)
[ ] Webhook Lemon Squeezy
[ ] Corregir rutas rotas (/precios, /proyectos/editar/[id])
[ ] Traducción completa al inglés (next-intl)
[ ] Secuencia 3 emails de onboarding (Resend/Brevo)

## MÓDULO CONTACTOS (nuevo — corazón del producto)

[ ] Tabla contactos en Supabase:
    id, usuario_id, nombre, empresa, telefono, 
    email, direccion, notas, created_at
[ ] Importar contactos desde Google Sheets
[ ] Importar contactos desde CSV
[ ] CRUD completo de contactos (crear, editar, eliminar, buscar)
[ ] Ficha de contacto con historial:
    - Conversaciones de WhatsApp/Telegram vinculadas
    - Leads del Kanban vinculados
    - Presentaciones generadas vinculadas
[ ] Cruzar número de WhatsApp entrante con lista de contactos
[ ] Vincular conversaciones del chat a un contacto
[ ] Al mover lead en Kanban → registrar en ficha del contacto

## MÓDULO SINCRONIZACIONES — mejoras

[x] Selector de fila activa en editor (flechas ← →) para navegar entre registros sin regenerar — HECHO (EditorPlantilla + TablaPlantillaSheet)
[x] Mapeo automático por nombre de placeholder
    (columna "Nombre" → {{Nombre}} automático)
[ ] Sync programada automática (Vercel Cron, solo Pro/Business) por ahora no , usamos el de supabase
[x] Actualización parcial por rango de filas
    (ej: "regenerar solo filas 10 a 20") lo hacemos cuando craeamos el proyecto
[ ] Re-sincronizar slides existentes sin regenerar todo
[x] Link para compartir (copiar enlace de vista) — HECHO
[x] Soporte de imágenes en plantillas (createImage vs TEXT_BOX) — HECHO (tipo imagen en layout, createImage, retry sin imagen)
[ ] Preview de todas las slides generadas (carrusel de miniaturas)
[x] Exportar presentación generada a PDF directo — HECHO
[ ] Notificación push/email cuando termina generación larga
[ ] Historial de generaciones por proyecto
[ ] Modo "enriquecimiento": actualizar slides existentes
    respetando el diseño original (sin recrear desde cero)

## MÓDULO EDITOR DE PLANTILLAS

[x] Vista embebida de Slides (iframe /embed) — HECHO. El editor de edición NO se puede embeber (Google bloquea /edit en iframe).
[ ] **Prioridad: Mejores diseños de plantillas** — Plantillas atractivas para que el usuario no necesite salir a Google Slides salvo personalización avanzada. Ver `docs/PLAN-EDITOR-PLANTILLAS-EMBED.md` (sección "Estrategia alternativa").
[ ] Fase 2 — Editor visual propio con Fabric.js (largo plazo):
    - Canvas drag & drop de bloques de texto e imagen
    - Paleta de colores y tipografías
    - Insertar placeholders desde chips clicables
    - Preview en tiempo real con datos de primera fila
    - Guardar plantilla como JSON en Supabase
    - Galería de templates predefinidos mejorados

## MÓDULO CRM / KANBAN — mejoras

[ ] Valor monetario por lead (ej: $500 USD)
[ ] Fecha de cierre estimada por lead
[ ] Filtros en Kanban: por canal, por valor, por fecha
[ ] Al cerrar lead → registrar en ficha de contacto
[ ] Reporte de conversión por etapa del funnel
[ ] Asignar lead a un miembro del equipo (plan Business)

## MÓDULO CHAT — mejoras

[ ] Estabilizar WhatsApp Lite:
    - Sesiones persistentes en Supabase Storage (no en memoria)
    - Reconexión automática con backoff exponencial
    - Indicador de estado claro en UI
[ ] Completar WhatsApp Business API (Meta Cloud API)
[ ] Completar Email con SMTP/SendGrid
[ ] Respuestas rápidas predefinidas (templates de mensajes)
[ ] Asignar conversación a contacto existente
[ ] Búsqueda en historial de conversaciones

## INFRAESTRUCTURA Y PERFORMANCE

[ ] Rate limiting en APIs de Google (ya parcial, completar)
[ ] Dashboard interno de uso de quota de Google APIs
[ ] Backoff exponencial completo en errores 429
[ ] Mover Socket.IO a Railway (no compatible con Vercel serverless)
[ ] Monitoreo de errores con Sentry

## FASE 3 — CRECIMIENTO

[ ] Email marketing básico desde el CRM (SendGrid)
[ ] API pública documentada para disparar syncs externamente
[ ] Google Workspace Add-on (sidebar en Google Sheets)
[ ] Programa de referidos (1 mes gratis por usuario referido)
[ ] IA que genera plantilla desde descripción de texto
    ("quiero una ficha de producto con foto y precio en verde")
[ ] Soporte multi-idioma en plantillas generadas
[ ] Modo colaborativo (compartir proyecto con otro usuario)

## MARKETING Y LANZAMIENTO

[ ] Video demo 60 segundos en inglés
[ ] Assets Product Hunt (GIF, screenshots, copy)
[ ] Lanzamiento Product Hunt (martes/miércoles 00:01 PST)
[ ] Post Reddit r/googlesheets, r/productivity, r/SaaS
[ ] Show HN en Hacker News
[ ] Publicar en Google Workspace Marketplace
[ ] Directorios: Alternativeto.net, G2, Capterra
[ ] 2-3 artículos SEO en inglés
[ ] Cambio de nombre del productos

---

## ANÁLISIS — MEJORAS SHEET-TO-SLIDES / PLANTILLA

Referencia: `docs/FLUJO-GENERACION-SLIDES.md`, `docs/PLAN-SHEET-A-SLIDES.md`, `docs/ANALISIS-SHEET-A-SLIDES.md`.

### MÓDULO SINCRONIZACIONES (relación con plantilla)

| Mejora | Estado | Notas |
|--------|--------|--------|
| **Selector de fila activa (flechas ← →)** | **HECHO** | Estado `filaPreviewIndex` en EditorPlantilla; flechas ← → que cambian la fila de la vista previa; TablaPlantillaSheet recibe `filaSeleccionadaId` y `onSeleccionarFila`, resalta fila y permite clic para cambiar. |
| **Mapeo automático por nombre de placeholder** | Parcial | En `plantilla/process` si `columnMapping` está vacío ya se hace match por nombre de columna = placeholder (`headers.findIndex(h => h === el.placeholder)`). Falta UI en EditorPlantilla que *sugiera* o muestre el mapeo automático (chips "Nombre → Nombre"). |
| **Sync programada automática (Vercel Cron)** | Pendiente | Re-ejecutar generate/process en un horario. Requiere: Cron job, elegir proyecto + horario, guardar en DB, y que el job use credenciales del usuario (token refresh o service account). Solo Pro/Business. |
| **Actualización parcial por rango de filas** | Pendiente | "Regenerar solo filas 10–20". Requiere: UI para elegir rango, API o flag que cree job solo con esos items (o que process filtre por `fila_index`). Supabase ya tiene `generacion_job_items` por fila; habría que poder re-encolar solo un subconjunto. |
| **Re-sincronizar slides existentes sin regenerar todo** | Pendiente | Modo "enriquecimiento" ligero: actualizar solo el texto de shapes existentes (replaceAllText o updateTextStyle por elemento) sin crear slides nuevas. Depende de tener asociación slide ↔ fila (p. ej. en `generacion_job_items.slide_id`). |
| **Link público siempre actualizado** | Pendiente | Que la URL de "ver presentación" apunte siempre al archivo actual (ya es el caso si se usa `proyecto.slides_id`). Si se pide "link público que no cambie aunque regenere", haría falta capa (redirect o short link) que apunte al slides_id actual. |
| **Soporte de imágenes en plantillas** | **HECHO** | `tipo: 'imagen'` en layout, `createImage` en `crearSlideConDatos`, retry sin imagen si URL falla. Plantilla `catalogo_productos` tiene Imagen como imagen. Ver `plantilla-layouts.ts` y `SlidesService.crearSlideConDatos`. |
| **Preview de todas las slides generadas (carrusel)** | Pendiente | Tras generar, mostrar miniaturas de todas las slides (poll thumbnails de la API por cada slide o usar `obtenerVistasPrevias`). UI: carrusel o grid en el modal de resultado o en la página del proyecto. |
| **Exportar presentación a PDF directo** | Pendiente | Drive API: export `application/vnd.google-apps.presentation` → `application/pdf`. Endpoint que reciba `presentationId` y devuelva URL del PDF o stream. Límites de export. |
| **Notificación push/email cuando termina generación** | Pendiente | Tras marcar job "completado" en process: enviar email (Resend/Brevo) o push (Web Push / servicio). Necesita email o suscripción del usuario y cola o llamada desde process. |
| **Historial de generaciones por proyecto** | Parcial | Ya existe `generacion_jobs` por proyecto; no hay UI de "historial". Listar jobs del proyecto (fecha, estado, total filas, errores) en una pestaña o modal del editor. |
| **Modo "enriquecimiento"** | Pendiente | Actualizar slides existentes respetando diseño (no recrear desde cero). Implica: leer shapes de cada slide, mapear por placeholder o por posición, y solo actualizar texto/imagen. Más complejo que el flujo actual "crear slide nueva por fila". |

### MÓDULO EDITOR DE PLANTILLAS

| Mejora | Estado | Notas |
|--------|--------|--------|
| **Fase 1 — Embeber Google Slides nativo** | Pendiente | Mostrar el documento de Slides en un iframe en el editor (edit o view). Ya se usa link a `docs.google.com/.../edit`; falta embed en la misma página y posiblemente picker para crear/elegir presentación plantilla. |
| **Fase 2 — Editor visual propio (Fabric.js)** | Pendiente | Canvas propio: bloques texto/imagen, placeholders, colores, tipografías, guardar plantilla como JSON. Sustituiría o complementaría los layouts en código (`plantilla-layouts.ts`). Gran esfuerzo; depende de Fase 1 o de decisión de no depender de iframe de Slides. |

### Prioridad sugerida (solo esta sección)

1. **Corto plazo:** Marcar "Soporte de imágenes" como hecho en el listado; opcional: UI de mapeo automático (mostrar/sugerir columnas↔placeholders); historial de generaciones (listar jobs en UI).
2. **Medio:** Selector de fila activa (flechas); preview carrusel de slides generadas; notificación al terminar generación.
3. **Largo:** Actualización parcial por rango; re-sincronizar existentes; modo enriquecimiento; editor visual Fabric.js; sync programada.