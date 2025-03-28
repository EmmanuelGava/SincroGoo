/**
 * Archivo índice para centralizar todas las exportaciones relacionadas con Supabase
 * 
 * Este archivo exporta todos los clientes y servicios de Supabase para facilitar
 * las importaciones en otros archivos del proyecto.
 */

// Importar primero para poder usarlos en las funciones
import { supabase, supabaseAdmin, authService } from './auth-service';
import { getSupabaseClient } from './conexion';
import { SupabaseService } from './supabase-service';

// Re-exportar todo para que esté disponible desde @/servicios/supabase
export { supabase, supabaseAdmin, authService } from './auth-service';
export { getSupabaseClient };
export { SupabaseService };
export { ProyectosService } from '../tablas/proyectos-service';
export { SincroGooAPI } from './sincroGooAPI';

/**
 * Función para sincronizar sesión de Supabase (reemplaza a supabase-auth)
 */
export async function syncSupabaseSession(session: any) {
  if (!supabase) {
    console.warn('Cliente Supabase no disponible para sincronizar sesión');
    return null;
  }
  
  try {
    if (session?.supabaseAccessToken) {
      const { error } = await supabase.auth.setSession({
        access_token: session.supabaseAccessToken,
        refresh_token: session.supabaseRefreshToken,
      });
      
      if (error) {
        console.error('Error al sincronizar sesión de Supabase:', error);
        return null;
      }
      
      return supabase;
    }
  } catch (error) {
    console.error('Error al sincronizar sesión de Supabase:', error);
  }
  
  return null;
}

/**
 * Función para obtener cliente autenticado (reemplaza a getAuthenticatedClient)
 */
export async function getAuthenticatedClient(session: any) {
  if (!session?.supabaseAccessToken) {
    console.warn('No hay token de acceso para autenticar cliente Supabase');
    return supabase; // Devolver cliente anónimo o null
  }
  
  return syncSupabaseSession(session);
}

/**
 * Función para eliminar proyecto (reemplaza a deleteProyecto)
 */
export async function deleteProyecto(id: string) {
  if (!supabaseAdmin) {
    console.warn('Cliente Supabase Admin no disponible para eliminar proyecto');
    return { error: 'Cliente Supabase Admin no disponible' };
  }
  
  try {
    const { error } = await supabaseAdmin
      .from('proyectos')
      .delete()
      .eq('id', id);
      
    return { error };
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    return { error };
  }
}
