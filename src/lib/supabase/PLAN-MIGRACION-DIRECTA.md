# Plan de Migración Directa

Este documento detalla el plan para migrar los archivos restantes que aún utilizan la ruta antigua `@/servicios/supabase/` a la nueva estructura en `@/lib/supabase`.

## Archivos Pendientes de Migración

Se han identificado 13 archivos que todavía utilizan la ruta antigua:

1. `src/app/api/editor-proyectos/sheets/route.ts`
2. `src/app/api/proyectos/sync/route.ts`
3. `src/app/editor-proyectos/componentes/slides/BotonGuardarElementos.tsx`
4. `src/app/editor-proyectos/contexto/EditorContext.tsx`
5. `src/app/editor-proyectos/utils/thumbnailManager-service.ts`
6. `src/app/editor-proyectos/utils/thumbnailManager.ts`
7. `src/app/lib/index-service.ts`
8. `src/app/proyectos/[id]/page.tsx`
9. `src/app/servicios/supabase/globales/conexion.ts` (redirector)
10. `src/app/servicios/supabase/globales/index.ts` (redirector)
11. `src/app/servicios/supabase/globales/tipos.ts` (redirector)
12. `src/app/servicios/supabase/redirector.ts` (redirector)
13. `src/app/sincronizar/page.tsx`

## Estrategia de Migración

### Fase 1: Archivos de Aplicación Críticos

Estos archivos son parte del núcleo de la aplicación y deben ser migrados con cuidado:

1. **API Routes**:
   - `src/app/api/editor-proyectos/sheets/route.ts`
   - `src/app/api/proyectos/sync/route.ts`

   **Estrategia**: Migrar uno por uno, verificando que las APIs sigan funcionando correctamente después de cada cambio.

2. **Componentes de Editor**:
   - `src/app/editor-proyectos/componentes/slides/BotonGuardarElementos.tsx`
   - `src/app/editor-proyectos/contexto/EditorContext.tsx`

   **Estrategia**: Migrar y probar cada componente para asegurar que la funcionalidad del editor no se vea afectada.

3. **Utilidades de Thumbnails**:
   - `src/app/editor-proyectos/utils/thumbnailManager-service.ts`
   - `src/app/editor-proyectos/utils/thumbnailManager.ts`

   **Estrategia**: Migrar ambos archivos juntos ya que están estrechamente relacionados.

### Fase 2: Páginas y Servicios Generales

Estos archivos son menos críticos o pueden beneficiarse de los redirectors:

1. **Páginas**:
   - `src/app/proyectos/[id]/page.tsx`
   - `src/app/sincronizar/page.tsx`

   **Estrategia**: Migrar uno por uno, verificando la renderización y funcionalidad.

2. **Servicios**:
   - `src/app/lib/index-service.ts`

   **Estrategia**: Migrar y probar que todos los servicios relacionados sigan funcionando.

### Fase 3: Redirectors

Estos archivos son redirectors y se mantendrán hasta que todos los demás archivos hayan sido migrados:

- `src/app/servicios/supabase/globales/conexion.ts`
- `src/app/servicios/supabase/globales/index.ts`
- `src/app/servicios/supabase/globales/tipos.ts`
- `src/app/servicios/supabase/redirector.ts`

**Estrategia**: Mantener estos archivos hasta la fase final, luego eliminarlos solo cuando se confirme que ningún otro archivo los necesita.

## Pasos para cada Archivo

Para cada archivo a migrar, seguir estos pasos:

1. **Análisis**:
   - Identificar las importaciones específicas desde la ruta antigua
   - Verificar si hay tipos o interfaces específicas que necesiten ser migradas

2. **Migración**:
   - Actualizar las importaciones para usar `@/lib/supabase`
   - Ajustar el código según sea necesario para adaptarse a la nueva estructura

3. **Verificación**:
   - Ejecutar `npx tsc` para verificar que no haya errores de tipos
   - Probar la funcionalidad específica relacionada con el archivo migrado

4. **Documentación**:
   - Registrar los cambios en `REGISTRO-IMPLEMENTACION.md`
   - Marcar el archivo como migrado en este plan

## Comandos Útiles para la Migración

### Verificar Importaciones en un Archivo Específico

```powershell
Get-ChildItem -Path "ruta/al/archivo.ts" | Select-String -Pattern '@/servicios/supabase/'
```

### Reemplazar Importaciones en un Archivo Específico

```powershell
$content = Get-Content -Path "ruta/al/archivo.ts"
$content = $content -replace '@/servicios/supabase/globales/conexion', '@/lib/supabase'
$content | Set-Content -Path "ruta/al/archivo.ts"
```

## Registro de Progreso

| # | Archivo | Estado | Observaciones |
|---|---------|--------|---------------|
| 1 | src/app/api/editor-proyectos/sheets/route.ts | Completado | Migrado usando el redirector |
| 2 | src/app/api/proyectos/sync/route.ts | Completado | Migrado usando el redirector con métodos compatibles |
| 3 | src/app/editor-proyectos/componentes/slides/BotonGuardarElementos.tsx | Completado | Migrado usando el redirector |
| 4 | src/app/editor-proyectos/contexto/EditorContext.tsx | Completado | Migrado usando el redirector incluyendo tipos |
| 5 | src/app/editor-proyectos/utils/thumbnailManager-service.ts | Completado | Migrado directamente a supabase desde @/lib/supabase |
| 6 | src/app/editor-proyectos/utils/thumbnailManager.ts | Completado | Migrado directamente a supabase desde @/lib/supabase |
| 7 | src/app/lib/index-service.ts | Completado | Actualizado para usar la nueva estructura |
| 8 | src/app/proyectos/[id]/page.tsx | Completado | Migrado usando el redirector |
| 9 | src/app/sincronizar/page.tsx | Completado | Migrado usando el redirector |

## Pruebas Finales

Una vez completada la migración de todos los archivos:

1. Ejecutar `npx tsc` para verificar que no haya errores de tipos en todo el proyecto.
2. Probar todas las funcionalidades críticas de la aplicación.
3. Eliminar los redirectors y verificar nuevamente que todo funcione correctamente.

## Conclusión

Se ha completado exitosamente la migración de todos los archivos que utilizaban la ruta antigua `@/servicios/supabase/` a la nueva estructura en `@/lib/supabase`. Ahora es necesario realizar pruebas para verificar que todo funcione correctamente y, una vez confirmado, proceder a la eliminación de los redirectors.

## Resumen

Este plan proporciona una estrategia estructurada para completar la migración de los archivos restantes a la nueva estructura de Supabase. Al seguir estos pasos, se minimizará el riesgo de errores y se asegurará que la migración sea completa y exitosa. 