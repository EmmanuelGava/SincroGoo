# Plan: Editor de plantillas con Google Slides embebido

## Contexto

- **Editor actual:** TablaHojas (izq) + SidebarSlides (der) con thumbnails + EditorElementos
- **Objetivo:** Incorporar vista/edición de la presentación de Google Slides dentro del editor

---

## Limitación técnica de Google

**Google Slides NO permite embeber el editor de edición en iframe.** Solo soporta:

| Modo | URL | ¿Embebible? | Uso |
|------|-----|-------------|-----|
| **Editar** | `/presentation/d/{id}/edit` | No (bloqueado) | Edición completa — abre en nueva pestaña |
| **Vista / Embed** | `/presentation/d/{id}/embed` | Sí | Ver presentación (solo lectura) |
| **Publicado** | `/presentation/d/e/{id}/embed` | Sí | "Publicar en web" — link público |

Por tanto, **no podemos tener el editor nativo de Slides dentro de nuestro layout**. Sí podemos:
1. Embeber la vista de la presentación (solo lectura)
2. Mantener el botón "Abrir en Google Slides" para editar

---

## Estructura actual del editor

```
┌─────────────────────────────────────────────────────────────────┐
│ EncabezadoSistema                                                │
├────────────────────────────┬────────────────────────────────────┤
│ TablaHojas (flex-1)        │ SidebarSlides (30% drawer)          │
│ - Búsqueda                 │ - Header: título, PDF, enlace, ✕   │
│ - Tabla Sheet              │ - Navegación: Fila X de Y, ← →     │
│ - Filas con acciones       │ - Lista thumbnails de slides        │
│   (editar, abrir slides)   │ - EditorElementos                   │
│                            │   (asociar columnas, editar texto)  │
└────────────────────────────┴────────────────────────────────────┘
```

---

## Opciones de integración del embed

### Opción A: Tabs en SidebarSlides — Vista / Editor

Añadir pestañas en el sidebar derecho:

```
SidebarSlides
├── [Vista] [Editor]  ← Tabs
├── Si "Vista":
│   └── iframe src="/presentation/d/{id}/embed"
│       + Botón "Abrir en Google Slides para editar"
├── Si "Editor":
│   └── (actual: thumbnails + EditorElementos)
```

**Pros:** No rompe el flujo actual; el usuario elige entre ver la presentación o editar asociaciones.  
**Contras:** El área del embed puede quedar estrecha (30% del ancho).

---

### Opción B: Tres columnas — Tabla | Embed | Panel

Cambiar el layout a tres zonas:

```
┌──────────────┬─────────────────────┬──────────────┐
│ TablaHojas   │ Embed Slides (flex) │ Panel derecho│
│ (≈25%)       │ Vista presentación  │ (≈25%)       │
│              │ iframe              │ - Thumbnails │
│              │                     │ - EditorElem │
└──────────────┴─────────────────────┴──────────────┘
```

**Pros:** La presentación se ve en tamaño grande.  
**Contras:** Más complejo; TablaHojas y panel derecho se comprimen.

---

### Opción C: Toggle "Vista ampliada" — Embed ocupa centro

Botón para alternar el contenido del área principal:

- **Normal:** TablaHojas a la izquierda, SidebarSlides a la derecha
- **Vista ampliada:** Embed ocupa el centro (TablaHojas colapsada o en overlay), sidebar sigue visible

```
[Modo normal]     Tabla | Sidebar
[Vista slides]    [==== iframe embed =====] | Sidebar (thumbnails)
```

**Pros:** Vista grande de la presentación cuando se necesita.  
**Contras:** Cambio de layout más drástico; implementación más pesada.

---

### Opción D: Modales / Diálogos (MVP)

Sin tocar el layout principal:

- Botón "Ver presentación" que abre un **modal/drawer** con el iframe embed
- El usuario ve la presentación, cierra y vuelve al editor
- Para editar: sigue usando "Abrir en Google Slides" en nueva pestaña

**Pros:** Implementación rápida; no modifica la estructura actual.  
**Contras:** Menos integrado; modal puede ser pequeño.

---

## Recomendación: Opción A (Tabs) + mejora del embed

**Fase 1 — Tabs en SidebarSlides**

