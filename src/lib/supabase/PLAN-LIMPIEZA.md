# Plan de Limpieza y Validación - Fase 4

## Objetivo

Completar la migración a la nueva estructura `@/lib/supabase`, eliminar código duplicado y asegurar que toda la aplicación utilice la nueva arquitectura.

## Tareas Pendientes

### 1. Corrección de Exportaciones

- **Problema actual**: Errores de exportación en el redirector para `supabaseAdmin`, `getSupabaseClient`, y `getSupabaseAdmin`
- **Solución**: Unificar las exportaciones entre `src/lib/supabase/client.ts` y `src/lib/supabase/index.ts`

### 2. Eliminación de Código Antiguo

#### Archivos y directorios a eliminar (después de la migración completa):

- `src/app/servicios/supabase/` - Servicios antiguos
- `src/app/lib/supabase/` - Cliente antiguo
- `src/app/lib/import-redirector.ts` - Redirector temporal

#### Código a mantener y migrar:

- Migrar cualquier funcionalidad única de la estructura antigua a la nueva
- Verificar que no se pierdan métodos o propiedades importantes

### 3. Actualización de Importaciones

- Buscar y reemplazar todas las importaciones de:
  - `@/app/lib/supabase` → `@/lib/supabase`
  - `@/app/servicios/supabase/*` → `@/lib/supabase/services/*`
  - `@/servicios/supabase/*` → `@/lib/supabase/services/*`

### 4. Validación

#### Puntos de verificación:

- **Autenticación**: Verificar login/logout
- **Proyectos**: Verificar CRUD de proyectos
- **Hojas y Presentaciones**: Verificar sincronización
- **Elementos y Asociaciones**: Verificar funcionamiento del editor

## Plan de Ejecución

### Paso 1: Corrección del Redirector

1. Actualizar `src/lib/supabase/client.ts` para exportar correctamente las funciones e instancias
2. Actualizar `src/lib/supabase/index.ts` para reexportar todo lo necesario
3. Corregir `src/app/lib/import-redirector.ts` para importar desde las ubicaciones correctas

### Paso 2: Pruebas de Integración

1. Verificar cada servicio en una ruta aislada
2. Comprobar que las API funcionen con la nueva estructura
3. Asegurar que los componentes de UI sigan funcionando

### Paso 3: Limpieza Final

1. Eliminar importaciones del redirector
2. Reemplazar con importaciones directas a la nueva estructura
3. Eliminar archivos duplicados
4. Eliminar el redirector

## Estrategia Gradual

Para minimizar riesgos:

1. Implementar los cambios en una rama separada
2. Actualizar un servicio a la vez
3. Probar después de cada actualización
4. Fusionar solo cuando todo funcione correctamente

## Verificación Final

- **Rutas críticas a probar**:
  - Login/Registro
  - Dashboard
  - Creación/Edición de proyectos
  - Sincronización de hojas y presentaciones
  - Asociación de elementos

## Documentación

Después de completar la migración, actualizar:

1. README del proyecto
2. Documentación interna
3. Ejemplos de uso de los nuevos servicios 