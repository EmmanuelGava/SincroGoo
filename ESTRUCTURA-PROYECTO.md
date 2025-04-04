# Estructura del Proyecto SincroGoo

## Estructura General del Proyecto

### Directorios Principales
```
/src                    - Código fuente principal de la aplicación
/cypress                - Tests de integración y end-to-end
/public                 - Archivos estáticos (imágenes, fonts, etc.)
/.next                  - Build de Next.js (generado automáticamente)
/sql                    - Scripts SQL y migraciones
/.vscode                - Configuración específica de VS Code
/node_modules          - Dependencias del proyecto (generado automáticamente)
```

### Archivos de Configuración
```
tsconfig.json           - Configuración de TypeScript
next.config.js         - Configuración de Next.js
tailwind.config.js     - Configuración de Tailwind CSS
postcss.config.mjs     - Configuración de PostCSS
.env.*                 - Variables de entorno para diferentes ambientes
package.json           - Dependencias y scripts del proyecto
.eslintrc.json         - Configuración de ESLint
components.json        - Configuración de componentes
```

## Estructura Detallada del Código Fuente (/src)

### 1. Tipos y Definiciones (/src/types)
- `diapositivas.ts` - Tipos para presentaciones y diapositivas
- `servicios.ts` - Tipos para servicios y respuestas API
- `auth.ts` - Tipos relacionados con autenticación
- `google.ts` - Tipos para servicios de Google

### 2. Servicios (/src/app/servicios)
#### Google Services (/google)
- `BaseGoogleService.ts` - Clase base para servicios de Google
- `googleSlides.ts` - Servicio para Google Slides
  - Gestión de presentaciones
  - Manipulación de diapositivas
  - Caché de vistas previas
- `googleSheets.ts` - Servicio para Google Sheets
  - Manipulación de hojas de cálculo
  - Sincronización de datos
- `/operations/`
  - `SlidesOperations.ts` - Operaciones específicas de Slides
  - `SheetsOperations.ts` - Operaciones específicas de Sheets
  - `formatters/` - Formateadores para diferentes tipos de contenido

### 3. Componentes (/src/app/componentes)
- `/auth/` - Componentes de autenticación
- `/common/` - Componentes reutilizables
- `/layout/` - Componentes de estructura
- `/forms/` - Componentes de formularios
- `/tables/` - Componentes de tablas
- `/modals/` - Componentes de modales
- `/buttons/` - Componentes de botones
- `/loading/` - Componentes de carga

### 4. Páginas y Rutas (/src/app)
- `/auth` - Sistema de autenticación
  - `login/` - Página de inicio de sesión
  - `register/` - Página de registro
  - `callback/` - Manejo de callbacks OAuth

- `/dashboard` - Panel principal
  - `page.tsx` - Vista principal del dashboard
  - `layout.tsx` - Layout del dashboard
  - `loading.tsx` - Estado de carga

- `/editor-proyectos` - Editor de proyectos
  - `page.tsx` - Editor principal
  - `components/` - Componentes específicos del editor

- `/excel-to-slides` - Conversión de Excel a Slides
  - `page.tsx` - Interfaz de conversión
  - `service/` - Lógica de conversión

- `/sheets-to-pdf` - Conversión de Sheets a PDF
  - `page.tsx` - Interfaz de conversión
  - `service/` - Lógica de conversión

- `/sheets-to-slides` - Conversión de Sheets a Slides
  - `page.tsx` - Interfaz de conversión
  - `service/` - Lógica de conversión

- `/excel-to-sheets` - Conversión de Excel a Sheets
  - `page.tsx` - Interfaz de conversión
  - `service/` - Lógica de conversión

### 5. Librerías y Utilidades (/src/lib)
- `cache-service.ts` - Servicio de caché
- `rate-limiter.ts` - Control de límites de peticiones
- `auth.ts` - Utilidades de autenticación
- `api.ts` - Utilidades para llamadas API
- `utils/` - Funciones utilitarias generales

