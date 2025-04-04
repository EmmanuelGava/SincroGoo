# Plan de Acción para Completar la Reestructuración de Supabase

## Martes: Finalizar estructura básica y tipos

### Parte 1: Completar estructura de tipos
- [x] Crear archivo `src/lib/supabase/types/common.ts` con tipos compartidos
- [x] Crear archivo `src/lib/supabase/types/auth.ts` para tipos de autenticación
- [x] Crear archivo `src/lib/supabase/types/slides.ts` para tipos de diapositivas
- [x] Crear archivo `src/lib/supabase/types/sheets.ts` para tipos de hojas y celdas
- [x] Revisar y actualizar `src/lib/supabase/types/database.ts` si es necesario

### Parte 2: Implementar utilidades pendientes
- [x] Completar `src/lib/supabase/utils/error-handler.ts` con manejo de errores consistente
- [x] Crear `src/lib/supabase/utils/cache.ts` con implementación correcta (sin cacheManager)
- [x] Implementar `src/lib/supabase/utils/queries.ts` para helpers de consultas

### Parte 1: Verificar métodos de servicios
- [x] Revisar e implementar métodos faltantes en `AuthService`
- [x] Revisar e implementar métodos faltantes en `ProjectsService` 
- [x] Revisar e implementar métodos faltantes en `SheetsService`
- [x] Revisar e implementar métodos faltantes en `SlidesService`
- [x] Revisar e implementar métodos faltantes en `SyncService`

### Parte 2: Corregir exportaciones
- [x] Verificar y corregir `src/lib/supabase/index.ts` para exportar correctamente todos los servicios
- [x] Asegurar que no haya ciclos de dependencia entre servicios
- [x] Verificar que el frontend pueda importar correctamente todos los servicios

## Jueves: Implementar endpoints API y limpiar código antiguo

### Parte 1: Completar endpoints API
- [x] Implementar o verificar `/api/supabase/auth`
- [x] Implementar o verificar `/api/supabase/projects`
- [x] Implementar o verificar `/api/supabase/sheets`
- [x] Implementar o verificar `/api/supabase/slides`
- [x] Implementar o verificar `/api/supabase/sync`

### Parte 2: Comenzar limpieza
- [x] Identificar código antiguo que se puede eliminar con seguridad
- [x] Crear una lista de archivos que utilizan redirectores para migración gradual
- [ ] Iniciar migración de importaciones antiguas a nuevas en archivos no críticos

## Viernes: Pruebas y correcciones

### Parte 1: Implementar pruebas básicas
- [ ] Pruebas de autenticación (login, registro, logout)
- [ ] Pruebas de proyectos (crear, listar, actualizar)
- [ ] Pruebas de hojas y presentaciones (crear, editar, asociar)
- [ ] Pruebas de sincronización (tiempo real)

### Parte 2: Corregir errores encontrados
- [ ] Resolver problemas identificados en pruebas
- [ ] Verificar que todos los componentes funcionen con la nueva estructura
- [ ] Actualizar CHECKLIST-MIGRACION.md con progreso

## Siguiente lunes: Finalización de la migración

### Parte 1: Limpieza final
- [ ] Eliminar código antiguo de `src/app/servicios/supabase/`
- [ ] Eliminar código antiguo de `src/app/lib/supabase/`
- [ ] Eliminar redirectores temporales
- [ ] Verificación final de que no quedan importaciones antiguas

### Parte 2: Documentación
- [ ] Actualizar documentación técnica
- [ ] Crear guía de uso para la nueva estructura
- [ ] Documentar APIs y servicios
- [ ] Finalizar REGISTRO-IMPLEMENTACION.md con resumen de cambios

## Prioridades inmediatas para el martes:

1. ~~**ALTA**: Completar estructura de tipos (Common, Auth, Slides, Sheets)~~ ✅
2. **ALTA**: Verificar y corregir exportaciones en index.ts
3. ~~**MEDIA**: Implementar utils/error-handler.ts para manejo consistente de errores~~ ✅
4. ~~**MEDIA**: Revisar métodos faltantes en AuthService (crítico para autenticación)~~ ✅
5. **BAJA**: Comenzar pruebas básicas de autenticación y proyectos

## Recursos necesarios:

- Tener acceso a la documentación de Supabase para referencia
- Revisar código existente para entender dependencias
- Usar herramientas como `grep` o VSCode Search para encontrar importaciones antiguas 