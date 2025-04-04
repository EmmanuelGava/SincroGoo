# Resultados de Verificación de Código Antiguo

## Fecha: 20/11/2023

## Resumen

Después de ejecutar el script `check-redirectors.ps1`, se han identificado **35 archivos** que aún contienen referencias a los redirectors o rutas antiguas. A continuación se presenta un análisis detallado:

## Referencias por Patrón

| Patrón | Número de Referencias | Prioridad |
|--------|----------------------|-----------|
| `@/app/lib/import-redirector` | 20 | Alta |
| `@/app/lib/supabase` | 28 | Alta |
| `@/servicios/supabase/globales/conexion` | 3 | Media |
| `@/servicios/supabase/globales/supabase-service` | 0 | Baja |
| `@/servicios/supabase/globales/tipos` | 3 | Media |
| `@/servicios/supabase/redirector` | 0 | Baja |
| `@/servicios/supabase/tablas` | 5 | Media |

## Archivos a Actualizar por Categoría

### API Routes (20 archivos)

- `src/app/api/asociaciones/route.ts`
- `src/app/api/auth/supabase/route.ts`
- `src/app/api/auth/[...nextauth]/options.ts`
- `src/app/api/editor-proyectos/asociaciones/route.ts`
- `src/app/api/editor-proyectos/celdas/route.ts`
- `src/app/api/editor-proyectos/diapositivas/route.ts`
- `src/app/api/editor-proyectos/elementos/[id]/route.ts`
- `src/app/api/editor-proyectos/elementos/route.ts`
- `src/app/api/editor-proyectos/presentaciones/route.ts`
- `src/app/api/editor-proyectos/proyectos/route.ts`
- `src/app/api/editor-proyectos/sheets/[id]/data/route.ts`
- `src/app/api/editor-proyectos/sheets/[id]/route.ts`
- `src/app/api/editor-proyectos/sheets/route.ts`
- `src/app/api/editor-proyectos/slides/[id]/route.ts`
- `src/app/api/editor-proyectos/slides/route.ts`
- `src/app/api/editor-proyectos/thumbnails/bucket/route.ts`
- `src/app/api/editor-proyectos/thumbnails/[id]/route.ts`
- `src/app/api/editor-proyectos/thumbnails/route.ts`
- `src/app/api/proyectos/sync/route.ts`
- `src/app/api/proyectos/[id]/route.ts`

### Componentes y Contextos (4 archivos)

- `src/app/editor-proyectos/componentes/slides/BotonGuardarElementos.tsx`
- `src/app/editor-proyectos/contexto/EditorContext.tsx`
- `src/app/proyectos/[id]/page.tsx`
- `src/app/sincronizar/page.tsx`

### Servicios y Utilidades (7 archivos)

- `src/app/lib/index-service.ts`
- `src/app/servicios/google/api.ts`
- `src/app/servicios/supabase/globales/conexion.ts`
- `src/app/servicios/supabase/globales/tipos.ts`
- `src/app/servicios/supabase/redirector.ts`
- `src/app/lib/import-redirector.ts`
- `src/app/lib/supabase/index.ts`

## Redirectors Existentes

Todos los redirectors identificados siguen existiendo en el código:

- `src/app/lib/import-redirector.ts`
- `src/app/servicios/supabase/globales/conexion.ts`
- `src/app/servicios/supabase/globales/tipos.ts`
- `src/app/servicios/supabase/redirector.ts`
- `src/app/lib/supabase/index.ts`

## Plan de Acción Recomendado

### Fase 1: Migración de Componentes y Contextos

1. Actualizar `EditorContext.tsx` (3 referencias a import-redirector, 2 a tablas)
2. Actualizar `BotonGuardarElementos.tsx` (1 referencia a import-redirector)
3. Actualizar páginas de proyectos y sincronización

### Fase 2: Migración de API Routes

1. Migrar rutas API más utilizadas primero:
   - API de proyectos
   - API de sheets y slides
   - API de asociaciones

2. Agrupar migraciones por funcionalidad:
   - Autenticación
   - Editor de proyectos
   - Thumbnails

### Fase 3: Eliminación de Redirectors

1. Verificar que no hay más referencias a redirectors usando el script
2. Eliminar redirectors en este orden:
   - `src/app/servicios/supabase/globales/tipos.ts`
   - `src/app/servicios/supabase/globales/conexion.ts`
   - `src/app/servicios/supabase/redirector.ts`
   - `src/app/lib/import-redirector.ts`
   - `src/app/lib/supabase/index.ts`

## Notas Adicionales

- **Archivos con múltiples referencias**: `EditorContext.tsx` y `redirector.ts` contienen la mayor cantidad de referencias y requerirán un enfoque más cuidadoso.
- **Interdependencias**: Algunos redirectors dependen de otros, por lo que es importante seguir el orden de eliminación recomendado.
- **Pruebas**: Después de cada migración, es crucial probar la funcionalidad asociada para asegurar que todo sigue funcionando correctamente. 