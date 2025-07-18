import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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
 * Obtiene un cliente de Supabase con autenticación del lado del servidor
 * @param requireAuth Si es true, verifica que exista una sesión válida
 * @returns Cliente de Supabase y sesión (si requireAuth es true)
 */
export async function getSupabaseClient(requireAuth = false) {
  if (isClient) {
    throw new Error('Esta función solo debe ser llamada desde el servidor');
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  if (requireAuth) {
    const session = await getServerSession(authOptions);
    if (!session?.supabaseToken) {
      throw new Error('No hay sesión de Supabase válida');
    }

    // Usar el token de Supabase para autenticar las peticiones
    const { data: { session: supabaseSession }, error } = await supabase.auth.setSession({
      access_token: session.supabaseToken,
      refresh_token: session.supabaseRefreshToken || '',
    });

    if (error) {
      console.error('❌ [Supabase Client] Error al establecer la sesión con setSession:', error);
      throw new Error('Error al establecer la sesión de Supabase');
    }
    
    if (!supabaseSession) {
      console.error('❌ [Supabase Client] setSession no devolvió una sesión válida.');
      throw new Error('Error al establecer la sesión de Supabase');
    }

    return { supabase, session: supabaseSession };
  }

  return { supabase };
}

/**
 * Obtiene un cliente de Supabase con privilegios administrativos
 * @returns Cliente de Supabase con privilegios administrativos
 * @throws Error si se llama desde el cliente
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (isClient) {
    throw new Error('getSupabaseAdmin() no debe ser llamado desde el cliente');
  }
  return createClient(
    supabaseConfig.url,
    supabaseConfig.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
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