# Análisis: Sheet → Slides — Estado y pendientes

## Resumen

Hay **dos flujos** distintos que llevan datos de hoja de cálculo a Google Slides:

| Flujo | Dónde | API / Servicio | Comportamiento |
|-------|--------|----------------|----------------|
| **Plantilla (por proyecto)** | Editor de proyecto → modo plantilla | `POST /api/google/slides/plantilla/generate` + `process` | Una diapositiva **por fila** del Sheet, con plantillas (ficha_local, catálogo_productos, etc.), mapeo de columnas, jobs en Supabase y polling. |
| **Sheets-to-slides (página)** | `/sheets-to-slides` | `POST /api/google/slides/sheets-to-slides` | Usa `ExcelToSlidesService.generarPresentacionDesdeDatos`: divide datos en **lotes de 20 filas**, una slide por lote con **solo un cuadro de texto** (título = primera celda). **No usa plantillas ni mapeo.** |

El flujo “rico” y documentado en `FLUJO-GENERACION-SLIDES.md` es el de **plantilla**. El de la página sheets-to-slides es otro flujo, más simple y limitado.

---

## Lo que ya está bien resuelto (flujo plantilla)

- Crear presentación nueva desde plantilla y eliminar la slide plantilla al final.
- Jobs en Supabase (`generacion_jobs`, `generacion_job_items`) y procesamiento en background.
- Polling de estado del job desde el frontend (EditorPlantilla).
- Mapeo de columnas del Sheet a placeholders (manual o por nombre de columna).
- Layouts por plantilla (posiciones y tamaños en `plantilla-layouts.ts`).
- Colores por plantilla (fondo, texto, acento en `templates.ts`).
- Un solo `batchUpdate` por fila en `crearSlideConDatos`.
- Rate limiting (delay 1500 ms entre filas, reintentos ante 429).
- Actualización de proyecto: `slides_id`, `metadata.slide_padre_id`.
- Preview CSS en el editor (PreviewSlideCSS) con primera fila del Sheet.
- **Placeholder Imagen:** elementos con `tipo: 'imagen'` en layout usan `createImage` (URL pública); si falla 400 se continúa sin imagen.
- **Preview para Imagen:** en PreviewSlideCSS los elementos tipo imagen muestran `<img>` si hay URL o placeholder “Sin imagen”.

---

## Qué falta o conviene tener en cuenta

### 1. Placeholder **Imagen** (catálogo de productos) — **HECHO**

- En `plantilla-layouts.ts` el elemento `Imagen` de catalogo_productos tiene `tipo: 'imagen'`.
- En `crearSlideConDatos` los elementos con `tipo === 'imagen'` y valor URL válida usan `createImage` (Slides API, EMU); si el batch falla (p. ej. 400 por URL no pública), se reintenta sin los requests de imagen y se continúa el job.

### 2. Página **/sheets-to-slides**

- Tiene un stepper de 4 pasos pero solo están implementados:
  - Paso 0: ingresar URL del Sheet y “Conectar”.
  - Paso 1: mensaje “Hoja conectada” y botón “Configurar Plantilla” que solo avanza al paso 2.
- No hay paso real de configuración (elegir plantilla, mapeo de columnas, vista previa).
- No se llama a ninguna API para generar la presentación; el flujo se corta después del paso 1.

**Opciones:**

- **A)** Unificar con el flujo plantilla: desde esta página, después de conectar el Sheet, abrir o embeber un flujo de “elegir plantilla → mapeo → preview → generar” y usar `POST .../plantilla/generate` (creando o reutilizando un proyecto si hace falta).
- **B)** Dejar esta página como “rápido sin plantilla”: que al menos en algún paso se llame a `POST /api/google/slides/sheets-to-slides`, se muestre el resultado (enlace a la presentación) y se deje claro que es “una slide por lote de filas, solo título”, o mejorar un poco `generarPresentacionDesdeDatos` (ver punto 4).

### 3. Formatos de las diapositivas (plantilla)

Hoy solo se generan:

- Fondo sólido (color de plantilla).
- Cuadros de texto con: contenido, `fontSize`, `bold`, color de texto.

**Posibles mejoras:**

