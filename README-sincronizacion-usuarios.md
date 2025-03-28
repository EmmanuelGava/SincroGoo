# Sincronización de Usuarios con Supabase

Este documento explica cómo se implementa la sincronización de usuarios entre NextAuth y Supabase en la aplicación Sincrogoo.

## Estructura de la Base de Datos

La aplicación utiliza dos sistemas de autenticación:
1. **NextAuth**: Para la autenticación con Google OAuth
2. **Supabase**: Para almacenar los datos de la aplicación

Para mantener la sincronización entre ambos sistemas, se ha creado una tabla `usuarios` en Supabase que almacena la información de los usuarios autenticados con NextAuth.

## Scripts SQL

Se han creado varios scripts SQL para configurar la base de datos:

1. **sql/verificar_tabla_usuarios.sql**: Verifica si existe la tabla `usuarios` y la crea si no existe.
2. **sql/crear_politicas_rls.sql**: Establece políticas de Row Level Security (RLS) para las tablas de proyectos, slides y sheets.
3. **sql/migrar_proyectos.sql**: Migra los proyectos existentes que usan `userid` (email) a usar `usuario_id` (UUID).

## Servicio de Usuario

Se ha creado un servicio de usuario en `lib/servicios/usuario.ts` que proporciona funciones para sincronizar usuarios entre NextAuth y Supabase:

- `sincronizarUsuario(session)`: Crea o actualiza un usuario en Supabase basado en la sesión de NextAuth.

## Implementación en la Aplicación

La sincronización de usuarios se implementa en varios puntos de la aplicación:

1. **Página de Proyectos** (`app/proyectos/page.tsx`):
   - Al cargar la página, se verifica si el usuario está autenticado con NextAuth.
   - Si está autenticado, se llama a `sincronizarUsuario` para crear o actualizar el usuario en Supabase.
   - Una vez sincronizado, se cargan los proyectos asociados a ese usuario.

2. **Creación de Proyectos** (`app/proyectos/nuevo/page.tsx`):
   - Al crear un nuevo proyecto, se sincroniza el usuario y se usa su ID para asociar el proyecto.

## Pasos para Implementar

1. **Ejecutar los Scripts SQL**:
   - Ejecutar `sql/verificar_tabla_usuarios.sql` para crear la tabla de usuarios.
   - Ejecutar `sql/crear_politicas_rls.sql` para establecer las políticas de seguridad.
   - Ejecutar `sql/migrar_proyectos.sql` para migrar los proyectos existentes.

2. **Verificar la Implementación**:
   - Iniciar sesión en la aplicación con una cuenta de Google.
   - Verificar en Supabase que se ha creado un registro en la tabla `usuarios`.
   - Crear un nuevo proyecto y verificar que se asocia correctamente al usuario.

## Solución de Problemas

Si encuentras problemas con la sincronización de usuarios, verifica lo siguiente:

1. **Tabla de Usuarios**: Asegúrate de que la tabla `usuarios` existe en Supabase y tiene la estructura correcta.
2. **Políticas RLS**: Verifica que las políticas de Row Level Security están correctamente configuradas.
3. **Logs de la Aplicación**: Revisa los logs de la aplicación para identificar posibles errores en la sincronización.

## Estructura de la Tabla de Usuarios

```sql
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    avatar_url TEXT,
    provider TEXT,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Relación con Otras Tablas

La tabla `usuarios` se relaciona con otras tablas de la siguiente manera:

- **proyectos**: La columna `usuario_id` en la tabla `proyectos` hace referencia a `id` en la tabla `usuarios`.
- **historial_cambios**: La columna `usuario_id` en la tabla `historial_cambios` hace referencia a `id` en la tabla `usuarios`. 