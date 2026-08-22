# Chat comercial: UI WhatsApp, respuestas rápidas y catálogo

Fecha: 2026-08-21. Trabajo **no estaba en el plan** de Fases 0–3 (solo figuraba “respuestas rápidas” como línea Kommo). Se hizo porque el inbox se usa para vender, no solo para chatear.

## Objetivo

El vendedor responde como en WhatsApp Web, con atajos `/` y un **catálogo de productos / presupuestos / propuestas** cargado como software comercial (lote, varios tipos de archivo). En el chat **solo elige** el ítem para armar el mensaje.

## Fuera de alcance

- Stock en tiempo real, precios inventados por IA, sync de Tiendanube.
- Varios archivos por ítem (hoy: una foto + un documento).
- Video en catálogo o en el compositor.
- Marketplace / tienda pública.

## Qué quedó hecho

### 1. UI del chat estilo WhatsApp Web

- Compositor: `+` (documento / fotos y videos / audio) · emoji · rayo · input · mic/enviar.
- Burbujas y ticks leídos; grabación de audio en barra completa.
- Header y sidebar alineados al uso diario (buscar chat, menú ⋮).

### 2. Respuestas rápidas

- Tabla `chat_respuestas_rapidas`.
- `/` en el compositor; plantillas default (`/hola`, `/precio`, `/propuesta`, etc.).
- Variables `{{nombre}}`, `{{telefono}}`, `{{producto}}`, `{{precio}}`, `{{incluye}}`.
- Editor desde el rayo o ⋮ → Respuestas rápidas.

### 3. Catálogo en el compositor (solo elegir)

- Tabla `chat_catalogo` (`producto` | `presupuesto` | `propuesta`).
- Chip **Elegir producto**; al elegir rellena nombre, precio e incluye.
- Si hay foto o PDF, se manda como media con el texto de pie.

### 4. Módulo `/catalogo` (carga fuera del chat)

- Nav **Catálogo**. Import masivo: CSV, Excel, Google Sheet.
- Carga de a muchos archivos: foto, PDF, Word, Excel, PowerPoint (hasta 50).
- Upsert por tipo + nombre; reimportar precio/incluye no borra archivos ya subidos.
- El CRUD de a uno queda para excepciones.

## Tareas (agregadas a posteriori, hechas)

- [x] UI del chat al estilo WhatsApp Web (compositor, menú `+`, grabación, burbujas, ticks).
- [x] Respuestas rápidas (`/` + plantillas, variables, editor, siembra de atajos default).
- [x] Catálogo seleccionable en el compositor (chip, placeholders, adjunto foto/PDF).
- [x] Módulo `/catalogo` fuera del chat: listado, filtros, alta/edición.
- [x] Import masivo de catálogo (CSV, Excel, Google Sheet) y plantilla CSV.
- [x] Carga masiva de archivos comerciales (foto, PDF, Word, Excel, PowerPoint).
- [x] El chat deja de cargar ítems; solo abre `/catalogo` para administrar.

## Pendiente (venta real)

- [ ] Presupuesto multi-producto: carrito en el compositor, no un solo chip. Spec: [`2026-08-22-carrito-pedido-tags-motivo-design.md`](./2026-08-22-carrito-pedido-tags-motivo-design.md).

Detalle de orden: Fase 3 de [`docs/ORDEN-ACTUAL-PRODUCTO.md`](../../ORDEN-ACTUAL-PRODUCTO.md).