- **Imágenes:** como en el punto 1 (placeholder Imagen).
- **Alineación de texto:** izquierda / centro / derecha (hoy no se envía en `updateTextStyle`).
- **Texto largo:** el shape tiene tamaño fijo; si el texto no cabe, se desborda. Valorar opciones: recorte, “overflow: hidden”, o reducir fuente/ajustar altura en layouts críticos.
- **Fuente:** hoy no se configura familia de fuente; Slides usa la por defecto. Si se quiere marca consistente, añadir opción de fuente en plantilla/layout.
- **Formas decorativas (opcional):** líneas, rectángulos (p. ej. para títulos o separadores) si se añaden al modelo de layout.

### 4. **generarPresentacionDesdeDatos** (ExcelToSlidesService)

- Usado por `POST /api/google/slides/sheets-to-slides`.
- Crea presentación vacía, divide en lotes de 20 filas (con encabezados incluidos en cada lote), y por cada lote: una slide en blanco + **un único** TEXT_BOX con el “título” (primera celda de la segunda fila del lote o “Datos - Parte N”).
- No vierte el resto de datos (tabla, más campos) en la slide.

Si se quiere que la página sheets-to-slides sea útil sin pasar por el flujo plantilla, habría que mejorar este método (p. ej. tabla por slide, o más campos por slide), o dejar claro en la UI que es “solo títulos por bloque” y recomendar el flujo con plantilla para algo más elaborado.

### 5. Preview (PreviewSlideCSS) — **HECHO**

- Para elementos con `tipo === 'imagen'` se muestra `<img>` si el valor es URL, o un bloque con texto “Sin imagen” si no.

### 6. Documentación

- `FLUJO-GENERACION-SLIDES.md` describe bien el flujo **plantilla**.
- No aclara que **sheets-to-slides** es otro flujo (API y servicio distintos) ni las limitaciones actuales (sin plantillas, sin mapeo, una slide por lote con solo título).

**Recomendación:** añadir una sección “Otro flujo: Sheets-to-Slides (página)” que explique la API `POST /api/google/slides/sheets-to-slides` y que usa `generarPresentacionDesdeDatos` con comportamiento limitado, y enlazar a este análisis para pendientes y mejoras.

---

## Resumen de prioridades sugeridas

| Prioridad | Tema | Estado / Acción |
|-----------|------|-----------------|
| ~~Alta~~ | Placeholder Imagen | **Hecho:** tipo imagen en layout + createImage + retry sin imagen. |
| Alta | Página /sheets-to-slides | Decidir: unificar con flujo plantilla o flujo rápido; ver **PLAN-SHEET-A-SLIDES.md**. |
| Media | Formatos | Añadir alineación de texto; valorar texto largo y fuente. |
| ~~Media~~ | Preview Imagen | **Hecho:** img o “Sin imagen” en PreviewSlideCSS. |
| Baja | generarPresentacionDesdeDatos | Mejorar contenido por slide si se mantiene flujo rápido. |
| Baja | Docs | Documentar flujo sheets-to-slides; ver PLAN-SHEET-A-SLIDES (Fase 3). |

---

## Archivos clave (referencia)

- Plantillas: `src/app/editor-proyectos/plantilla/templates.ts`
- Layouts: `src/app/servicios/google/slides/plantilla-layouts.ts`
- Construcción de cada slide: `SlidesService.crearSlideConDatos()` en `src/app/servicios/google/slides/SlidesService.ts`
- Proceso del job: `src/app/api/google/slides/plantilla/process/route.ts`
- Generación inicial (job): `src/app/api/google/slides/plantilla/generate/route.ts`
- Página sheets-to-slides: `src/app/sheets-to-slides/page.tsx`
- API sheets-to-slides: `src/app/api/google/slides/sheets-to-slides/route.ts`
- Servicio “desde datos”: `ExcelToSlidesService.generarPresentacionDesdeDatos` en `src/app/servicios/google/conversions/excel-to-slides/ExcelToSlidesService.ts`

**Plan de continuación:** ver [PLAN-SHEET-A-SLIDES.md](./PLAN-SHEET-A-SLIDES.md).