### 6. API Routes (/src/app/api)
- `/auth/` - Endpoints de autenticación
- `/google/` - Endpoints para servicios de Google
- `/projects/` - Endpoints para gestión de proyectos
- `/conversions/` - Endpoints para conversiones

### 7. Hooks Personalizados (/src/app/hooks)
- `useAuth.ts` - Hook para autenticación
- `useGoogle.ts` - Hook para servicios de Google
- `useCache.ts` - Hook para manejo de caché
- `useRateLimit.ts` - Hook para límites de peticiones

### 8. Estilos (/src/app/styles)
- `globals.css` - Estilos globales
- `theme.tsx` - Configuración del tema
- `components/` - Estilos específicos de componentes

### 9. Tests (/cypress)
- `e2e/` - Tests end-to-end
- `integration/` - Tests de integración
- `fixtures/` - Datos de prueba

## Archivos de Documentación
```
README.md                    - Documentación principal del proyecto
GUIA-REESTRUCTURACION.md    - Guía para la reestructuración del código
AUTENTICACION-NEXTAUTH.md   - Documentación de autenticación
ARCHIVOS-PARA-MIGRACION.md  - Guía de migración de archivos
PROXIMOS-PASOS-MARTES.md    - Planificación de tareas
```

## Variables de Entorno
```
.env.development    - Variables para desarrollo
.env.production     - Variables para producción
.env.local         - Variables locales (no versionadas)
```

## Notas Importantes

### Servicios Duplicados
Se han identificado algunos servicios con funcionalidad similar que podrían consolidarse:
1. Los servicios de conversión (excel-to-slides, sheets-to-pdf, etc.) comparten lógica similar
2. Existen múltiples implementaciones de caché que podrían unificarse
3. Las operaciones de Google Services podrían consolidarse mejor

### Mejoras Propuestas y Timeline de Implementación

#### Mejoras Post-Migración (Prioridad Alta - A implementar después de la migración actual)
1. **Unificar los servicios de conversión en un único servicio modular**
   - Crear estructura base en `/src/app/servicios/conversiones/`
   - Implementar adaptadores para Excel, Sheets, Slides y PDF
   - Migrar la lógica existente al nuevo sistema modular
   ```typescript
   /src/app/servicios/conversiones/
     - ConversionService.ts
     - adaptadores/
       - ExcelAdapter.ts
       - SheetsAdapter.ts
       - SlidesAdapter.ts
       - PDFAdapter.ts
   ```

2. **Implementar un sistema de caché centralizado**
   - Crear servicio central de caché
   - Migrar implementaciones existentes al nuevo sistema
   - Implementar diferentes estrategias de caché según necesidad
   ```typescript
   /src/lib/cache/
     - CacheService.ts
     - providers/
     - strategies/
   ```

3. **Sistema robusto de manejo de errores y logging**
   - Implementar sistema centralizado de logging
   - Crear manejadores de errores específicos
   - Mejorar el reporte y tracking de errores
   ```typescript
   /src/lib/error-handling/
     - ErrorLogger.ts
     - ErrorReporter.ts
     - tipos/
   ```

#### Mejoras Inmediatas (Durante la migración actual)
4. **Mejorar la organización de los tipos y interfaces**
   - Continuar con la consolidación de tipos
   - Mantener la estructura actual pero mejorar la documentación

5. **Consolidar las operaciones de Google Services**
   - Mantener la estructura actual durante la migración
   - Documentar mejor las operaciones existentes
   - Identificar y eliminar duplicaciones menores que no requieran cambios estructurales

### Nota sobre la Implementación
Las mejoras 1, 2 y 3 requieren cambios estructurales significativos y se implementarán DESPUÉS de completar la migración actual para evitar complicaciones y mantener la estabilidad del sistema. Las mejoras 4 y 5 son más seguras de implementar durante la migración actual ya que no requieren cambios arquitectónicos mayores.

### Próximos Pasos Inmediatos
1. Completar la migración actual
2. Documentar los puntos de mejora identificados
3. Mantener un registro de las duplicaciones encontradas
4. Planificar la implementación post-migración de las mejoras principales 