1. Añadir tabs "Vista" | "Editor" en SidebarSlides
2. Tab **Vista:**
   - iframe con `https://docs.google.com/presentation/d/{idPresentacion}/embed`
   - Requiere que el archivo esté compartido (p. ej. "cualquiera con el enlace") — o usar la sesión del usuario (ver nota abajo)
   - Botón: "Abrir en Google Slides para editar"
3. Tab **Editor:** contenido actual (thumbnails + EditorElementos)

**Fase 2 — Ajustes**

1. Comprobar compartir: si el embed da 404/denied, llamar a `compartirParaEmbed(idPresentacion)` antes de montar el iframe
2. Parámetros del embed: `?start=false&loop=false` para controlar inicio y bucle
3. Sincronizar slide activa: el iframe no expone APIs para elegir la slide; es vista libre

**Nota sobre autenticación del embed:**  
El iframe `/embed` muestra la presentación si:
- Está "Publicado en la web", o
- Está compartido como "Cualquiera con el enlace puede ver"

Si el usuario está logueado con la misma cuenta, puede ver su propio archivo aunque no esté publicado. Para archivos privados sin publicar, el embed puede fallar en sesiones de incógnito. La opción segura es usar `compartirParaEmbed` (permiso "anyone can view") al abrir la vista embed.

---

## Plan de implementación

### Paso 1: Componente SlidesEmbed

```tsx
// SlidesEmbed.tsx
interface SlidesEmbedProps {
  presentationId: string
  onNeedShare?: () => Promise<void>
}
// iframe con URL embed, manejo de error (mostrar "Compartir para ver" o reintentar)
```

### Paso 2: Tabs en SidebarSlides

- Estado `tabActivo: 'vista' | 'editor'`
- Tab "Vista": `<SlidesEmbed presentationId={idPresentacion} />`
- Tab "Editor": contenido actual (thumbnails + EditorElementos)

### Paso 3: Compartir automático (opcional)

- Al montar SlidesEmbed, si falla la carga, ofrecer "Compartir presentación para ver" que llama a `POST /api/.../compartir` (ya existe `compartirParaEmbed` en SlidesService)

### Paso 4: Persistir preferencia de tab

- Guardar en localStorage: `editor_slides_tab = 'vista' | 'editor'` para recordar la preferencia del usuario

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `SidebarSlides.tsx` | Añadir Tabs, estado tabActivo, render condicional |
| `SlidesEmbed.tsx` | Nuevo componente con iframe |
| `SlidesService.ts` | Ya tiene `compartirParaEmbed` |
| API (opcional) | `POST /api/google/slides/compartir?presentationId=xxx` si no existe |

---

## Resumen

| Aspecto | Decisión |
|---------|----------|
| **Edit en iframe** | No posible; solo vista embed |
| **Layout** | Opción A: Tabs Vista/Editor en SidebarSlides |
| **Compartir** | Usar `compartirParaEmbed` si el embed no carga |
| **Editar diseño** | Botón "Abrir en Google Slides" (existente) |

Con esto se obtiene vista integrada de la presentación y se mantiene intacto el flujo actual del editor.

---

## Estrategia alternativa: Mejores plantillas (prioridad)

Dado que Google **no permite** embeber el editor de Slides:

**Objetivo:** Diseñar plantillas de alta calidad para que el usuario no necesite salir de la app salvo que quiera personalizar algo muy específico.

| Qué mejorar | Cómo |
|-------------|------|
| **Diseño visual** | Plantillas con paletas atractivas, tipografías consistentes, espaciado profesional |
| **Layouts** | `plantilla-layouts.ts`: más opciones (ficha_local, grid, tarjeta, etc.) bien definidas |
| **Variedad** | Ofrecer 2-3 plantillas distintas por tipo de contenido (ficha, lista, catálogo) |
| **Imágenes** | Buena disposición: imagen destacada, bordes redondeados, sombras sutiles |
| **Texto** | Jerarquía clara: título grande, subtítulos, cuerpo legible; alineaciones coherentes |
| **Colores** | Temas predefinidos (corporativo, minimalista, vibrante) seleccionables al crear |

Con plantillas bien hechas, el usuario usa la app, ve la vista embebida y exporta PDF. Solo abre Google Slides cuando quiere un cambio de diseño avanzado.
