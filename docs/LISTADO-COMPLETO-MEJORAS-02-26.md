# KLOSYNC — Listado completo de mejoras
> Pack de herramientas para vendedores | Mercado global | Actualizado Feb 2026

---

## 🚨 PRIORIDAD INMEDIATA (antes de lanzar)

### Seguridad
- [ ] Cerrar vulnerabilidad /api/supabase/projects (agregar validación de sesión)
- [ ] Activar RLS en tabla proyectos en Supabase

### Infraestructura base
- [ ] Dominio propio (klosync.com o .app)
- [ ] Mover servidor WhatsApp + Socket.IO a Railway (incompatible con Vercel serverless)
- [ ] Monitoreo de errores con Sentry

### Monetización
- [ ] Página /precios funcional
- [ ] Integración Lemon Squeezy (pagos sin empresa, acepta LATAM)
- [ ] Tabla subscriptions en Supabase
- [ ] Helper getCurrentUserWithPlan() para todas las APIs
- [ ] Límites por plan (Free: 3 proyectos / 50 syncs, Pro: ilimitado)
- [ ] Webhook Lemon Squeezy para eventos de suscripción
- [ ] Corregir rutas rotas (/precios, /proyectos/editar/[id])

### Lanzamiento
- [ ] Traducción completa al inglés (next-intl) — ~5-8 días de trabajo
- [ ] Secuencia 3 emails de onboarding (Resend/Brevo):
  - Día 0: bienvenida
  - Día 3: activación
  - Día 7: conversión con descuento

---

## 👤 MÓDULO CONTACTOS
> Base de todo el CRM. Sin esto el resto no funciona bien.

- [ ] Tabla contactos en Supabase: id, usuario_id, nombre, empresa, telefono, email, direccion, notas, created_at
- [ ] CRUD completo (crear, editar, eliminar, buscar)
- [ ] Importar desde Google Sheets
- [ ] Importar desde CSV
- [ ] Ficha de contacto con historial unificado:
  - Conversaciones WhatsApp/Telegram vinculadas
  - Leads del Kanban vinculados
  - Presentaciones generadas vinculadas
- [ ] Cruzar número de WhatsApp entrante con lista de contactos
- [ ] Vincular conversaciones del chat a un contacto
- [ ] Al mover lead en Kanban → registrar en ficha del contacto

---

## 📊 MÓDULO CRM / KANBAN

### Ya hecho
- [x] Kanban visual con etapas
- [x] Leads con estados e interacciones

### Pendiente
- [ ] Valor monetario por lead (ej: $500 USD)
- [ ] Fecha de cierre estimada por lead
- [ ] Filtros en Kanban: por canal, por valor, por fecha
- [ ] Al cerrar lead → registrar en ficha de contacto
- [ ] Reporte de conversión por etapa del funnel
- [ ] Asignar lead a miembro del equipo (plan Business)
- [ ] Lead scoring básico (prioridad alta/media/baja)

---

## 💬 MÓDULO CHAT / COMUNICACIÓN

### Ya hecho
- [x] Chat unificado WhatsApp Lite (Baileys) + Telegram
- [x] Email parcial

### Estabilización urgente
- [ ] Sesiones WhatsApp persistentes en Supabase Storage (no en memoria)
- [ ] Reconexión automática con backoff exponencial
- [ ] Indicador de estado de conexión claro en UI

### Features que tienen todos los competidores y nosotros no
- [ ] Respuestas rápidas predefinidas (el vendedor escribe / y aparecen templates)
- [ ] Mensajes programados (enviar a fecha/hora determinada)
- [ ] Automatización de seguimiento:
  - "Si no responde en 2 días, mandar recordatorio automáticamente"
  - Mensaje de bienvenida automático al primer contacto
- [ ] Chatbot básico (respuestas automáticas fuera de horario, menú inicial)
- [ ] WhatsApp multiagente (plan Business — varios agentes, mismo número)
- [ ] Asignación de conversación a agente del equipo (plan Business)
- [ ] Campañas/broadcast masivo a lista de contactos (plan Business)
- [ ] Búsqueda en historial de conversaciones

### Completar canales
- [ ] Completar Email con SMTP/SendGrid
- [ ] WhatsApp Business API oficial (Meta Cloud API) — después de revenue

### Diferenciadores únicos
- [ ] Envío automático por WhatsApp al terminar generación de slides
  (ningún competidor tiene esto — Rollstack y Slideform mandan por email/Slack)
- [ ] Email tracking (saber si el prospecto abrió tu email y cuándo)

---

## 🗺️ MÓDULO EXPLORADOR
> Feature más única del producto. Ningún CRM competidor la tiene.

