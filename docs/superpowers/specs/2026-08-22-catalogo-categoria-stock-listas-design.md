# Catálogo: categorías, stock y listas en el chat

Fecha: 2026-08-22.

**Orden:** esta spec es la **base de datos** del catálogo. Va **antes** del carrito multi-producto y de la UI “carrito arriba del textbox”. Sin `categoria` + `stock` + listas, el picker no sabe qué es elegible ni qué armar cuando el cliente pide “sabores de los vapers”.

El carrito (presupuesto + UI arriba) está en [`2026-08-22-carrito-pedido-tags-motivo-design.md`](./2026-08-22-carrito-pedido-tags-motivo-design.md) §1 y consume esta base. Catálogo base: [`2026-08-21-catalogo-respuestas-design.md`](./2026-08-21-catalogo-respuestas-design.md).

## Problema

1. Un cliente pide “precios y sabores de los vapers”. Hoy hay que armar texto a mano o una respuesta rápida que se desactualiza. Cada sabor debería ser un producto del catálogo; al pedir la lista, el mensaje se arma solo con lo que hay.
2. Sin **stock**, la lista miente. Si mandás un sabor que no hay, el cliente pregunta y perdés un paso.
3. Sin **categoría**, no hay forma de agrupar sabores/variantes en una lista reutilizable.

(La UI del carrito debajo del textbox se resuelve en el paso siguiente — carrito — no en esta base.)

## Decisiones

| Tema | Decisión |
|---|---|
| Agrupación | Columna `categoria text` en `chat_catalogo` (minúsculas al guardar). No tabla de categorías en v1. |
| Sabores | Cada sabor = un producto con la misma categoría (ej. `vapers` → Mango, Uva, Menta). |
| Stock | `stock integer not null default 0` (≥ 0). Editable en `/catalogo` e import. |
| Mensaje al cliente | Solo ítems con `stock > 0`. Nombre + precio. **Sin cantidad.** Los de stock 0 no aparecen. |
| Lista vs carrito | “Lista: categoría” = texto de stock/precios. Carrito = cotizar 3–4 productos (spec carrito, después). |

## 1. Datos

Migración `chat_catalogo`:

- `categoria text null`
- `stock integer not null default 0` con check `stock >= 0`
- Índice opcional por `(usuario_id, categoria)` si el listado lo necesita

API CRUD e import CSV/Excel/Sheets: columnas opcionales `categoria`, `stock`. Normalizar categoría con `trim` + minúsculas; stock entero ≥ 0 (vacío → 0).

`/catalogo`: campo categoría, campo stock, filtro por categoría, indicador interno “sin stock” cuando `stock === 0` (solo UI del vendedor).

Tipos: extender `CatalogoItem` y `validateCatalogoItem`.

## 2. Listas en el chat

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

## 3. Sin stock en el picker

Productos con `stock === 0`: ocultos o deshabilitados con label “sin stock”. No se agregan al carrito cuando el carrito exista. Misma regla: el cliente no ve lo que no hay.

## 4. Fuera de alcance v1 → tasks a futuro

No se hacen en este corte. Quedan como backlog explícito:

- [ ] Descontar stock automáticamente al marcar un lead **Ganado** (o al confirmar pedido).
- [ ] Alertas de bajo stock (umbral configurable por usuario / por ítem).
- [ ] Variantes anidadas (talle / color / sabor como sub-SKU bajo un producto padre).
- [ ] Al enviar una lista, adjuntar varias fotos (hoy: un media por mensaje).
- [ ] Atalho tipo `/vapers` que inserte la lista si la categoría coincide.
- [ ] Tabla `catalogo_categorias` + rename masivo / sin typos (`vaper` vs `vapers`).
- [ ] Opción de mostrar “sin stock” en el mensaje al cliente (hoy se ocultan).
- [ ] Reserva / hold de stock mientras el lead está en Propuesta.

## Orden respecto al producto

1. Esta spec (categoría + stock + listas).
2. Carrito multi-producto + UI arriba del textbox (spec venta real §1).
3. Nuevo pedido / etiquetas / motivo Perdido (mismo spec venta real §§2–4; independiente del catálogo).

Actualizar [`docs/ORDEN-ACTUAL-PRODUCTO.md`](../../ORDEN-ACTUAL-PRODUCTO.md) Fase 3 con ese orden.
