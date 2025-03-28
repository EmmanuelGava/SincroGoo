import { createClient } from '@supabase/supabase-js';

// Definición básica del tipo Database para el cliente de Supabase
export type Database = {
  public: {
    Tables: {
      [key: string]: any;
    };
    Views: {
      [key: string]: any;
    };
    Functions: {
      [key: string]: any;
    };
  };
};

/**
 * Obtiene un cliente de Supabase autenticado
 * @returns Cliente de Supabase
 */
export async function getSupabaseClient() {
  // Crear el cliente una sola vez (singleton)
  if (!getSupabaseClient.instance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    // Verificar si las claves están disponibles
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Faltan variables de entorno para Supabase, usando cliente nulo');
      getSupabaseClient.instance = null as any; // Fallback para evitar errores en desarrollo
    } else {
      console.log('🔍 [Supabase] Creando instancia única del cliente Supabase');
      getSupabaseClient.instance = createClient<Database>(supabaseUrl, supabaseKey);
    }
  }
  
  return getSupabaseClient.instance;
}

// Añadir propiedad instance a la función con el tipo correcto
getSupabaseClient.instance = null as any;

// Crear el cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Agregar logs para depurar
console.log('🔍 [Supabase] Configuración de conexión:');
console.log('🔍 [Supabase] URL:', supabaseUrl ? '✅ Configurada' : '❌ No configurada');
console.log('🔍 [Supabase] API Key:', supabaseAnonKey ? '✅ Configurada' : '❌ No configurada');

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Clase para centralizar las operaciones de Supabase
export class SupabaseService {
  static from(table: string) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [Supabase] Error: Variables de entorno no configuradas');
      throw new Error('Variables de entorno de Supabase no configuradas');
    }
    console.log(`🔄 [Supabase] Accediendo a tabla: ${table}`);
    return supabase.from(table);
  }

  static async insert<T>(table: string, data: T) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [Supabase] Error: Variables de entorno no configuradas');
      throw new Error('Variables de entorno de Supabase no configuradas');
    }
    console.log(`🔄 [Supabase] Insertando en tabla ${table}:`, data);
    const result = await supabase.from(table).insert(data);
    if (result.error) {
      console.error(`❌ [Supabase] Error al insertar en ${table}:`, result.error);
    } else {
      console.log(`✅ [Supabase] Inserción exitosa en ${table}:`, result.data);
    }
    return result;
  }

  static async select<T>(table: string, filter?: Record<string, any>) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [Supabase] Error: Variables de entorno no configuradas');
      throw new Error('Variables de entorno de Supabase no configuradas');
    }
    console.log(`🔄 [Supabase] Seleccionando de tabla ${table}:`, filter);
    let query = supabase.from(table).select();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    const result = await query;
    if (result.error) {
      console.error(`❌ [Supabase] Error al seleccionar de ${table}:`, result.error);
    } else {
      console.log(`✅ [Supabase] Selección exitosa de ${table}:`, result.data);
    }
    return result;
  }

  static async update<T>(table: string, filter: Record<string, any>, data: T) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [Supabase] Error: Variables de entorno no configuradas');
      throw new Error('Variables de entorno de Supabase no configuradas');
    }
    console.log(`🔄 [Supabase] Actualizando en tabla ${table}:`, filter, data);
    let query = supabase.from(table).update(data);
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const result = await query;
    if (result.error) {
      console.error(`❌ [Supabase] Error al actualizar ${table}:`, result.error);
    } else {
      console.log(`✅ [Supabase] Actualización exitosa de ${table}:`, result.data);
    }
    return result;
  }

  static async delete(table: string, filter: Record<string, any>) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [Supabase] Error: Variables de entorno no configuradas');
      throw new Error('Variables de entorno de Supabase no configuradas');
    }
    console.log(`🔄 [Supabase] Eliminando de tabla ${table}:`, filter);
    let query = supabase.from(table).delete();
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const result = await query;
    if (result.error) {
      console.error(`❌ [Supabase] Error al eliminar de ${table}:`, result.error);
    } else {
      console.log(`✅ [Supabase] Eliminación exitosa de ${table}:`, result.data);
    }
    return result;
  }
}
