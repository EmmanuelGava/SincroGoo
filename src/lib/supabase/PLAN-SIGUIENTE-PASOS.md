# Próximos Pasos para Completar la Fase 4

## Resultados de la Etapa Actual

Hemos finalizado una parte importante de la Fase 4, que incluye:

1. ✅ **Corrección de `src/lib/supabase/index.ts`** para que exporte correctamente `authService` y elimine importaciones inexistentes.
2. ✅ **Mejora del script de verificación** `check-redirectors.ps1` para detectar correctamente archivos con referencias antiguas.
3. ✅ **Análisis de código pendiente de migración** que ha identificado 35 archivos que aún contienen referencias a los redirectors.
4. ✅ **Verificación de archivo de prueba** `src/app/api/auth/sync/route.ts` con redirector temporal.
5. ✅ **Migración de componente crítico** `src/app/editor-proyectos/contexto/EditorContext.tsx`.

## Tareas Inmediatas (1-2 días)

1. **Migración de Componentes Críticos**:
   - [x] `src/app/editor-proyectos/contexto/EditorContext.tsx` (prioridad alta)
   - [ ] `src/app/editor-proyectos/componentes/slides/BotonGuardarElementos.tsx`
   - [ ] `src/app/proyectos/[id]/page.tsx`
   - [ ] `src/app/sincronizar/page.tsx`

2. **Desarrollo de Pruebas Unitarias**:
   - [ ] Completar pruebas para `authService` siguiendo el modelo existente
   - [ ] Agregar pruebas para `projectsService`
   - [ ] Implementar pruebas básicas para `sheetsService` y `slidesService`

3. **Documentación**:
   - [ ] Finalizar documentación API para todos los servicios
   - [ ] Añadir ejemplos prácticos en la documentación

## Tareas a Medio Plazo (3-5 días)

1. **Migración de API Routes**:
   - [ ] API de proyectos (4 archivos)
   - [ ] API de sheets y slides (6 archivos)
   - [ ] API de elementos y asociaciones (5 archivos) 
   - [ ] API de autenticación (2 archivos)
   - [ ] API de thumbnails (3 archivos)

2. **Pruebas de Integración**:
   - [ ] Implementar pruebas Cypress para flujos principales
   - [ ] Verificar autenticación y gestión de sesiones
   - [ ] Probar CRUD de proyectos, hojas y presentaciones
   - [ ] Validar sincronización entre hojas y presentaciones

## Tareas Finales (1-2 días)

1. **Eliminación de Redirectors**:
   - [ ] Verificar nuevamente con `check-redirectors.ps1` que no hay más referencias
   - [ ] Eliminar `src/app/servicios/supabase/globales/tipos.ts`
   - [ ] Eliminar `src/app/servicios/supabase/globales/conexion.ts`
   - [ ] Eliminar `src/app/servicios/supabase/redirector.ts`
   - [ ] Eliminar `src/app/lib/import-redirector.ts`
   - [ ] Eliminar `src/app/lib/supabase/index.ts`

2. **Verificación Final**:
   - [ ] Ejecutar `npx tsc --noEmit` para confirmar que no hay errores de tipos
   - [ ] Probar la aplicación completa en entorno de desarrollo
   - [ ] Verificar proceso de build para producción

## Estrategia para las Próximas 24 horas

1. **Enfoque de hoy**:
   - ✅ Migración de `EditorContext.tsx` (componente más crítico)
   - [ ] Migrar `BotonGuardarElementos.tsx`
   - [ ] Completar al menos 2 pruebas unitarias

2. **Estrategia para mañana**:
   - [ ] Migrar los 2 componentes restantes
   - [ ] Iniciar migración de las API routes de proyectos
   - [ ] Actualizar plan según el progreso

## Notas Adicionales

- Los errores de tipos en módulos de node como `@auth/core` y `next` no están relacionados con nuestra migración y pueden ignorarse.
- Para archivos que presentan dificultades de migración, considerar el uso temporal del redirector como solución intermedia.
- Mantener registro detallado de cada archivo migrado en `REGISTRO-IMPLEMENTACION.md`. 