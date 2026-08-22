# Venta real: carrito, nuevo pedido, etiquetas, motivo perdido

Fecha: 2026-08-22. Huecos de venta real **antes** de scoring, filtros de tablero o stats.

**Dependencia:** el §1 (carrito) asume que ya existe la base de catálogo — `categoria`, `stock`, listas y filtro sin stock — de [`2026-08-22-catalogo-categoria-stock-listas-design.md`](./2026-08-22-catalogo-categoria-stock-listas-design.md). Sin eso el picker no sabe qué se puede agregar al carrito. Los §§2–4 (nuevo pedido, etiquetas, motivo) son CRM y no dependen del catálogo.

## 1. Presupuesto multi-producto (carrito)

**Prerrequisito:** spec categoría/stock/listas hecha (ítems con stock; picker no ofrece stock 0).

**Hoy (antes del carrito):** un chip “Elegir producto”, un `selectedCatalog`. No hay líneas ni total. Chips del carrito quedaban debajo del textbox.

**Falta / hace:**
- Estado `CatalogoItem[]` (mín. 3–4 líneas) en el compositor.
- Texto de presupuesto: líneas + total. Un solo mensaje WhatsApp.
- Adjunto: primera imagen del carrito (un media por mensaje).
- Helper puro `armarPresupuesto(lineas) → { texto, total }` + tests.
- UI: chips + “Agregar producto” + total **arriba** del TextField; el texto se edita abajo.
- Solo agregar ítems con `stock > 0` (misma regla que el picker de listas).

**No es (acá):** descontar stock al vender, variantes anidadas, varios PDF. Eso queda en el backlog del spec de categoría/stock.

## 2. Nuevo pedido para un contacto que ya compró

**Hoy:** persona ≠ deal (`contacto_id`). Al **arrastrar un chat sin lead** al Kanban, si hay deal **abierto** (no Ganado/Perdido) se pregunta Mover vs Crear. Si todos los deals están terminales, el POST **sí crea uno nuevo**.

**El hueco:** el cliente que ya compró escribe en el **mismo chat** (`lead_id` ya puesto). Ese chat **no** vuelve a la lista de incoming. En `/contactos/[id]` solo hay “Ver en CRM”. No hay “Nuevo pedido”. El vendedor reabre el Ganado y pisa el historial.

**Falta:**
- Botón **Nuevo pedido** en la ficha (y opcional en el header del chat si hay `contacto_id`).
- POST crea lead en etapa default **Nuevo**, mismo `contacto_id`, **sin** reusar el Ganado.
- Vincular la conversación actual al lead nuevo (`conversaciones.lead_id`) para que el Kanban y el chat apunten a **esta** venta.
- El Ganado anterior queda en la ficha como historial.

## 3. Etiquetas en el contacto

**Hoy:** `contactos` no tiene tags. `leads.tags` jsonb existe y **nadie lo usa** en CRM/ficha. El listado `/contactos` busca nombre/teléfono/email (`buscar_contactos`), no etiquetas.

**Falta:**
- Columna `etiquetas text[]` en `contactos` (chips; no tabla de taxonomía en v1).
- Chips en ficha: agregar/quitar; persistir PATCH.
- Filtro en `/contactos?etiqueta=mayorista` (GIN opcional).
- `buscar_contactos` también matchea etiquetas.
- No migrar ni mostrar `leads.tags` (deuda distinta).

## 4. Motivo al marcar Perdido

**Hoy:** `moverLead` solo manda `{ estado_id }`. `lead_etapa_historial` guarda de→hasta **sin** `motivo`. Hay un `historial_estados_lead.motivo` legado y un POST de interacciones que acepta `motivo`, pero el Kanban no lo pide. Arrastrar a Perdido es silencioso.

**Falta:**
- `lead_etapa_historial.motivo text`.
- Al soltar en columna cuyo nombre es Perdido: dialog obligatorio, 4–5 opciones fijas: competencia / no contestó / precio / no era el momento / otro.
- Guardar el motivo en el historial (y mostrarlo en la ficha).
- Sin motivo no se mueve. No pedir motivo al ir a Ganado ni a etapas vivas.

## Orden

1. Spec categoría + stock + listas (base).
2. Este spec §1: carrito multi-producto + UI arriba.
3. Este spec §§2–4: nuevo pedido, etiquetas, motivo (pueden ir en paralelo entre sí).
4. Recién después: búsqueda historial, valor/fecha Kanban, filtros, scoring, stats.
