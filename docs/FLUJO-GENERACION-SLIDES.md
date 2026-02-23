# Flujo de Generacion de Slides desde Sheet

## Resumen

El sistema genera diapositivas en Google Slides a partir de datos de un Google Sheet, usando plantillas autoajustables. Cada fila del Sheet produce una diapositiva con los datos de esa fila. Las plantillas se adaptan a las columnas detectadas del documento del usuario.

## Flujo completo

```
Frontend (proyectos/nuevo) - clic "Crear"
    |-- Crea proyecto en Supabase
    |-- Crea presentacion (PlantillaTemplateService) - 1 slide en blanco
    |-- POST /api/google/slides/plantilla/generate
    |
    v
POST /api/google/slides/plantilla/generate
    |-- Obtiene templateType del body o proyecto.metadata.plantilla_template_id
    |-- Crea ARCHIVO NUEVO de Slides (PlantillaTemplateService.crearPresentacionDesdePlantilla: 1 slide vacia, sin formas)
    |-- Lee filas del Sheet (SheetsService.obtenerDatosHoja)
    |-- Limita filas si proyecto.metadata.limite_filas (10, 20, 30, etc.)
    |-- Crea job en Supabase con presentation_id = nuevo archivo
    |-- Crea items por fila (generacion_job_items)
    |-- Dispara POST /process en background
    |-- Retorna job_id al frontend
    |
    v
POST /api/google/slides/plantilla/process
    |-- Lee el job y sus items pendientes
    |-- Si columnMapping tiene claves: layout = generarLayoutDinamico(claves) - plantillas autoajustables
    |-- Si no: layout fijo de plantilla-layouts.ts por template_type
    |-- Busca la PLANTILLA en codigo (templates.ts)
    |-- Por cada fila:
    |     |-- Mapea columnas del Sheet a placeholders del layout
    |     |-- Llama a SlidesService.crearSlideConDatos()
    |     |     |-- createSlide (slide en blanco)
    |     |     |-- updatePageProperties (fondo con color de la plantilla)
    |     |     |-- Por cada campo del layout:
    |     |     |     |-- Por cada elemento del layout: si tipo imagen y URL valida -> createImage; si texto -> createShape (TEXT_BOX), insertText, updateTextStyle (fontSize, bold, color), y si hay alignment -> updateParagraphStyle
    |     |     |-- Un solo batchUpdate a la Slides API
    |     |-- Actualiza estado del item en Supabase
    |     |-- sleep(1500ms) para respetar rate limit
    |-- Elimina la slide vacia original (plantilla inicial)
    |-- Actualiza proyecto.slides_id = presentation_id (nuevo archivo)
    |-- Guarda metadata.slide_padre_id (primera diapositiva)
    |-- Marca el job como completado
    |
    v
GET /api/google/slides/plantilla/job/[jobId]  (polling cada 2s desde proyectos/nuevo)
    |-- Retorna progreso: estado, filas_procesadas, total_filas, errores
    |
    v
proyectos/nuevo: loading visible, toast "Generando diapositivas... X%"
    |-- Al completar: toast success, router.push(/editor-proyectos/{id})
    |-- Sin pagina intermedia: va directo al editor real (TablaHojas + SidebarSlides)
```

## Archivos clave

### Definicion de plantillas
- `src/app/editor-proyectos/plantilla/templates.ts` - Plantillas disponibles (nombre, colores) - estilos
- `src/app/servicios/google/slides/plantilla-layouts.ts` - LAYOUTS fijos + generarLayoutDinamico(placeholders, basePlantilla) para plantillas autoajustables

### Endpoints API
- `src/app/api/google/slides/plantilla/generate/route.ts` - Crea el job y dispara el procesamiento
- `src/app/api/google/slides/plantilla/process/route.ts` - Procesa cada fila secuencialmente
- `src/app/api/google/slides/plantilla/job/[jobId]/route.ts` - Polling de estado del job

### Servicios
- `src/app/servicios/google/slides/SlidesService.ts` - Metodo `crearSlideConDatos()` que construye cada slide (acepta layoutOverride)
- `src/app/servicios/google/slides/PlantillaTemplateService.ts` - Crea la presentacion con 1 slide vacia (sin formas); el process la elimina al final

### Frontend
- `src/app/proyectos/nuevo/page.tsx` - Flujo crear proyecto plantilla: paso 1 (Sheet), 2 (plantilla), 3 (mapeo, limite filas). Al Crear: genera diapositivas, polling con loading, redireccion al editor
- `src/app/editor-proyectos/[projectId]/page.tsx` - Modo plantilla: va directo al editor real (TablaHojas + SidebarSlides), sin pagina intermedia
- `src/app/editor-proyectos/componentes/plantilla/PreviewSlideCSS.tsx` - Vista previa en CSS (sheets-to-slides, etc.)

