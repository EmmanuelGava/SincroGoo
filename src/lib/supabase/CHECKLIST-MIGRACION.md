# Checklist de Migración a Nueva Estructura Supabase

## Bibliotecas principales

- [ ] `src/lib/supabase/client.ts` - Cliente centralizado
- [ ] `src/lib/supabase/index.ts` - Punto de entrada unificado
- [ ] `src/lib/supabase/types/` - Definiciones de tipos
- [ ] `src/lib/supabase/services/` - Servicios por dominio
- [ ] `src/lib/supabase/utils/` - Utilidades comunes

## Servicios

- [ ] **AuthService** (`services/auth.ts`)
  - [ ] signUp
  - [ ] signIn
  - [ ] signOut
  - [ ] getUserProfile
  - [ ] updateUserProfile
  - [ ] getUserByEmail
  - [ ] isAuthenticated

- [ ] **ProjectsService** (`services/projects.ts`)
  - [ ] getProjects
  - [ ] getProjectById
  - [ ] createProject
  - [ ] updateProject
  - [ ] deleteProject
  - [ ] getProjectsByUserId

- [ ] **SheetsService** (`services/sheets.ts`)
  - [ ] getSheets
  - [ ] getSheetById
  - [ ] createSheet
  - [ ] updateSheet
  - [ ] deleteSheet
  - [ ] getSheetsByProjectId
  - [ ] getCellsBySheetId

- [ ] **SlidesService** (`services/slides.ts`)
  - [ ] getSlides
  - [ ] getSlideById
  - [ ] createSlide
  - [ ] updateSlide
  - [ ] deleteSlide
  - [ ] getSlidesByProjectId
  - [ ] getElementsBySlideId

- [ ] **SyncService** (`services/sync.ts`)
  - [ ] syncProject
  - [ ] syncElements
  - [ ] syncAssociations
  - [ ] initDatabase

## API Endpoints

- [ ] `/api/supabase/auth`
- [ ] `/api/supabase/projects`
- [ ] `/api/supabase/sheets`
- [ ] `/api/supabase/slides`
- [ ] `/api/supabase/sync`

## Componentes

- [ ] **EncabezadoSistema** - Usar `AuthService` para sesión
- [ ] **ListaProyectos** - Usar `ProjectsService` para listar
- [ ] **EditorContext** - Usar nuevos servicios para gestión
- [ ] **TablaHojas** - Usar `SheetsService` para datos
- [ ] **BotonSincronizar** - Usar `SyncService` para sincronización
- [ ] **BotonGuardarElementos** - Usar `SlidesService` y `SyncService`

## Páginas

- [ ] `/dashboard`
- [ ] `/proyectos`
- [ ] `/editor-proyectos`
- [ ] `/auth/login`
- [ ] `/auth/registro`

## Correcciones Específicas

- [ ] Resolver errores del redirector temporal
- [ ] Unificar exportaciones en index.ts
- [ ] Corregir rutas de importación en componentes
- [ ] Verificar tipos Database en client.ts
- [ ] Completar todos los métodos de AuthService

## Pruebas

- [ ] Autenticación
  - [ ] Login funciona correctamente
  - [ ] Registro crea usuario
  - [ ] Logout cierra sesión

- [ ] Proyectos
  - [ ] Listar proyectos funciona
  - [ ] Crear proyecto funciona
  - [ ] Actualizar proyecto funciona

- [ ] Hojas
  - [ ] Cargar hojas de un proyecto
  - [ ] Crear nueva hoja
  - [ ] Editar celdas

- [ ] Presentaciones
  - [ ] Cargar presentaciones
  - [ ] Editar elementos
  - [ ] Asociar elementos con celdas

- [ ] Sincronización
  - [ ] Sincronizar elementos funciona
  - [ ] Actualizar datos en tiempo real

## Limpieza final

- [ ] Eliminar código antiguo de `src/app/servicios/supabase/`
- [ ] Eliminar código antiguo de `src/app/lib/supabase/`
- [ ] Eliminar redirector temporal
- [ ] Verificar que no queden importaciones antiguas
- [ ] Actualizar documentación con nueva estructura 