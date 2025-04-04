import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../tipos/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Verificar si las claves están disponibles
const areKeysAvailable = supabaseUrl && supabaseAnonKey;
const isServiceKeyAvailable = supabaseUrl && supabaseServiceKey;

// Implementación de patrón singleton para clientes de Supabase
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
let supabaseAdminInstance: ReturnType<typeof createClient<Database>> | null = null;

// Cliente público para operaciones del usuario
export function createSupabaseClient() {
  if (!supabaseInstance && areKeysAvailable) {
    console.log('🔄 [Supabase] Creando instancia única del cliente Supabase');
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Cliente con rol de servicio para operaciones administrativas
export function createSupabaseAdminClient() {
  if (!supabaseAdminInstance && isServiceKeyAvailable) {
    console.log('🔄 [Supabase] Creando instancia única del cliente Supabase Admin');
    supabaseAdminInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdminInstance;
}

// Exportar los clientes
export const supabase = createSupabaseClient() || (null as any);
export const supabaseAdmin = createSupabaseAdminClient() || (null as any); 