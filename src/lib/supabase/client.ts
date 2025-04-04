import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types/database';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';

// Detectar si estamos en el cliente o en el servidor
const isClient = typeof window !== 'undefined';
const isServer = !isClient;

// Verificación de variables de entorno (remover después)
console.log('🔍 [Supabase] Verificando variables:');
console.log('   URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Presente' : '❌ Ausente');
console.log('   ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `✅ Presente (longitud: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length})` : '❌ Ausente');
console.log('   SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Presente' : '❌ Ausente');
console.log('   ENTORNO:', isClient ? '🌐 Cliente' : '🖥️ Servidor');

// Configuración de Supabase
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: isServer ? process.env.SUPABASE_SERVICE_ROLE_KEY || '' : '' // Solo usar en servidor
};

// Cliente público para operaciones anónimas
export const supabase = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey
);

// Cliente con privilegios administrativos para operaciones del lado del servidor
// Solo crear si estamos en el servidor
export const supabaseAdmin = isServer
  ? createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.serviceRoleKey
    )
  : null as unknown as SupabaseClient<Database>; // Tipo forzado para compatibilidad

/**
 * Obtiene un cliente de Supabase con el token de acceso de NextAuth
 * @param accessToken Token de acceso opcional (si no se proporciona, se intentará usar la sesión de NextAuth)
 * @returns Cliente de Supabase para operaciones de base de datos
 * 
 * Esta función ya no gestiona la autenticación con Supabase directamente,
 * sino que utiliza las sesiones y tokens de NextAuth.
 */
export function getSupabaseClient(accessToken?: string): SupabaseClient<Database> {
  if (!accessToken) {
    // En uso de cliente, simplemente devolvemos el cliente anónimo
    // El acceso a datos estará restringido por RLS en Supabase
    return supabase;
  }
  
  // Si se proporciona un token, lo usamos para autenticar las peticiones
  return createClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
}

/**
 * Obtiene un cliente de Supabase con privilegios administrativos
 * @returns Cliente de Supabase con privilegios administrativos
 * @throws Error si se llama desde el cliente
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (isClient) {
    console.error('⚠️ [Supabase] getSupabaseAdmin() no debe ser llamado desde el cliente');
    throw new Error('getSupabaseAdmin() no debe ser llamado desde el cliente');
  }
  return supabaseAdmin;
}

// Crear una única instancia del cliente Supabase
export const supabaseSingleton = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export default supabase; 