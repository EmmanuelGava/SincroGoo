# Archivos para Migración Gradual

## Servicios a Migrar

### Servicios de Supabase
- [x] `@/app/servicios/supabase/proyectos/proyectos-service.ts` → `@/lib/supabase/services/projects` ✅
- [x] `@/app/servicios/supabase/tablas/sincronizacion-service.ts` → `@/lib/supabase/services/sync` ✅

### Servicios de Google
- [ ] `@/app/servicios/google/googleSheets.ts` → Nueva ubicación pendiente
- [ ] `@/app/servicios/google/googleSlides.ts` → Nueva ubicación pendiente
- [ ] `@/app/servicios/google/googlePlaces.ts` → Nueva ubicación pendiente
- [ ] `@/app/servicios/google/api.ts` → Nueva ubicación pendiente
- [ ] `@/app/servicios/google/types.ts` → Nueva ubicación pendiente

### Servicios de Excel
- [ ] `@/app/servicios/excel-to-sheets/excel-to-sheets-service.ts` → Nueva ubicación pendiente
- [ ] `@/app/servicios/excel-to-slides/excel-to-slides-service.ts` → Nueva ubicación pendiente

## Archivos a Eliminar
- [x] `src/app/lib/supabase/supabase-service.ts` ✅
  - Reemplazado por los nuevos servicios en `src/lib/supabase/services/`
  - ✅ Verificado: no hay importaciones activas

- [x] `src/types/supabase.ts` y `src/types/supabase.d.ts` ✅
  - Reemplazados por los nuevos tipos en `src/lib/supabase/types/`
  - ✅ Verificado: no hay importaciones activas

- [x] `src/types/supabase copy.ts` ✅
  - Archivo de respaldo eliminado

## Importaciones a Actualizar Directamente

### Archivos de API
- [x] `src/app/api/asociaciones/route.ts` ✅
  ```typescript
  // De:
  import { authOptions } from '@/app/api/auth/[...nextauth]/options';
  // A:
  import { authOptions } from '@/app/api/auth/[...nextauth]/options';
  ```
  ✅ Resuelto: Corregida la importación de authOptions

- [x] `src/app/api/auth/supabase/route.ts` ✅
  ```typescript
  // Importación corregida:
  import { supabase, authService } from '@/lib/supabase';
  ```
  ✅ Resuelto:
  - Verificado que authService está correctamente exportado
  - Removida importación no utilizada de obtenerUsuarioPorAuthId

### Archivos de Documentación
- [x] `src/lib/supabase/PREGUNTAS-FRECUENTES.md` ✅
  - Actualizado para reflejar la nueva estructura
  - Eliminada referencia a redirectores
  - Corregidos ejemplos de código

- [x] `src/lib/supabase/MEJORES-PRACTICAS.md` ✅
  - Actualizado para reflejar la nueva estructura
  - Corregidos nombres de métodos
  - Actualizados ejemplos de código

### Referencias Antiguas Encontradas

1. En archivos de código:
- [ ] `src/app/api/auth/supabase/route.ts` - Error de exportación de authService
- [ ] `src/app/api/auth/sync/route.ts` - Error de exportación de authService
- [ ] `src/app/api/supabase/sync/associations/route.ts` - Error de exportación de syncService

2. En archivos de documentación (ejemplos, no requieren cambios):
- ✅ `src/lib/supabase/PREGUNTAS-FRECUENTES.md` - Referencias en ejemplos de migración
- ✅ `src/lib/supabase/MEJORES-PRACTICAS.md` - Referencias en ejemplos de qué evitar
- ✅ `src/lib/supabase/PLAN-LIMPIEZA.md` - Referencias en documentación de migración

3. En archivos de verificación (no requieren cambios):
- ✅ `src/lib/supabase/scripts/check-redirectors.ps1`
- ✅ `src/lib/supabase/RESULTADOS-VERIFICACION.md`

### Plan de Actualización
1. [x] Actualizar importaciones en archivos de API primero
2. [x] Actualizar archivos de documentación
3. [x] Verificar que no quedan referencias a la ruta antigua
   - ⚠️ Se encontraron errores de exportación que necesitan ser corregidos
4. [x] Resolver errores de exportación encontrados

### Próximos Pasos
1. [ ] Corregir errores de exportación en:
   - [ ] authService en archivos de autenticación
   - [ ] syncService en archivo de sincronización
2. [ ] Verificar nuevamente que no quedan referencias después de las correcciones

## Plan de Migración

### Fase 1: Preparación
1. ✅ Identificar todos los archivos que necesitan migración
2. ✅ Crear lista detallada de cambios necesarios
3. [ ] Crear nuevas ubicaciones para servicios de Google y Excel

### Fase 2: Migración de Servicios
1. [x] Migrar servicios de Supabase
2. [ ] Migrar servicios de Google (en progreso por el usuario)
3. [ ] Migrar servicios de Excel

### Fase 3: Actualización de Importaciones
1. [ ] Actualizar archivos de documentación
2. [ ] Actualizar archivos de API
3. [ ] Actualizar componentes y páginas

### Fase 4: Limpieza
1. [x] Verificar que no quedan importaciones antiguas
2. [x] Eliminar archivos obsoletos
3. [ ] Actualizar documentación

## Notas Importantes
- ⚠️ Mantener compatibilidad durante la migración
- 🔄 Hacer commits pequeños y específicos
- ✅ Probar después de cada cambio
- 📝 Documentar problemas encontrados
- 🚫 No eliminar archivos hasta verificar que no hay dependencias 