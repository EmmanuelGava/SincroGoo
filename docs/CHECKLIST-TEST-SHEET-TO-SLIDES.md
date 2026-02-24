# Checklist de pruebas — Sheet to Slides / Plantilla

## Qué necesitas tener listo

### 1. Google Sheet

- **Tipo:** Google Sheets (no Excel ni CSV). La app lee datos vía API de Google Sheets.
- **Formato:**
  - **Primera fila = encabezados** (nombres de columnas). Las plantillas son **autoajustables**: las columnas detectadas se usan como placeholders (mapeo 1:1 por defecto).
  - **Desde la fila 2:** datos (una fila = una diapositiva).
  - Sin filas vacías obligatorias; puedes tener celdas vacías (se mostrarán vacías en la slide).
- **URL:** debe ser de la forma:
  - `https://docs.google.com/spreadsheets/d/ID_DEL_DOCUMENTO/edit`
  - o `.../edit#gid=0` (la app extrae el ID igual).
- **Permisos:** la cuenta con la que inicias sesión en Klosync debe tener **acceso de lectura** al Sheet (propietario o compartido con "puede ver" / "puede editar").

### 2. Columna de imágenes (solo plantilla Catálogo de productos)

- **Tipo de valor:** URL pública de la imagen.
- **Formato:** `https://...` o `http://...` (la API de Slides solo acepta URLs públicas).
- **Ejemplos que suelen funcionar:** enlaces directos a imágenes (ej: `https://picsum.photos/400/200`, enlaces a CDN, imágenes en un sitio público).
- **No sirve:** enlaces de Google Drive sin "cualquiera con el enlace puede ver"; en ese caso la slide se genera sin imagen y el job sigue (no falla).

### 3. Cuenta y sesión

- **Cuenta Google** con la que inicias sesión en la app.
- Esa cuenta debe tener acceso al Sheet y permisos para crear/editar presentaciones en Google Drive (la app crea una presentación nueva en tu Drive).

---

## Plantillas autoajustables

Las plantillas se adaptan a **las columnas detectadas** del Sheet. En el paso 3 (mapeo):
- Cada columna se mapea por defecto a sí misma (1:1)
- Puedes asignar o excluir columnas manualmente
- Columnas tipo imagen (imagen, foto, url_imagen): se detectan automáticamente
- Opción **"Filas a generar"**: Todas, primeras 10, 20, 30, 50 o 100

---

## Checklist de pruebas

### Antes de empezar

- [ ] Tienes un Google Sheet con encabezados en la primera fila y al menos 2–3 filas de datos.
- [ ] Para probar imágenes: una columna "Imagen" con URLs públicas (ej: `https://picsum.photos/400/200`).
- [ ] Sesión iniciada en la app con la misma cuenta que tiene acceso al Sheet.

---

### Página /sheets-to-slides

- [ ] Sin sesión: al ir a `/sheets-to-slides` se muestra mensaje de "Inicia sesión".
- [ ] Con sesión: paso 0 — pegar URL del Sheet y "Conectar Google Sheets" → pasa al paso 1 (y no acepta URLs que no sean de Google Sheets).
- [ ] Paso 1: se cargan columnas y filas; ves selector de plantilla y campo "Título de la presentación".
- [ ] Paso 1: eliges plantilla (ej: Ficha de local) y "Ver vista previa" → paso 2.
- [ ] Paso 2: ves la vista previa con la primera fila; botón "Generar presentación" abre el diálogo.
- [ ] Diálogo: "Continuar" → se crea proyecto, barra de progreso y polling; al terminar, "Abrir presentación" y "Cerrar".
- [ ] Tras cerrar: ves resumen y enlace "Ir al proyecto"; el enlace lleva al proyecto correcto.

---

### Proyectos nuevo (crear proyecto plantilla)

- [ ] Paso 1: seleccionas Sheet, se cargan columnas detectadas.
- [ ] Paso 2: eliges plantilla (estilo) y título.
- [ ] Paso 3: ves columnas detectadas, selector Filas a generar, mapeo campo → columna.
- [ ] Crear: loading visible con "Generando diapositivas... X%", no desaparece hasta terminar.
- [ ] Al terminar: toast success, redirección al editor (TablaHojas + SidebarSlides).
- [ ] Sin página intermedia: va directo al editor real.

---

### Editor de plantilla (proyecto en modo plantilla)

- [ ] Entras a un proyecto con diapositivas ya generadas.
- [ ] Ves la tabla del Sheet a la izquierda y el sidebar de slides a la derecha.

---

### Imágenes (plantilla Catálogo de productos)

- [ ] Sheet con columnas: Nombre, Precio, Imagen, Descripción; en Imagen, URLs públicas.
- [ ] Generar → en cada slide se ve la imagen (no el texto de la URL).
- [ ] (Opcional) Una fila con URL no válida o no pública → esa slide se genera sin imagen; el job no falla.

---

### Alineación y fuente

- [ ] Plantilla "Reporte simple": el **título** de cada slide sale **centrado**.
- [ ] Plantilla "Ficha de local": el **nombre** del local se ve con fuente **Roboto** (o la definida).

---

### Vista previa (PreviewSlideCSS)

- [ ] Catálogo de productos con URL en Imagen: en la preview se ve la imagen; sin URL, "Sin imagen".
- [ ] Reporte simple: título centrado en la preview.
- [ ] Ficha de local: nombre con la fuente correcta en la preview.

---

### Regresiones rápidas

- [ ] Otras plantillas (Ficha de cliente, Propuesta comercial) generan bien sin imágenes.
- [ ] Sheet con 1 sola fila de datos: las flechas ← → no se muestran; la preview usa esa fila.
- [ ] Sheet con 0 filas (solo encabezados): no permite generar o muestra error claro.

---

## Resumen de requisitos del Sheet

| Requisito        | Detalle |
|------------------|---------|
| Tipo             | Google Sheets (URL de docs.google.com/spreadsheets/...) |
| Primera fila     | Encabezados (nombres de columnas) |
| Datos            | Desde fila 2; una fila = una diapositiva |
| Imágenes         | Solo para plantilla Catálogo; columna con **URL pública** (https://...) |
| Permisos         | La cuenta de la app debe poder leer el Sheet y crear archivos en Drive |

Cuando termines de probar, puedes marcar cada ítem con `[x]` en este mismo doc.