### Ya hecho
- [x] Buscar establecimientos por zona en Google Maps
- [x] Exportar datos a Google Sheets

### Pendiente
- [ ] Exportar directamente a Excel además de Google Sheets
- [ ] Exportar directo al módulo de Contactos (sin pasar por Sheet)
- [ ] Filtros por categoría antes de exportar
- [ ] Guardar búsquedas frecuentes
- [ ] Enriquecer contactos del Explorador:
  - Mostrar email del negocio, LinkedIn, etc. automáticamente
  - Combinado con el Explorador sería único en el mercado global

---

## 🔄 MÓDULO SYNC TOOLS

### Ya hecho
- [x] Google Sheets → Slides (generación masiva con plantillas)
- [x] Sheets → Slides directo (/sheets-to-slides)
- [x] Excel → Sheets (/excel-to-sheets)
- [x] Excel → Slides (/excel-to-slides, acepta también CSV)
- [x] CSV → Sheets — ExcelToSheetsService acepta CSV nativamente, UI actualizada "Excel/CSV → Sheets"
- [x] CSV → Slides — excel-to-slides acepta CSV, UI actualizada "Excel/CSV → Slides"
- [x] Sheets → Excel (.xlsx) — `/sheets-to-excel` + `/api/google/sheets/export-excel` (Drive API export)
- [x] Slides → Sheet — `/slides-to-sheet` + `/api/google/slides/slides-to-sheet` (extrae textos de cada slide)
- [x] Slides → PowerPoint (.pptx) — botón en editor + `/api/google/slides/export-pptx` (Drive API export)
- [x] PowerPoint (.pptx) → Slides — `/pptx-to-slides` + `/api/google/slides/import-pptx` (Drive API import)
- [x] Sheets → Word con plantilla — `/sheets-to-word` + `/api/google/sheets/to-word` (docxtemplater + pizzip)
- [x] PDF → Sheets — `/pdf-to-sheets` + `/api/google/sheets/from-pdf` (pdf-parse, modo texto y modo tabla)

### Automatizaciones ✅ TODO HECHO
- [x] Sync programada automática (Supabase pg_cron + Edge Function):
  - Config por proyecto: cada hora / día / semana
  - Panel UI en editor (SyncConfigPanel) con toggle, frecuencia, notificaciones
  - Indicador "última sync" con time ago
  - pg_cron job activo (`sync-programada-hourly`) llama Edge Function cada hora
  - NextAuth guarda `refresh_token` de Google para sync sin sesión
- [x] Trigger por cambio en Sheet — webhook + Google Apps Script (`/api/webhooks/sheet-change`)
- [x] Historial de sincronizaciones — `/api/supabase/generacion-jobs` + componente HistorialGeneraciones en `/proyectos`

### Funciones avanzadas ✅ TODO HECHO
- [x] Fusionar Sheets — `/merge-sheets` + `/api/google/sheets/merge` (modo append o merge por clave)
- [x] Limpiar datos — `/clean-data` + `/api/google/sheets/clean-data` (duplicados, espacios, teléfonos, emails, capitalización, crea copia limpia)

---

## 🎨 MÓDULO GENERACIÓN DE SLIDES (Sheet → Slides)

### Ya hecho
- [x] Selector de fila activa con flechas ← → en editor
- [x] Mapeo automático por nombre de placeholder
- [x] Soporte de imágenes en plantillas (createImage vs TEXT_BOX)
- [x] Exportar presentación a PDF
- [x] Link para compartir (copiar enlace de vista)
- [x] Actualización parcial por rango de filas

### Personalización antes de generar
- [x] Tipografía (5 opciones Google Fonts: Roboto, Montserrat, Playfair Display, Lato, Oswald) — HECHO (PersonalizacionPlantilla.tsx + SlidesService.crearSlideConDatos aplica fontFamily override)
- [x] Paleta de colores (8 paletas predefinidas + color picker personalizado con react-colorful) — HECHO (PersonalizacionPlantilla.tsx + SlidesService aplica colores fondo/texto/acento)
- [x] Logo en todas las slides (subida de imagen, 4 posiciones) — HECHO (PersonalizacionPlantilla.tsx + SlidesService.crearSlideConDatos inserta createImage con logo por slide)
- [x] Slide de portada opcional (con título y subtítulo) — HECHO (PersonalizacionPlantilla.tsx UI + plantilla-layouts.ts layout "portada" + process/route.ts crea slide portada)
- [x] Filtrar filas por condición simple (contiene, igual, mayor que, menor que) — HECHO (PersonalizacionPlantilla.tsx UI + generate/route.ts aplica filtro)
- [x] Ordenar filas por columna (ASC/DESC) — HECHO (PersonalizacionPlantilla.tsx UI + generate/route.ts aplica ordenamiento)

