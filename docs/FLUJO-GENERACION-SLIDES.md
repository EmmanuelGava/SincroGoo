# Flujo de Generacion de Slides desde Sheet

## Resumen

El sistema genera diapositivas en Google Slides a partir de datos de un Google Sheet, usando plantillas predefinidas. Cada fila del Sheet produce una diapositiva con los datos de esa fila insertados en las posiciones definidas por la plantilla.

## Flujo completo

```
Frontend (EditorPlantilla) - clic "Generar todas las diapositivas"
    |
    v
POST /api/google/slides/plantilla/generate
    |-- Obtiene templateType del body o proyecto.metadata.plantilla_template_id
    |-- Crea ARCHIVO NUEVO de Slides (PlantillaTemplateService.crearPresentacionDesdePlantilla)
    |-- Lee filas del Sheet (SheetsService.obtenerDatosHoja)
    |-- Crea job en Supabase con presentation_id = nuevo archivo
    |-- Crea items por fila (generacion_job_items)
    |-- Dispara POST /process en background
    |-- Retorna job_id al frontend
    |
    v
POST /api/google/slides/plantilla/process
    |-- Lee el job y sus items pendientes
    |-- Lee template_type del job (ej: "ficha_local")
    |-- Busca el LAYOUT en codigo (plantilla-layouts.ts)
    |-- Busca la PLANTILLA en codigo (templates.ts)
    |-- Por cada fila:
    |     |-- Mapea columnas del Sheet a placeholders del layout
    |     |-- Llama a SlidesService.crearSlideConDatos()
    |     |     |-- createSlide (slide en blanco)
    |     |     |-- updatePageProperties (fondo con color de la plantilla)
    |     |     |-- Por cada campo del layout:
    |     |     |     |-- createShape (TEXT_BOX con posicion/tamano)
    |     |     |     |-- insertText (dato real, no placeholder)
    |     |     |     |-- updateTextStyle (fontSize, bold, color)
    |     |     |-- Un solo batchUpdate a la Slides API
    |     |-- Actualiza estado del item en Supabase
    |     |-- sleep(1500ms) para respetar rate limit
    |-- Elimina la slide plantilla original
    |-- Actualiza proyecto.slides_id = presentation_id (nuevo archivo)
    |-- Guarda metadata.slide_padre_id (primera diapositiva)
    |-- Marca el job como completado
    |
    v
GET /api/google/slides/plantilla/job/[jobId]  (polling cada 2s)
    |-- Retorna progreso: estado, filas_procesadas, total_filas, errores
    |
    v
Frontend muestra barra de progreso y resumen final
```

## Archivos clave

### Definicion de plantillas
- `src/app/editor-proyectos/plantilla/templates.ts` - Plantillas disponibles (nombre, colores, placeholders)
- `src/app/servicios/google/slides/plantilla-layouts.ts` - Posiciones y tamanios de los shapes por plantilla

### Endpoints API
- `src/app/api/google/slides/plantilla/generate/route.ts` - Crea el job y dispara el procesamiento
- `src/app/api/google/slides/plantilla/process/route.ts` - Procesa cada fila secuencialmente
- `src/app/api/google/slides/plantilla/job/[jobId]/route.ts` - Polling de estado del job

### Servicios
- `src/app/servicios/google/slides/SlidesService.ts` - Metodo `crearSlideConDatos()` que construye cada slide
- `src/app/servicios/google/slides/PlantillaTemplateService.ts` - Crea la presentacion inicial con la slide plantilla

### Frontend
- `src/app/editor-proyectos/componentes/plantilla/EditorPlantilla.tsx` - UI del editor de plantilla con preview CSS y generacion
- `src/app/editor-proyectos/componentes/plantilla/PreviewSlideCSS.tsx` - Vista previa en CSS usando la primera fila del Sheet, el mapeo de columnas y la plantilla elegida (sin llamar a la API)
- `src/app/editor-proyectos/[projectId]/page.tsx` - Detecta modo plantilla y renderiza EditorPlantilla

### Base de datos (Supabase)
- Tabla `generacion_jobs`: Estado del job, template_type, column_mapping
- Tabla `generacion_job_items`: Estado por fila, slide_id generado
- Tabla `proyectos`: Tras completar, se actualiza `metadata.slide_padre_id` con el ID de la primera diapositiva generada (asociación sheet ↔ slides)

## Plantillas disponibles

| ID | Nombre | Placeholders | Fondo |
|---|---|---|---|
| catalogo_productos | Catalogo de productos | Imagen, Nombre, Precio, Descripcion | Blanco |
| ficha_cliente | Ficha de cliente | Nombre, Telefono, Email, Direccion, Notas | Blanco |
| ficha_local | Ficha de local | Nombre, Direccion, Telefono, Sitio Web, Calificacion | Oscuro #1E1E2E |
| propuesta_comercial | Propuesta comercial | Empresa, Servicio, Precio, Condiciones | Blanco |
| reporte_simple | Reporte simple | Titulo, Dato1, Dato2, Observaciones | Gris #F8F9FA |
| blanco | En blanco | (ninguno) | Blanco |

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

Al finalizar la generacion, el boton "Pasar al editor" abre la presentacion en Google Slides para editar.

## Rate limiting

- Delay de 1500ms entre filas
- Reintentos con delay de 60s ante error 429
- Maximo 5 reintentos por fila
