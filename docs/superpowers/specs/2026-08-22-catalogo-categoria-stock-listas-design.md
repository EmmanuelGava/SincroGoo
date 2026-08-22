# Catálogo: categorías, stock y listas en el chat

Fecha: 2026-08-22.

Complementa el carrito multi-producto ([`2026-08-22-carrito-pedido-tags-motivo-design.md`](./2026-08-22-carrito-pedido-tags-motivo-design.md)) y el catálogo base ([`2026-08-21-catalogo-respuestas-design.md`](./2026-08-21-catalogo-respuestas-design.md)).

## Problema

1. La UI del carrito queda **debajo** del textbox; el vendedor edita texto y chips pelean por el espacio.
2. Un cliente pide “precios y sabores de los vapers”. Hoy hay que armar texto a mano o una respuesta rápida que se desactualiza. Cada sabor debería ser un producto del catálogo; al pedir la lista, el mensaje se arma solo con lo que hay.
3. Sin **stock**, la lista miente. Si mandás un sabor que no hay, el cliente pregunta y perdés un paso.

## Decisiones

| Tema | Decisión |
|---|---|
| Agrupación | Columna `categoria text` en `chat_catalogo` (minúsculas al guardar). No tabla de categorías en v1. |
| Sabores | Cada sabor = un producto con la misma categoría (ej. `vapers` → Mango, Uva, Menta). |
| Stock | `stock integer not null default 0` (≥ 0). Editable en `/catalogo` e import. |
| Mensaje al cliente | Solo ítems con `stock > 0`. Nombre + precio. **Sin cantidad.** Los de stock 0 no aparecen. |
| Lista vs carrito | “Lista: categoría” = texto de stock/precios. Carrito = cotizar 3–4 productos a un cliente. |

## 1. UI del carrito

Chips del carrito + “Agregar producto” + total van **arriba** del TextField del compositor. El texto del presupuesto se edita abajo y se envía. Hint “Podés editar…” debajo del textbox o junto al total.

## 2. Datos

Migración `chat_catalogo`:

- `categoria text null`
- `stock integer not null default 0` con check `stock >= 0`
- Índice opcional por `(usuario_id, categoria)` si el listado lo necesita

API CRUD e import CSV/Excel/Sheets: columnas opcionales `categoria`, `stock`. Normalizar categoría con `trim` + minúsculas; stock entero ≥ 0 (vacío → 0).

`/catalogo`: campo categoría, campo stock, filtro por categoría, indicador interno “sin stock” cuando `stock === 0` (solo UI del vendedor).

Tipos: extender `CatalogoItem` y `validateCatalogoItem`.

## 3. Listas en el chat

En `CatalogPicker`, sección **Listas** arriba: una fila por categoría distinta entre ítems con `stock > 0` (ej. “Lista: vapers (8)”). Abajo, productos individuales filtrables.

Al elegir una lista:

- Insertar en el draft el texto de `armarListaCategoria(items, categoria)`.
- **No** volcar todos al carrito.
- Sin total (no es presupuesto de venta).
- Sin adjuntar todas las fotos (v1).

Ejemplo:

```
Vapers en stock:

• Mango — $12.000
• Uva — $12.000
• Menta — $11.500
```

Helper puro + tests en `src/lib/chat/`. Título: capitalizar la categoría o usar la primera aparición con casing amigable.

## 4. Carrito y productos sueltos

En el picker, productos con `stock === 0`: ocultos o deshabilitados con label “sin stock”. No se agregan al carrito. Misma regla: el cliente no ve lo que no hay.

## 5. Fuera de alcance v1 → tasks a futuro

No se hacen en este corte. Quedan como backlog explícito:

- [ ] Descontar stock automáticamente al marcar un lead **Ganado** (o al confirmar pedido).
- [ ] Alertas de bajo stock (umbral configurable por usuario / por ítem).
- [ ] Variantes anidadas (talle / color / sabor como sub-SKU bajo un producto padre).
- [ ] Al enviar una lista, adjuntar varias fotos (hoy: un media por mensaje).
- [ ] Atalho tipo `/vapers` que inserte la lista si la categoría coincide.
- [ ] Tabla `catalogo_categorias` + rename masivo / sin typos (`vaper` vs `vapers`).
- [ ] Mostrar “sin stock” en el mensaje al cliente (alternativa a ocultar; hoy se ocultan).
- [ ] Reserva / hold de stock mientras el lead está en Propuesta.

## Orden respecto al producto

Hacer después del carrito ya shippeado (chips + total). Actualizar [`docs/ORDEN-ACTUAL-PRODUCTO.md`](../../ORDEN-ACTUAL-PRODUCTO.md) Fase 3 con estas tasks.
