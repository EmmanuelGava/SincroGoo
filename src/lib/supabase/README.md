# Módulo Supabase

## Descripción

Este módulo proporciona una interfaz unificada para interactuar con Supabase, organizando los servicios por dominio y siguiendo patrones consistentes de diseño y manejo de errores.

## Estructura

```
src/lib/supabase/
├── client.ts               # Cliente único de Supabase
├── index.ts                # Punto de entrada unificado
├── types/                  # Definiciones de tipos
│   ├── auth.ts             # Tipos para autenticación
│   ├── common.ts           # Tipos comunes
│   ├── database.ts         # Tipos de la base de datos
│   ├── index.ts            # Exportaciones de tipos
│   ├── sheets.ts           # Tipos para hojas de cálculo
│   └── slides.ts           # Tipos para presentaciones
├── services/               # Servicios por dominio
│   ├── auth.ts             # Servicio de autenticación
│   ├── projects.ts         # Servicio de proyectos
│   ├── sheets.ts           # Servicio de hojas de cálculo
│   ├── slides.ts           # Servicio de presentaciones
│   └── sync.ts             # Servicio de sincronización
└── utils/                  # Utilidades
    ├── error-handler.ts    # Manejo de errores
    ├── cache.ts            # Utilidades de caché
    └── queries.ts          # Helpers para consultas
```

## Cliente Supabase

El cliente de Supabase se implementa siguiendo el patrón Singleton para garantizar que solo exista una instancia en toda la aplicación:

```typescript
import { supabase } from '@/lib/supabase';

// Usar el cliente directamente
const { data, error } = await supabase.from('proyectos').select('*');
```

También se proporciona una función para obtener un cliente con un token personalizado:

```typescript
import { getSupabaseClient } from '@/lib/supabase';

// Cliente con token personalizado
const client = getSupabaseClient(token);
```

## Servicios

### AuthService

Maneja la autenticación y gestión de usuarios:

```typescript
import { authService } from '@/lib/supabase';

// Iniciar sesión
const result = await authService.signIn({ email, password });

// Cerrar sesión
await authService.signOut();

// Obtener perfil de usuario
const profile = await authService.getUserProfile(token);
```

### ProjectsService

Gestiona los proyectos:

```typescript
import { projectsService } from '@/lib/supabase';

// Obtener todos los proyectos
const projects = await projectsService.getProjects();

// Obtener proyecto por ID
const project = await projectsService.getProjectById(id);

// Crear proyecto
const newProject = await projectsService.createProject({
  nombre: 'Nuevo Proyecto',
  descripcion: 'Descripción del proyecto',
  usuario_id: userId
});
```

### SheetsService

Gestiona las hojas de cálculo:

```typescript
import { sheetsService } from '@/lib/supabase';

// Obtener hojas de un proyecto
const sheets = await sheetsService.getSheetsByProjectId(projectId);

// Obtener celdas de una hoja
const cells = await sheetsService.getCellsBySheetId(sheetId);
```

### SlidesService

Gestiona las presentaciones:

```typescript
import { slidesService } from '@/lib/supabase';

// Obtener diapositivas de un proyecto
const slides = await slidesService.getSlidesByProjectId(projectId);

// Obtener elementos de una diapositiva
const elements = await slidesService.getElementsBySlideId(slideId);
```

### SyncService

Maneja la sincronización entre hojas de cálculo y presentaciones:

```typescript
import { syncService } from '@/lib/supabase';

// Sincronizar elementos asociados
const result = await syncService.syncElements({
  slideId,
  sheetId,
  elements
});
```

## Utilidades

### Manejo de Errores

Proporciona un manejo consistente de errores:

```typescript
import { handleError } from '@/lib/supabase/utils/error-handler';

try {
  // Código que puede generar errores
} catch (error) {
  return handleError('Descripción del error', error);
}
```

### Caché

Utilidades para caché de datos frecuentes:

```typescript
import { cacheManager } from '@/lib/supabase/utils/cache';

// Guardar en caché
await cacheManager.set('key', data, expirationInSeconds);

// Obtener de caché
const data = await cacheManager.get('key');
```

### Queries

Helpers para consultas comunes:

```typescript
import { transaction, paginate } from '@/lib/supabase/utils/queries';

// Ejecutar transacción
const result = await transaction(async (client) => {
  // Operaciones dentro de la transacción
});

// Paginación
const { data, pagination } = await paginate({
  query: supabase.from('proyectos').select('*'),
  page: 1,
  pageSize: 10
});
```

## Tipos

Los tipos se organizan por dominio para facilitar su uso:

```typescript
import type { User, UserProfile } from '@/lib/supabase/types/auth';
import type { Project } from '@/lib/supabase/types/projects';
import type { Sheet, Cell } from '@/lib/supabase/types/sheets';
import type { Slide, Element } from '@/lib/supabase/types/slides';
```

También se pueden importar directamente desde el punto de entrada:

```typescript
import type { User, Project, Sheet, Slide } from '@/lib/supabase';
```

## Migración desde la Estructura Antigua

Si estás migrando desde la estructura antigua, consulta:

- [Plan de Limpieza](PLAN-LIMPIEZA.md)
- [Checklist de Migración](CHECKLIST-MIGRACION.md)
- [Comandos Útiles](COMANDOS-MIGRACION.md)
- [Preguntas Frecuentes](PREGUNTAS-FRECUENTES.md)

## Contribución

Al contribuir a este módulo:

1. Mantén la organización por dominio
2. Sigue los patrones establecidos
3. Documenta adecuadamente los nuevos servicios
4. Incluye manejo de errores consistente
5. Actualiza los tipos cuando sea necesario 