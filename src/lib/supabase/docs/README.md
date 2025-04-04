# SincroGoo - Documentación de Supabase

## Introducción

Esta documentación describe la estructura, funcionamiento y uso de la capa de servicios de Supabase en SincroGoo. La nueva arquitectura está diseñada para mejorar la mantenibilidad, testabilidad y escalabilidad del código.

## Índice

1. [Arquitectura](./ARCHITECTURE.md)
2. [Servicios](./SERVICES.md)
3. [API](./API.md)
4. [Guía de Migración](./MIGRATION-GUIDE.md)

## Estructura de Archivos

```
src/lib/supabase/
├── client.ts               # Cliente único de Supabase
├── index.ts                # Punto de entrada unificado
├── types.ts                # Definiciones de tipos centralizadas
├── services/               # Servicios por dominio
│   ├── auth.ts             # Servicio de autenticación
│   ├── projects.ts         # Servicio de proyectos
│   ├── sheets.ts           # Servicio de hojas de cálculo
│   ├── slides.ts           # Servicio de presentaciones
│   └── sync.ts             # Servicio de sincronización
└── utils/                  # Utilidades
    ├── error-handler.ts    # Manejo de errores
    └── cache.ts            # Utilidades de caché
```

## Cómo Usar

### Importaciones

```typescript
// Importar desde el punto de entrada principal
import { supabase, authService, projectsService } from '@/lib/supabase';

// O importar tipos directamente
import type { User, Project } from '@/lib/supabase';
```

### Ejemplos Básicos

#### Autenticación

```typescript
import { authService } from '@/lib/supabase';

// Iniciar sesión
try {
  const { user, session } = await authService.signIn({
    email: 'usuario@ejemplo.com',
    password: 'contraseña123'
  });
  console.log('Usuario autenticado:', user);
} catch (error) {
  console.error('Error de autenticación:', error);
}
```

#### Proyectos

```typescript
import { projectsService } from '@/lib/supabase';

// Obtener proyectos de un usuario
try {
  const projects = await projectsService.getProjectsByUserId('user-id-123');
  console.log('Proyectos del usuario:', projects);
} catch (error) {
  console.error('Error al obtener proyectos:', error);
}
```

#### Sincronización

```typescript
import { syncService } from '@/lib/supabase';

// Sincronizar elementos
try {
  await syncService.syncElements({
    slideId: 'slide-id-123',
    sheetId: 'sheet-id-456',
    elements: [/* ... */]
  });
  console.log('Elementos sincronizados correctamente');
} catch (error) {
  console.error('Error en sincronización:', error);
}
```

## Pruebas

### Ejecutar Pruebas Unitarias

```bash
npm test
```

### Ejecutar Pruebas de Integración

```bash
npm run cypress:open
```

## Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [NextAuth.js + Supabase](https://next-auth.js.org/adapters/supabase)
- [React Query para la gestión de estado](https://tanstack.com/query/latest) 