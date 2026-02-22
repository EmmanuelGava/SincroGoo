# Miniaturas de Presentaciones: Cache y Base de Datos

Documentación del manejo de thumbnails/miniaturas de Google Slides para evitar rate limits (429) y optimizar las llamadas a la API de Google.

---

## Resumen del problema

La API de Google Slides tiene límites estrictos en "Expensive read requests per minute per user". Cada llamada a `getThumbnail` consume cuota. Si hacemos N llamadas por presentación × M presentaciones, se produce error 429 (Too Many Requests).

---

## Flujos actuales

### 1. Listado de documentos (`/proyectos/nuevo`)

**Ruta:** `/api/google/documents/thumbnail?fileId=X&type=slides`

**Flujo:**
1. **Drive API** – Intenta `thumbnailLink` (no suele existir para presentaciones nativas).
2. **Fallback** – Si es presentación sin thumbnail: `SlidesService.obtenerPrimeraMiniatura(fileId)`.
3. **Resultado** – 1 llamada a `getThumbnail` (solo la primera diapositiva).

**Archivos:**  
`src/app/api/google/documents/thumbnail/route.ts`,  
`SlidesService.obtenerPrimeraMiniatura()`

---

### 2. Editor de proyectos (sidebar de diapositivas)

**Datos:** `SlidesContext` → `cargarDiapositivas()` → `/api/google/slides?action=getData`

**Flujo:**
1. **Carga inicial** – `SlidesService.obtenerPresentacion(id, incluirThumbnails=true)` obtiene todas las diapositivas y sus thumbnails en una sola llamada.
2. **Respuesta** – Cada diapositiva incluye `urlImagen` (contentUrl de Google).
3. **`useThumbnails`** – Si existe `urlImagen`, la usa; si no, llama a `/api/google/slides/thumbnails` por diapositiva.

**Archivos:**  
`src/app/editor-proyectos/hooks/useThumbnails.ts`,  
`src/app/editor-proyectos/contexts/SlidesContext/`,  
`SlidesService.obtenerPresentacion()`

---

### 3. API proxy por diapositiva

**Ruta:** `/api/google/slides/thumbnails?presentacionId=X&diapositivaId=Y`

**Flujo:**
1. `SlidesService.obtenerMiniaturaSlide(presentationId, diapositivaId)`.
2. Comprueba **APICache** en memoria.
3. Si no está en cache → llamada a Google `getThumbnail`.
4. Guarda en cache 24 h y devuelve la imagen.

**Archivos:**  
`src/app/api/google/slides/thumbnails/route.ts`,  
`SlidesService.obtenerMiniaturaSlide()`

---

## Cache en memoria (APICache)

**Ubicación:** `src/app/servicios/google/utils/cache.ts`

**Detalles:**
- Singleton en memoria.
- TTL por entrada (ej. 24 h para thumbnails).
- **Limitación:** En serverless (Vercel) no persiste entre invocaciones; cada request puede usar una instancia nueva.
- **Uso:** `SlidesService.obtenerMiniaturaSlide()` usa `cache.get()` / `cache.set()` para contentUrl de Google.

```typescript
// Ejemplo de uso
const cacheKey = `thumbnail_${presentationId}_${slideId}`;
const cached = this.cache.get<string>(cacheKey);
if (cached) return { exito: true, datos: cached };
// ... llamar a Google ...
this.cache.set(cacheKey, thumbnail, 24 * 60 * 60 * 1000);
```

---

## Base de datos (Supabase)

### Tabla `diapositivas` (slide_items)

La tabla de diapositivas tiene `thumbnail_url` para almacenar la URL de miniatura.

**Tipos:** `src/lib/supabase/types/slides.ts`

```typescript
// Parámetros para crear/actualizar diapositiva
thumbnail_url?: string;
```

**Uso actual:**  
El servicio de slides permite guardar y actualizar `thumbnail_url`, pero hoy no se usa para thumbnails en el flujo principal. El editor lee de la API de Google vía `obtenerPresentacion` / `useThumbnails`.

---

## Estrategia: “Pedir a Google una vez, usar BD después”

### Idea

1. **Al sincronizar un proyecto** – Obtener presentación + thumbnails de Google una vez y guardar `thumbnail_url` en `diapositivas`.
2. **Al mostrar** – Leer `thumbnail_url` desde Supabase y no llamar a Google.
3. **Actualización** – Solo refrescar thumbnails cuando se vuelva a sincronizar.

### Pasos para implementarlo

1. En el flujo de sync (ej. `SyncService` o al conectar documentos):
   - Llamar a `obtenerPresentacion` con `incluirThumbnails=true`.
   - Para cada diapositiva, insertar/actualizar en `diapositivas` con `thumbnail_url = diapositiva.urlImagen`.
2. En el editor:
   - Prioridad 1: cargar desde Supabase (si el proyecto está sincronizado).
   - Prioridad 2: cargar desde Google API (proyectos nuevos o sin sync).
3. `useThumbnails`:
   - Si la diapositiva tiene `thumbnail_url` desde BD, usarla.
   - Si no, usar `urlImagen` de la API o el proxy `/api/google/slides/thumbnails`.

### Consideración sobre URLs de Google

Las `contentUrl` de `getThumbnail` suelen ser firmadas y temporales. Para persistir en BD hay dos enfoques:

- **Opción A:** Guardar la URL temporal; puede dejar de funcionar tras unas horas.
- **Opción B:** Subir la imagen a Supabase Storage al sincronizar y guardar la URL de Storage en `thumbnail_url` (más estable, pero más lógica de sync).

---

## Resumen de optimizaciones actuales

| Escenario                     | Antes                          | Después                                  |
|-----------------------------|--------------------------------|------------------------------------------|
| Listado proyectos (18 pres) | 18 × N getThumbnail            | 18 × 1 getThumbnail                      |
| Editor sidebar (N slides)   | N (obtenerPresentacion) + N (useThumbnails) | N (obtenerPresentacion) y reutilizar `urlImagen` |
| Cache APICache              | En memoria, 24 h               | Igual (no persiste en serverless)        |

---

## Archivos relevantes

| Archivo                                             | Rol                                                      |
|-----------------------------------------------------|----------------------------------------------------------|
| `src/app/api/google/documents/thumbnail/route.ts`    | Thumbnail para listado de documentos/presentaciones      |
| `src/app/api/google/slides/thumbnails/route.ts`      | Proxy de thumbnails por diapositiva                      |
| `src/app/api/google/slides/route.ts`                | getData con diapositivas + urlImagen                     |
| `src/app/servicios/google/slides/SlidesService.ts`   | obtenerPresentacion, obtenerPrimeraMiniatura, obtenerMiniaturaSlide |
| `src/app/servicios/google/utils/cache.ts`           | APICache en memoria                                      |
| `src/app/editor-proyectos/hooks/useThumbnails.ts`    | Lógica de thumbnails en el sidebar del editor            |
| `src/lib/supabase/services/slides.ts`               | CRUD de diapositivas con thumbnail_url                   |
| `src/lib/supabase/types/slides.ts`                  | Tipos con thumbnail_url                                  |
