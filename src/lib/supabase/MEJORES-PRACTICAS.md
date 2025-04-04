# Mejores Prácticas para la Nueva Estructura Supabase

Este documento proporciona pautas para el uso eficiente y correcto de la nueva estructura de Supabase.

## Importaciones

### ✅ Recomendado

```typescript
// Importar desde el punto de entrada principal
import { supabase, authService, projectsService } from '@/lib/supabase';

// O importar tipos directamente
import type { User, Project } from '@/lib/supabase';
```

### ❌ Evitar

```typescript
// Evitar importaciones directas a archivos internos
import { supabase } from '@/lib/supabase/client';
import { AuthService } from '@/lib/supabase/services/auth';

// Evitar importaciones de la estructura antigua
import { supabase } from '@/app/lib/supabase';
import { ProyectosAPI } from '@/app/servicios/supabase/proyectos/proyectos-service';
```

## Manejo de Errores

### ✅ Recomendado

```typescript
import { handleError } from '@/lib/supabase/utils/error-handler';

try {
  // Operación que puede fallar
  const result = await projectsService.createProject(data);
  return result;
} catch (error) {
  return handleError('Error al crear proyecto', error);
}
```

### ❌ Evitar

```typescript
try {
  // Operación que puede fallar
  const result = await projectsService.createProject(data);
  return result;
} catch (error) {
  // Evitar manejo inconsistente de errores
  console.error('Error:', error);
  return null;
}
```

## Cliente Supabase

### ✅ Recomendado

```typescript
// Usar el singleton para consistencia
import { supabase } from '@/lib/supabase';

// Para operaciones con token personalizado
import { getSupabaseClient } from '@/lib/supabase';
const client = getSupabaseClient(token);
```

### ❌ Evitar

```typescript
// Evitar crear múltiples clientes
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);
```

## Servicios vs Cliente Directo

### ✅ Recomendado

```typescript
// Usar servicios para operaciones comunes
import { projectsService } from '@/lib/supabase';
const projects = await projectsService.listProjects({ usuario_id: userId });

// Usar el cliente directo solo para operaciones personalizadas
import { supabase } from '@/lib/supabase';
const { data } = await supabase
  .from('proyectos')
  .select('id, nombre')
  .eq('usuario_id', userId)
  .order('created_at', { ascending: false });
```

### ❌ Evitar

```typescript
// Evitar duplicar lógica implementada en servicios
import { supabase } from '@/lib/supabase';
const { data: projects } = await supabase
  .from('proyectos')
  .select('*')
  .eq('usuario_id', userId);
```

## Tipos y Interfaces

### ✅ Recomendado

```typescript
// Usar tipos proporcionados
import type { Project, CreateProjectParams } from '@/lib/supabase';

function someFunction(project: Project) {
  // ...
}

// Para parámetros de funciones
const newProject: CreateProjectParams = {
  nombre: 'Nuevo Proyecto',
  descripcion: 'Descripción',
  usuario_id: userId
};
```

### ❌ Evitar

```typescript
// Evitar definir tipos duplicados
interface Proyecto {
  id: string;
  nombre: string;
  // ...
}
```

## Sincronización

### ✅ Recomendado

```typescript
// Usar el servicio de sincronización
import { syncService } from '@/lib/supabase';

// Sincronizar elementos
await syncService.syncElements({
  slideId,
  sheetId,
  elements
});
```

### ❌ Evitar

```typescript
// Evitar implementar lógica de sincronización personalizada
import { supabase } from '@/lib/supabase';

// Operaciones manuales que ya están implementadas en servicios
const { data: elementos } = await supabase
  .from('elementos')
  .select('*')
  .eq('slide_id', slideId);

// Actualizar manualmente...
```

## Caché

### ✅ Recomendado

```typescript
// Usar utilidades de caché para datos frecuentes
import { cacheManager } from '@/lib/supabase/utils/cache';

// Cachear resultados costosos
const keyName = `project_${projectId}`;
let project = await cacheManager.get(keyName);

if (!project) {
  project = await projectsService.getProjectById(projectId);
  await cacheManager.set(keyName, project, 300); // 5 minutos
}
```

### ❌ Evitar

```typescript
// Evitar implementaciones de caché personalizadas
let cachedData = {};

// Implementación manual que puede causar inconsistencias
function getWithCache(id) {
  if (cachedData[id]) return cachedData[id];
  // ...
}
```

## Extensión de Servicios

Si necesitas funcionalidad adicional que no está disponible en los servicios existentes:

### ✅ Recomendado

```typescript
// Extender servicios existentes
import { projectsService, supabase } from '@/lib/supabase';
import { handleError } from '@/lib/supabase/utils/error-handler';

// Nuevo método que respeta los patrones existentes
async function getProjectsWithStats(userId: string) {
  try {
    const projects = await projectsService.getProjectsByUserId(userId);
    
    // Extender con funcionalidad adicional
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const { data: stats } = await supabase
          .from('estadisticas')
          .select('*')
          .eq('proyecto_id', project.id)
          .single();
          
        return { ...project, stats };
      })
    );
    
    return projectsWithStats;
  } catch (error) {
    return handleError('Error al obtener proyectos con estadísticas', error);
  }
}
```

### ❌ Evitar

```typescript
// Evitar implementaciones completamente personalizadas
async function obtenerProyectosConEstadisticas(userId) {
  // Implementación que no sigue los patrones establecidos...
}
```

## Migración Gradual

Si estás migrando código antiguo:

### ✅ Recomendado

```typescript
// Migrar gradualmente componente por componente
// Primero, identifica las importaciones actuales
import { supabase } from '@/app/lib/supabase';
import { ProyectosAPI } from '@/app/servicios/supabase/proyectos/proyectos-service';

// Luego, reemplázalas con las nuevas
import { supabase, projectsService } from '@/lib/supabase';

// Finalmente, adapta las llamadas a métodos
// Antes:
const resultado = await ProyectosAPI.obtenerProyectos();
if (resultado.exito) {
  setProyectos(resultado.datos);
}

// Después:
try {
  const projects = await projectsService.getProjects();
  setProyectos(projects);
} catch (error) {
  console.error('Error al obtener proyectos:', error);
}
```

## Contribuciones a la Nueva Estructura

Si necesitas agregar nuevos servicios o funcionalidades:

1. Sigue el mismo patrón de organización por dominio
2. Mantén la consistencia en el manejo de errores
3. Documenta adecuadamente las nuevas funciones y tipos
4. Actualiza los archivos de índice para exportar las nuevas funcionalidades
5. Escribe pruebas para las nuevas funciones 