# Servicios de Supabase

Este documento describe los servicios disponibles en la capa de Supabase, sus responsabilidades y métodos.

## Índice de Servicios

1. [Auth Service](#auth-service)
2. [Projects Service](#projects-service)
3. [Sheets Service](#sheets-service)
4. [Slides Service](#slides-service)
5. [Sync Service](#sync-service)

## Auth Service

Gestiona la autenticación y autorización de usuarios.

### Métodos Principales

| Método | Descripción | Parámetros | Retorno |
|--------|-------------|------------|---------|
| `signUp` | Registra un nuevo usuario | `{ email, password }` | `{ user, session }` |
| `signIn` | Inicia sesión de usuario | `{ email, password }` | `{ user, session }` |
| `signOut` | Cierra la sesión actual | - | `void` |
| `resetPassword` | Envía correo de restablecimiento | `email` | `void` |
| `getCurrentUser` | Obtiene el usuario actual | - | `User \| null` |
| `getCurrentSession` | Obtiene la sesión actual | - | `Session \| null` |
| `updateUser` | Actualiza los datos del usuario | `data` | `User` |

### Ejemplo de Uso

```typescript
import { authService } from '@/lib/supabase';

// Iniciar sesión
const { user, session } = await authService.signIn({
  email: 'usuario@ejemplo.com',
  password: 'contraseña123'
});

// Obtener usuario actual
const currentUser = await authService.getCurrentUser();
```

## Projects Service

Gestiona la creación, actualización y consulta de proyectos.

### Métodos Principales

| Método | Descripción | Parámetros | Retorno |
|--------|-------------|------------|---------|
| `getProjects` | Obtiene todos los proyectos | - | `Project[]` |
| `getProjectById` | Obtiene un proyecto por ID | `id` | `Project \| null` |
| `getProjectsByUserId` | Obtiene proyectos de un usuario | `userId` | `Project[]` |
| `createProject` | Crea un nuevo proyecto | `data` | `Project` |
| `updateProject` | Actualiza un proyecto existente | `id, data` | `Project` |
| `deleteProject` | Elimina un proyecto | `id` | `void` |
| `connectSheetToProject` | Vincula una hoja a un proyecto | `projectId, sheetId` | `Project` |
| `connectSlideToProject` | Vincula una presentación a un proyecto | `projectId, slideId` | `Project` |

### Ejemplo de Uso

```typescript
import { projectsService } from '@/lib/supabase';

// Crear un proyecto
const newProject = await projectsService.createProject({
  nombre: 'Mi Proyecto',
  descripcion: 'Descripción del proyecto',
  usuario_id: 'user-123'
});

// Obtener proyectos de un usuario
const userProjects = await projectsService.getProjectsByUserId('user-123');
```

## Sheets Service

Gestiona hojas de cálculo y sus celdas.

### Métodos Principales

| Método | Descripción | Parámetros | Retorno |
|--------|-------------|------------|---------|
| `getSheets` | Obtiene todas las hojas | - | `Sheet[]` |
| `getSheetById` | Obtiene una hoja por ID | `id` | `Sheet \| null` |
| `getSheetsByUserId` | Obtiene hojas de un usuario | `userId` | `Sheet[]` |
| `createSheet` | Crea una nueva hoja | `data` | `Sheet` |
| `updateSheet` | Actualiza una hoja existente | `id, data` | `Sheet` |
| `deleteSheet` | Elimina una hoja | `id` | `void` |
| `getCells` | Obtiene celdas de una hoja | `sheetId` | `Cell[]` |
| `updateCell` | Actualiza una celda | `id, data` | `Cell` |
| `upsertCells` | Inserta o actualiza múltiples celdas | `sheetId, cells` | `string[]` |

### Ejemplo de Uso

```typescript
import { sheetsService } from '@/lib/supabase';

// Crear una hoja
const newSheet = await sheetsService.createSheet({
  nombre: 'Mi Hoja',
  proyecto_id: 'project-123',
  googleId: 'google-sheet-id'
});

// Obtener celdas
const cells = await sheetsService.getCells('sheet-123');
```

## Slides Service

Gestiona presentaciones, diapositivas y elementos.

### Métodos Principales

| Método | Descripción | Parámetros | Retorno |
|--------|-------------|------------|---------|
| `getSlides` | Obtiene todas las presentaciones | - | `Slide[]` |
| `getSlideById` | Obtiene una presentación por ID | `id` | `Slide \| null` |
| `getSlidesByUserId` | Obtiene presentaciones de un usuario | `userId` | `Slide[]` |
| `createSlide` | Crea una nueva presentación | `data` | `Slide` |
| `updateSlide` | Actualiza una presentación existente | `id, data` | `Slide` |
| `deleteSlide` | Elimina una presentación | `id` | `void` |
| `getElements` | Obtiene elementos de una diapositiva | `slideId` | `Element[]` |
| `createElement` | Crea un nuevo elemento | `data` | `Element` |
| `updateElement` | Actualiza un elemento | `id, data` | `Element` |
| `deleteElement` | Elimina un elemento | `id` | `void` |

### Ejemplo de Uso

```typescript
import { slidesService } from '@/lib/supabase';

// Crear una presentación
const newSlide = await slidesService.createSlide({
  nombre: 'Mi Presentación',
  proyecto_id: 'project-123',
  googleId: 'google-presentation-id'
});

// Obtener elementos
const elements = await slidesService.getElements('slide-123');
```

## Sync Service

Gestiona la sincronización entre hojas de cálculo y presentaciones.

### Métodos Principales

| Método | Descripción | Parámetros | Retorno |
|--------|-------------|------------|---------|
| `syncProject` | Sincroniza un proyecto completo | `projectId` | `SyncResult` |
| `syncElements` | Sincroniza elementos con celdas | `{slideId, sheetId, elements}` | `SyncResult` |
| `createAssociation` | Crea una asociación entre elemento y celda | `data` | `Association` |
| `getAssociations` | Obtiene asociaciones existentes | `{slideId, sheetId}` | `Association[]` |
| `updateAssociations` | Actualiza asociaciones existentes | `associations` | `Association[]` |
| `deleteAssociation` | Elimina una asociación | `id` | `void` |

### Ejemplo de Uso

```typescript
import { syncService } from '@/lib/supabase';

// Sincronizar elementos
const result = await syncService.syncElements({
  slideId: 'slide-123',
  sheetId: 'sheet-456',
  elements: [
    {
      id: 'element-1',
      tipo: 'texto',
      contenido: 'Texto sincronizado',
      columnaAsociada: 'A'
    }
  ]
});

// Obtener asociaciones
const associations = await syncService.getAssociations({
  slideId: 'slide-123',
  sheetId: 'sheet-456'
});
```

## Notas Adicionales

### Manejo de Errores

Todos los servicios siguen un patrón consistente para manejar errores:

```typescript
try {
  // Operación que puede fallar
  const result = await service.someMethod();
  return result;
} catch (error) {
  // El error ya contiene información detallada
  console.error('Error:', error);
  // Opcionalmente, mostrar al usuario
  toast.error(`Error: ${error.message}`);
}
```

### Extensibilidad

Si necesitas funcionalidad adicional, puedes extender los servicios:

```typescript
import { projectsService, supabase } from '@/lib/supabase';

// Función personalizada basada en servicios existentes
async function getProjectsWithStats(userId) {
  const projects = await projectsService.getProjectsByUserId(userId);
  
  // Extender con funcionalidad adicional
  return Promise.all(projects.map(async (project) => {
    const { data: stats } = await supabase
      .from('estadisticas')
      .select('*')
      .eq('proyecto_id', project.id)
      .single();
      
    return { ...project, stats };
  }));
} 