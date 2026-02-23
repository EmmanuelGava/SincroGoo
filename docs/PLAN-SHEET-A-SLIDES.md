# Plan: Sheet → Slides — Continuación

## Estado actual (post‑imágenes)

**Hecho:**
- Placeholder **Imagen** en plantilla: `tipo: 'imagen'` en layout, `createImage` en `crearSlideConDatos`, retry sin imagen si la URL falla (400).
- **Preview**: en `PreviewSlideCSS` los elementos tipo imagen muestran `<img>` si hay URL o “Sin imagen”.

**Pendiente (orden sugerido):**

---

## Fase 1 — Página /sheets-to-slides (prioridad alta) — **HECHO (Opción A)**

Objetivo: que la página tenga un flujo útil y completo.

### Opción A — Unificar con flujo plantilla (recomendada) — **Implementado**

- **1.1** Extraer `spreadsheetId` de la URL del Sheet que ingresa el usuario (ya validado en paso 0).
- **1.2** Paso “Configurar plantilla”: 
  - Llamar a `GET` o API que devuelva encabezados/filas del Sheet (p. ej. reutilizar lógica de Sheets o `obtenerDatosHoja` vía API).
  - Selector de plantilla (ficha_local, catálogo_productos, etc.).
  - Mapeo columnas ↔ placeholders (como en EditorPlantilla) o “por nombre de columna”.
- **1.3** Paso “Previsualizar”: mostrar `PreviewSlideCSS` con primera fila y plantilla elegida.
- **1.4** Paso “Generar”:
  - Crear un **proyecto temporal** (o usar uno existente) con `spreadsheet_id` y `metadata.plantilla_template_id` = plantilla elegida, y opcionalmente guardar `column_mapping`.
  - Llamar `POST /api/google/slides/plantilla/generate` con `spreadsheetId`, `proyectoId`, `templateType`, `tituloPresentacion`, `columnMapping`.
  - Polling a `GET /api/google/slides/plantilla/job/[jobId]` y barra de progreso.
  - Al terminar: enlace “Abrir presentación” y opción “Ir al editor de proyecto” si se creó proyecto.
- **1.5** Si no se quiere crear proyecto en DB: añadir un endpoint “generate without project” que cree el job con `proyecto_id` opcional/null y solo devuelva `presentationId` + job; la página solo necesita el enlace a la presentación. (Implica ajustar `plantilla/generate` y `plantilla/process` para aceptar job sin proyecto.)

### Opción B — Flujo rápido sin plantilla

- **1.1** En paso 1 o 2: nombre de la presentación.
- **1.2** Llamar `POST /api/google/slides/sheets-to-slides` con `spreadsheetId` y `nombrePresentacion`.
- **1.3** Mostrar resultado: enlace a la presentación generada y texto tipo “Se generó una diapositiva por cada bloque de 20 filas, con el título en la primera celda. Para diseño por fila y plantillas, usa un proyecto en el editor.”
- **1.4** (Opcional) Mejorar `generarPresentacionDesdeDatos`: por ejemplo, incluir encabezados + varias celdas por slide (tabla o más TEXT_BOX), manteniendo el mismo endpoint.

**Decisión:** elegir A o B según si se quiere que /sheets-to-slides sea la puerta de entrada al flujo plantilla (A) o una herramienta rápida sin diseño (B).

---

## Fase 2 — Formatos de diapositivas (prioridad media)

Objetivo: mejorar el aspecto y control de las slides generadas por plantilla.

- **2.1** **Alineación de texto** — **HECHO**  
  En `LayoutElement`: `alignment?: 'LEFT' | 'CENTER' | 'RIGHT'`. En `crearSlideConDatos`: `updateParagraphStyle` (START/CENTER/END). En `PreviewSlideCSS`: `textAlign` según alignment. Ejemplo: reporte_simple Título con `alignment: 'CENTER'`.

- **2.2** **Texto largo** — **HECHO (documentado)**  
  Documentado en FLUJO-GENERACION-SLIDES: el shape tiene tamaño fijo; si el texto es muy largo puede desbordarse; conviene dar altura suficiente en el layout o limitar en el Sheet. No se implementó overflow/shrink en API.

- **2.3** **Fuente (opcional)** — **HECHO**  
  En `LayoutElement`: `fontFamily?: string`. En `crearSlideConDatos`: `updateTextStyle` incluye `fontFamily` y `fields` con `fontFamily`. Ejemplo: ficha_local Nombre con `fontFamily: 'Roboto'`.

- **2.4** **Preview** — **HECHO**  
  En `PreviewSlideCSS`: alineación ya reflejada (textAlign); fuente reflejada con `fontFamily` en sx del Typography cuando `el.fontFamily` está definido.

---

## Fase 3 — Documentación y limpieza (prioridad baja) — **HECHO**

- **3.1** En `FLUJO-GENERACION-SLIDES.md`: añadir sección “Otro flujo: Sheets-to-Slides (página)” que explique:
  - Ruta `/sheets-to-slides`.
  - API `POST /api/google/slides/sheets-to-slides` y que usa `generarPresentacionDesdeDatos`.
  - Comportamiento limitado (una slide por lote, solo título) y enlace a “Para plantillas por fila, usar el editor de proyecto”.
- **3.2** En `ANALISIS-SHEET-A-SLIDES.md`: marcar como hechos “Placeholder Imagen” y “Preview para Imagen”; actualizar la tabla de prioridades y enlace a este plan.
- **3.3** Si se implementa Fase 1 opción A: documentar en el mismo flujo que la página sheets-to-slides puede usar el mismo backend que el editor de plantilla (generate + job).

---

## Resumen de tareas por fase

| Fase | Tarea | Depende de |
|------|--------|------------|
| 1 | Decidir A (unificar) vs B (rápido) | — |
| 1A | Extraer spreadsheetId, API datos Sheet para la página | Decisión A |
| 1A | UI: selector plantilla + mapeo + preview + generar + polling | 1A anterior |
| 1A | Ajustar generate/process para job sin proyecto (opcional) | Decisión A |
| 1B | Conectar página a POST sheets-to-slides y mostrar resultado | Decisión B |
| 2 | Alineación de texto en layout y crearSlideConDatos | — |
| 2 | Texto largo (documentar o heurística) | — |
| 2 | Fuente opcional en plantilla/layout | — |
| 3 | Actualizar FLUJO-GENERACION-SLIDES y ANALISIS-SHEET-A-SLIDES | Cualquier avance |

---

## Próximo paso recomendado

1. **Decidir** si la página /sheets-to-slides debe unificar con plantilla (A) o ser flujo rápido (B).
2. **Si A:** implementar 1.1–1.4 (y 1.5 si se quiere sin proyecto).
3. **Si B:** implementar 1.1–1.3 de la opción B.
4. Luego seguir con Fase 2 (alineación primero) y Fase 3 (docs).
