# Venta real: carrito, nuevo pedido, etiquetas, motivo perdido

Fecha: 2026-08-22. Cuatro huecos que aparecen **antes** de seguir con scoring, filtros de tablero o stats. Sin esto el catálogo y el modelo persona/deal no se usan como en una venta de indumentaria.

## 1. Presupuesto multi-producto (carrito)

**Hoy:** `MessageInput` guarda `selectedCatalog: CatalogoItem | null`. Un chip “Elegir producto” reemplaza placeholders y, al enviar, adjunta **una** foto/PDF. `chat_catalogo` es un ítem con un `precio`. No hay líneas ni total.

**Falta:**
- Estado `CatalogoItem[]` (mín. 3–4 líneas) en el compositor.
- Texto de presupuesto generado: líneas + total. Un solo mensaje WhatsApp, no 4 envíos.
- Adjunto: primera imagen del carrito (YAGNI: un media por mensaje, igual que ahora).
- Helper puro `armarPresupuesto(lineas) → { texto, total }` + tests. No persistir pedido en BD en este corte (el lead no tiene `valor_potencial` en prod todavía).

**No es:** stock, variantes talle/color, varios PDF, tipo catálogo `presupuesto` como documento aparte.

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

Hacer estas cuatro **antes** de búsqueda de historial, valor/fecha en tarjeta, scoring y stats. Alimentan el funnel; scoring sin motivo ni tags es teatro.