### Base de datos (Supabase)
- Tabla `generacion_jobs`: Estado del job, template_type, column_mapping
- Tabla `generacion_job_items`: Estado por fila, slide_id generado
- Tabla `proyectos`: Tras completar, se actualiza `metadata.slide_padre_id` con el ID de la primera diapositiva generada (asociación sheet ↔ slides)

## Plantillas autoajustables

Las plantillas se adaptan a las columnas detectadas del Sheet. En paso 3 (mapeo):
- **Placeholders = columnas detectadas** (mapeo 1:1 por defecto)
- El usuario puede asignar o excluir columnas
- **Layout dinamico**: `generarLayoutDinamico(placeholders)` genera posiciones para N campos
- Columnas tipo imagen (imagen, foto, url_imagen): se detectan con `esColumnaImagen()` y usan createImage

Plantillas de estilo (colores, fondo):
| ID | Nombre | Fondo |
|---|---|---|
| catalogo_productos | Catalogo de productos | Blanco |
| ficha_cliente | Ficha de cliente | Blanco |
| ficha_local | Ficha de local | Oscuro #1E1E2E |
| propuesta_comercial | Propuesta comercial | Blanco |
| reporte_simple | Reporte simple | Gris #F8F9FA |
| blanco | En blanco | Blanco |

## Por que este enfoque (construir desde cero)

El enfoque anterior (duplicar slide + replaceAllText) fallaba por dos razones:
1. **Runs fragmentados**: Google Slides divide el texto en multiples "runs" internamente. Un placeholder como `{{Nombre}}` podia quedar como `{{`, `Nombre`, `}}` en runs separados, haciendo que `replaceAllText` no lo encontrara.
2. **Respuesta truncada**: `presentations.get` de una presentacion con 84+ slides no devolvia `textElements` completos, resultando en "Shapes con placeholders: 0".

El enfoque actual construye cada slide desde cero usando `createSlide` + `createShape` + `insertText` con los datos ya reemplazados, evitando ambos problemas. Ademas usa un solo `batchUpdate` por fila, lo que es mas eficiente.

## Preview

La vista previa se muestra en el propio editor sin crear una copia en Slides. Se usa el componente `PreviewSlideCSS`, que renderiza una maqueta con CSS segun:

- **Primera fila del Sheet** - Los datos mostrados
- **Mapeo de columnas** - Placeholder -> columna del Sheet
- **Plantilla elegida** - Layout (posiciones) y colores (bgColor, textColor)

Al finalizar la generacion en proyectos/nuevo, se redirige al editor real (TablaHojas + SidebarSlides) con la presentacion ya generada.

## Rate limiting

- Delay de 1500ms entre filas
- Reintentos con delay de 60s ante error 429
- Maximo 5 reintentos por fila

## Otro flujo: Sheets-to-Slides (pagina)

La ruta **/sheets-to-slides** ofrece el mismo flujo de generacion por plantilla sin pasar por un proyecto existente:

1. El usuario pega la URL de un Google Sheet y conecta.
2. Se cargan los datos con `GET /api/google/sheets?action=getData&spreadsheetId=...`.
3. Elige plantilla y titulo de la presentacion.
4. Ve la vista previa (PreviewSlideCSS) con la primera fila.
5. Al generar: se crea un **proyecto** en Supabase (nombre, hoja_calculo_id, modo plantilla, metadata.plantilla_template_id) y se llama a `POST /api/google/slides/plantilla/generate` con ese proyectoId. Mismo job y polling que en el editor de plantilla.
6. Al terminar: enlace a la presentacion y opcion "Ir al proyecto".

No se usa la API `POST /api/google/slides/sheets-to-slides` (que genera una slide por lote de 20 filas con solo titulo). Para diseno por fila y plantillas, se usa siempre el flujo plantilla (generate + process).

## Elementos por tipo en crearSlideConDatos

- **Texto** (por defecto): createShape TEXT_BOX, insertText, updateTextStyle (color, fontSize, bold, fontFamily si viene en el layout). Si el layout tiene `alignment` (LEFT/CENTER/RIGHT), se envia updateParagraphStyle (START/CENTER/END).
- **Imagen** (`tipo: 'imagen'`): si el valor es una URL publica, createImage con posicion/tamano en EMU. Si createImage falla (p. ej. 400 por URL no publica), se reintenta el batch sin la imagen y se continua el job.

## Texto largo (overflow)

El shape tiene tamano fijo (w, h en el layout). Si el contenido de la celda es muy largo, el texto puede desbordarse visualmente en Slides. No se aplica recorte automatico ni reduccion de fuente. Conviene dar altura suficiente en el layout a los campos que puedan tener mucho texto (p. ej. Descripcion, Notas, Observaciones) o limitar la longitud en el Sheet.
