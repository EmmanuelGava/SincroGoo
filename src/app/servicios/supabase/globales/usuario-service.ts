import { SupabaseService } from "@/servicios/supabase/globales/supabase-service";
import { Session } from "next-auth";

export interface UsuarioSupabase {
  id: string;
  auth_id?: string;
  email: string;
  nombre: string;
  avatar_url?: string;
  provider?: string;
  ultimo_acceso?: string;
}

interface UsuarioBaseDatos {
  id: string;
  auth_id: string | null;
  email: string;
  nombre: string;
  avatar_url: string | null;
  provider: string | null;
  ultimo_acceso: string | null;
}

// Extender el tipo User de NextAuth para incluir id opcional
declare module "next-auth" {
  interface User {
    id?: string;
    auth_id?: string;
    email?: string;
    nombre?: string;
    avatar_url?: string;
    provider?: string;
    ultimo_acceso?: string;
  }
}

/**
 * Crea o actualiza un usuario en Supabase basado en la sesión de NextAuth
 */
export async function sincronizarUsuario(session: Session | null): Promise<UsuarioSupabase | null> {
  if (!session?.user?.email) {
    console.log("No hay sesión de usuario para sincronizar");
    return null;
  }

  try {
    console.log("Sincronizando usuario con Supabase:", session.user.email);
    console.log("Datos de sesión completos:", {
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      expires: session.expires
    });
    
    // Primero, buscar si el usuario ya existe por email
    const { data: usuarioExistente, error: errorBusqueda } = await SupabaseService.select(
      'usuarios',
      { email: session.user.email },
      { select: '*' }
    );

    console.log("Resultado de búsqueda de usuario por email:", { 
      encontrado: usuarioExistente && usuarioExistente.length > 0,
      usuarioExistente: usuarioExistente?.[0], 
      errorBusqueda 
    });

    if (errorBusqueda && errorBusqueda.code !== 'PGRST116') {
      console.error("Error al buscar usuario en Supabase:", errorBusqueda);
      return null;
    }

    // Si no encontramos por email, intentar buscar por auth_id si está disponible
    let usuarioFinal = usuarioExistente && usuarioExistente.length > 0 ? usuarioExistente[0] as UsuarioBaseDatos : null;
    
    if (!usuarioFinal && session.user.id) {
      console.log("Intentando buscar usuario por auth_id:", session.user.id);
      
      const { data: usuarioPorAuthId, error: errorBusquedaAuthId } = await SupabaseService.select(
        'usuarios',
        { auth_id: session.user.id },
        { select: '*' }
      );
        
      console.log("Resultado de búsqueda por auth_id:", {
        encontrado: usuarioPorAuthId && usuarioPorAuthId.length > 0,
        usuarioPorAuthId: usuarioPorAuthId?.[0],
        errorBusquedaAuthId
      });
      
      if (!errorBusquedaAuthId && usuarioPorAuthId && usuarioPorAuthId.length > 0) {
        usuarioFinal = usuarioPorAuthId[0] as UsuarioBaseDatos;
      }
    }

    const datosUsuario = {
      email: session.user.email,
      nombre: session.user.name || 'Usuario',
      avatar_url: session.user.image || null,
      provider: 'google',
      ultimo_acceso: new Date().toISOString(),
      auth_id: session.user.id || null
    };

    let usuarioActualizado: UsuarioSupabase;

    if (!usuarioFinal) {
      console.log("Creando nuevo usuario en Supabase:", datosUsuario);
      const { data: nuevoUsuario, error: errorCreacion } = await SupabaseService.insert<UsuarioBaseDatos>(
        'usuarios',
        datosUsuario
      );

      console.log("Resultado de creación de usuario:", { 
        exito: !!nuevoUsuario && !errorCreacion,
        nuevoUsuario: nuevoUsuario?.[0], 
        errorCreacion 
      });

      if (errorCreacion || !nuevoUsuario || nuevoUsuario.length === 0) {
        console.error("Error al crear usuario en Supabase:", errorCreacion);
        return null;
      }

      const usuarioCreado = nuevoUsuario[0] as UsuarioBaseDatos;
      // Asegurar que el tipo coincida con UsuarioSupabase
      usuarioActualizado = {
        id: usuarioCreado.id,
        auth_id: usuarioCreado.auth_id || undefined,
        email: usuarioCreado.email,
        nombre: usuarioCreado.nombre,
        avatar_url: usuarioCreado.avatar_url || undefined,
        provider: usuarioCreado.provider || undefined,
        ultimo_acceso: usuarioCreado.ultimo_acceso || undefined
      };
      console.log("Usuario creado en Supabase:", usuarioActualizado);
      
      // Verificar que el ID sea un UUID válido
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usuarioActualizado.id)) {
        console.warn("El ID del usuario no parece ser un UUID válido:", usuarioActualizado.id);
      }
    } else {
      console.log("Actualizando usuario existente en Supabase:", {
        id: usuarioFinal.id,
        email: usuarioFinal.email,
        datosActualizados: datosUsuario
      });
      
      const { data: usuarioModificado, error: errorActualizacion } = await SupabaseService.update(
        'usuarios',
        { id: usuarioFinal.id },
        datosUsuario
      );

      console.log("Resultado de actualización de usuario:", { 
        exito: !!usuarioModificado && !errorActualizacion,
        usuarioModificado: usuarioModificado?.[0], 
        errorActualizacion 
      });

      if (errorActualizacion || !usuarioModificado || usuarioModificado.length === 0) {
        console.error("Error al actualizar usuario en Supabase:", errorActualizacion);
        return null;
      }

      const usuarioActualizadoDB = usuarioModificado[0] as UsuarioBaseDatos;
      // Asegurar que el tipo coincida con UsuarioSupabase
      usuarioActualizado = {
        id: usuarioActualizadoDB.id,
        auth_id: usuarioActualizadoDB.auth_id || undefined,
        email: usuarioActualizadoDB.email,
        nombre: usuarioActualizadoDB.nombre,
        avatar_url: usuarioActualizadoDB.avatar_url || undefined,
        provider: usuarioActualizadoDB.provider || undefined,
        ultimo_acceso: usuarioActualizadoDB.ultimo_acceso || undefined
      };
      console.log("Usuario actualizado en Supabase:", usuarioActualizado);
      
      // Verificar que el ID sea un UUID válido
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usuarioActualizado.id)) {
        console.warn("El ID del usuario no parece ser un UUID válido:", usuarioActualizado.id);
      }
    }

    return usuarioActualizado;
  } catch (error) {
    console.error("Error en sincronizarUsuario:", error);
    return null;
  }
} 