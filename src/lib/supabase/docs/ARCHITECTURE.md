# Arquitectura de la Capa Supabase

## Visión General

La arquitectura de Supabase en SincroGoo sigue un diseño por capas con servicios especializados. Esta estructura facilita la separación de responsabilidades, mejora la mantenibilidad y permite realizar pruebas unitarias de forma más efectiva.

## Diagrama de Componentes

```
┌─────────────────────────────────┐
│           UI Layer              │
│  (Componentes React, Páginas)   │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│         Service Layer           │
│ (authService, projectsService)  │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│       Data Access Layer         │
│     (supabase, getClient)       │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│           Supabase              │
│    (Base de datos, Storage)     │
└─────────────────────────────────┘
```

## Capas de la Arquitectura

### 1. Capa de UI (UI Layer)

- **Componentes React y Páginas**: Interfaces de usuario que interactúan con los servicios.
- **Hooks Personalizados**: Para manejar estado y lógica relacionada con los servicios.

### 2. Capa de Servicios (Service Layer)

- **Servicios Especializados**: Encapsulan la lógica de negocio y operaciones relacionadas con entidades específicas.
- **Manejo de Errores**: Procesamiento centralizado de errores y excepciones.
- **Transformación de Datos**: Adaptación de datos entre la UI y la capa de acceso a datos.

### 3. Capa de Acceso a Datos (Data Access Layer)

- **Cliente Supabase**: Cliente unificado para toda la aplicación.
- **Funciones de Utilidad**: Helpers para consultas y transformaciones.
- **Gestión de Caché**: Estrategias para optimizar el rendimiento y reducir peticiones.

### 4. Supabase (Capa Externa)

- **Base de Datos**: Tablas y relaciones en PostgreSQL.
- **Autenticación**: Servicios de gestión de usuarios y sesiones.
- **Storage**: Almacenamiento de archivos y recursos.
- **Funciones Edge**: Procesamiento serverless.

## Principios de Diseño

### 1. Separación de Responsabilidades

Cada servicio se enfoca en un dominio específico (autenticación, proyectos, hojas de cálculo, etc.), lo que facilita:
- Mantenimiento independiente
- Desarrollo paralelo
- Reutilización de código

### 2. Encapsulamiento

Los detalles de implementación de cada capa están ocultos a las capas superiores:
- La UI no conoce cómo se almacenan los datos
- Los servicios no exponen detalles del cliente Supabase
- El cliente Supabase abstrae la API REST/WebSocket

### 3. Consistencia

La arquitectura establece patrones consistentes para:
- Manejo de errores
- Nomenclatura de métodos
- Estructura de datos de retorno
- Validación de entradas

### 4. Testabilidad

El diseño facilita las pruebas:
- Mockeo de servicios
- Pruebas unitarias aisladas
- Pruebas de integración entre capas

## Flujo de Datos

### Ejemplo: Creación de un Proyecto

1. **UI Layer**: El usuario completa un formulario y envía los datos
2. **Service Layer**: `projectsService.createProject(data)` valida y procesa los datos
3. **Data Access Layer**: El cliente Supabase realiza la inserción en la base de datos
4. **Supabase**: Almacena los datos y aplica reglas de seguridad
5. **Data Access Layer**: Recibe la respuesta y maneja posibles errores
6. **Service Layer**: Transforma la respuesta en un formato adecuado para la UI
7. **UI Layer**: Actualiza la interfaz con el resultado

## Estrategia de Migración

La migración a esta arquitectura se ha realizado gradualmente:

1. Implementación de servicios core (auth, proyectos)
2. Creación de redirectors temporales para compatibilidad
3. Migración gradual de componentes a la nueva estructura
4. Eliminación de código antiguo

## Consideraciones Técnicas

### Rendimiento

- Uso eficiente de caché para reducir peticiones
- Suscripciones en tiempo real solo cuando es necesario
- Carga diferida de servicios menos utilizados

### Seguridad

- Políticas RLS en Supabase para control de acceso
- Validación de datos en el servicio antes de enviarlos
- Manejo seguro de tokens y credenciales

### Escalabilidad

- Servicios desacoplados para facilitar cambios
- Estructura preparada para añadir nuevas funcionalidades
- Patrones escalables (como repositorios) 