### Mejoras pendientes
- [ ] Preview carrusel de miniaturas al terminar generación
- [ ] Re-sincronizar slides existentes sin regenerar todo
- [ ] Modo enriquecimiento (actualizar slides existentes respetando diseño original)
- [ ] Notificación por email o WhatsApp al terminar generación larga
- [x] Historial de generaciones por proyecto — HistorialGeneraciones.tsx integrado en `/proyectos` (fecha, estado, filas, errores expandibles, link a presentación)

### Editor de plantillas
- [x] Vista embebida iframe /embed (Google bloquea /edit en iframe)
- [x] Diseños de plantillas mejorados (prioridad sobre editor propio)
- [ ] Editor visual propio con Fabric.js (largo plazo):
  - Canvas drag & drop de bloques texto e imagen
  - Paleta de colores y tipografías
  - Insertar placeholders desde chips clicables
  - Preview en tiempo real con datos de primera fila
  - Guardar plantilla como JSON en Supabase

---

## 🤖 INTEGRACIONES Y IA

### Integraciones con sentido para nuestro mercado
- [ ] HubSpot (API key, no OAuth complejo)
- [ ] Airtable (misma estructura que Sheets, API simple)
- [ ] Looker Studio (muy usado para reportes, gratis)
- [ ] Notion como fuente de datos

### IA (fase 3)
- [ ] Análisis automático del Sheet + insights directo en slides
  (lo que Slideform lanzó en 2025, nadie lo hace a $19-39/mes)
- [ ] Generar plantilla desde descripción de texto
  ("quiero una ficha de producto con foto y precio destacado en verde")
- [ ] Sugerencia de plantilla según columnas detectadas del Sheet
- [ ] Modelo recomendado: Gemini Flash para análisis simples, Claude para análisis complejos
  (costo: ~$0.30-$8/mes para 100 usuarios Business usando IA 10 veces/mes)

---

## 📈 INFRAESTRUCTURA Y PERFORMANCE

- [ ] Dashboard interno de uso de quota Google APIs
- [ ] Backoff exponencial completo en errores 429
- [ ] Historial de versiones de presentaciones
- [ ] Rate limiting completo en todas las APIs de Google
- [ ] API pública documentada (para usuarios técnicos que quieren integrar)

---

## 🚀 MARKETING Y LANZAMIENTO

- [ ] Video demo 60 segundos en inglés
- [ ] Assets Product Hunt (GIF, screenshots, copy en inglés)
- [ ] Lanzamiento Product Hunt (martes/miércoles 00:01 PST)
- [ ] Posts Reddit: r/googlesheets, r/productivity, r/SaaS, r/sales
- [ ] Show HN en Hacker News
- [ ] Publicar en Google Workspace Marketplace
- [ ] Directorios: AlternativeTo.net, G2, Capterra, Product Hunt
- [ ] 2-3 artículos SEO en inglés:
  - "How to auto-update Google Slides from Sheets"
  - "Best tools for sales reps 2026"
  - "Google Sheets to Slides automation"

---

## 💰 PRICING SUGERIDO

| Plan | Precio | Para quién |
|------|--------|------------|
| Free | $0 | Probar el producto (límites estrictos) |
| Pro | $19/mes | Vendedor individual |
| Business | $39/mes | Equipo de hasta 5 personas |

**Break-even:** 10 usuarios Pro. Margen >90% a partir de ahí.
**Meta mes 3:** 200 usuarios Pro = $3.800/mes.

---

## 🏆 DIFERENCIADORES ÚNICOS VS COMPETIDORES

Cosas que KloSync tiene y nadie más tiene a este precio:

1. **Explorador de establecimientos por zona** → exportar prospectos directo al CRM
2. **Generar presentación/catálogo personalizado por fila** desde Google Sheets, Excel o CSV
3. **Envío automático por WhatsApp** al terminar generación (Rollstack/Slideform mandan por email)
4. **Flujo completo de ventas en un solo producto**: Explorador → Contactos → CRM → Chat → Slides
5. **Precio accesible self-serve** ($19/mes vs $500+/mes de Rollstack o Slideform)
6. **18 herramientas de conversión** en un solo lugar (Excel, CSV, Sheets, Slides, Word, PDF, PPTX)
7. **Limpieza inteligente de datos** (duplicados, emails, teléfonos, capitalización) antes de sincronizar
8. **Sync automática con pg_cron** + trigger por cambio en Sheet (ningún competidor a $19/mes)

---

*Última actualización: Febrero 2026*