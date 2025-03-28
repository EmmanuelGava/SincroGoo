import { Database } from '@/tipos/supabase'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Servicio centralizado para acceder a Supabase
 * Este servicio garantiza que solo exista una instancia de Supabase en toda la aplicación
 * y proporciona métodos estandarizados para todas las operaciones comunes.
 */
export class SupabaseService {
  // Método para obtener una instancia de Supabase
  static async getClient(): Promise<SupabaseClient<Database>> {
    try {
      return supabase;
    } catch (error) {
      console.error('Error al obtener cliente Supabase:', error);
      throw error;
    }
  }
  
  // Método para obtener una instancia autenticada
  static async getAuthClient(): Promise<SupabaseClient<Database>> {
    try {
      return supabaseAdmin;
    } catch (error) {
      console.error('Error al obtener cliente Supabase autenticado:', error);
      throw error;
    }
  }
  
  // Métodos genéricos para operaciones CRUD
  static async select(table: string, query: object = {}, options: { select?: string, order?: { column: string, ascending?: boolean } } = {}): Promise<any> {
    const client = await this.getClient();
    let queryBuilder = client.from(table).select(options.select || '*');
    
    // Aplicar filtros si hay query
    if (Object.keys(query).length > 0) {
      for (const [key, value] of Object.entries(query)) {
        queryBuilder = queryBuilder.eq(key, value);
      }
    }
    
    if (options.order) {
      queryBuilder = queryBuilder.order(options.order.column, { ascending: options.order.ascending ?? true });
    }
    
    return await queryBuilder;
  }
  
  static async insert<T extends { id?: string }>(table: string, data: Omit<T, 'id'>): Promise<{ data: T[] | null, error: any }> {
    try {
      const client = await this.getClient();
      const { data: result, error } = await client
        .from(table)
        .insert(data)
        .select();
      
      return { data: result as T[], error };
    } catch (error) {
      console.error(`Error al insertar en ${table}:`, error);
      return { data: null, error };
    }
  }
  
  static async update(table: string, query: object, data: any): Promise<any> {
    const client = await this.getClient();
    let queryBuilder = client.from(table).update(data);
    
    // Aplicar filtros
    for (const [key, value] of Object.entries(query)) {
      queryBuilder = queryBuilder.eq(key, value);
    }
    
    return await queryBuilder;
  }
  
  static async delete(table: string, query: object): Promise<any> {
    const client = await this.getClient();
    let queryBuilder = client.from(table).delete();
    
    // Aplicar filtros
    for (const [key, value] of Object.entries(query)) {
      queryBuilder = queryBuilder.eq(key, value);
    }
    
    return await queryBuilder;
  }
  
  static async rpc(functionName: string, params: object = {}): Promise<any> {
    const client = await this.getClient();
    return await client.rpc(functionName, params);
  }
  
  // Métodos para autenticación
  static async getSession() {
    const client = await this.getClient();
    return await client.auth.getSession();
  }
  
  static async signOut() {
    const client = await this.getClient();
    return await client.auth.signOut();
  }
  
  // Métodos para storage
  static async uploadFile(bucket: string, path: string, file: File, options: { upsert?: boolean } = {}): Promise<any> {
    const client = await this.getClient();
    return await client.storage.from(bucket).upload(path, file, { upsert: options.upsert ?? false });
  }
  
  // Método corregido para obtener URL pública
  static async getPublicUrl(bucket: string, path: string): Promise<string | null> {
    try {
      const client = await this.getClient();
      const { data } = client.storage.from(bucket).getPublicUrl(path);
      
      if (!data || !data.publicUrl) {
        return null;
      }
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error al obtener URL pública:', error);
      return null;
    }
  }
  
  static async listBuckets() {
    const client = await this.getClient();
    return await client.storage.listBuckets();
  }
  
  static async createBucket(name: string, options: { public: boolean, fileSizeLimit?: number, allowedMimeTypes?: string[] } = { public: false }) {
    const client = await this.getClient();
    return await client.storage.createBucket(name, options);
  }
  
  // Método para verificar la conexión
  static async verificarConexion(): Promise<boolean> {
    try {
      console.log('🔍 [SupabaseService] Verificando conexión...');
      
      const client = await this.getClient();
      
      const { data, error } = await client
        .from('proyectos')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ [SupabaseService] Error de conexión:', error);
        return false;
      }
      
      console.log('✅ [SupabaseService] Conexión verificada');
      return true;
    } catch (error) {
      console.error('❌ [SupabaseService] Error al verificar conexión:', error);
      return false;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Verificar si las claves están disponibles
const areKeysAvailable = supabaseUrl && supabaseAnonKey;
const isServiceKeyAvailable = supabaseUrl && supabaseServiceKey;

// Cliente público para operaciones del lado del cliente
export const supabase = areKeysAvailable 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null as any; // Fallback para evitar errores en desarrollo

// Cliente admin para operaciones del lado del servidor
export const supabaseAdmin = isServiceKeyAvailable
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as any; // Fallback para evitar errores en desarrollo

export const getSupabaseClient = () => {
  return supabase;
}

export const getSupabaseAdminClient = () => {
  return supabaseAdmin
}

// Funciones para manejar proyectos
export const createProyecto = async (data: {
  userid: string
  nombre: string
  descripcion?: string
  slides_id?: string
  sheets_id?: string
  presentaciontitulo?: string
  hojastitulo?: string
}) => {
  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return proyecto
}

export const getProyecto = async (id: string) => {
  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return proyecto
}

export const updateProyecto = async (id: string, data: any) => {
  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return proyecto
}

export const deleteProyecto = async (id: string) => {
  const { error } = await supabase
    .from('proyectos')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const getProyectosByUser = async (userId: string) => {
  const { data: proyectos, error } = await supabase
    .from('proyectos')
    .select('*')
    .eq('userid', userId)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return proyectos
}

// Funciones para manejar usuarios
export const createUsuario = async (data: {
  id: string
  email: string
  nombre: string
  avatar_url?: string | null
}) => {
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return usuario
}

export const getUsuario = async (id: string) => {
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return usuario
}

export const updateUsuario = async (id: string, data: any) => {
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return usuario
}

export const deleteUsuario = async (id: string) => {
  const { error } = await supabase
    .from('usuarios')
    .delete()
    .eq('id', id)

  if (error) throw error
} 