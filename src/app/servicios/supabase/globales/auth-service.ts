import { createClient } from '@supabase/supabase-js';
import { Database } from '@/tipos/supabase';
// Importamos getSupabaseClient con un nombre diferente para evitar conflictos
import { getSupabaseClient as getExternalSupabaseClient } from "./conexion";
import { Session as NextAuthSession } from "next-auth";
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Verificar si las claves están disponibles
const areKeysAvailable = supabaseUrl && supabaseAnonKey;
const isServiceKeyAvailable = supabaseUrl && supabaseServiceKey;

// Implementación de patrón singleton para clientes de Supabase
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
let supabaseAdminInstance: ReturnType<typeof createClient<Database>> | null = null;

// Cliente público para operaciones del usuario - con nombre diferente
function createLocalSupabaseClient() {
  if (!supabaseInstance && areKeysAvailable) {
    console.log('🔄 [Supabase] Creando instancia única del cliente Supabase');
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Cliente con rol de servicio para operaciones administrativas
function getSupabaseAdminClient() {
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
export const supabase = createLocalSupabaseClient() || (null as any);
export const supabaseAdmin = getSupabaseAdminClient() || (null as any);

export interface Usuario {
  id: string;
  userid?: string; // Para compatibilidad con la tabla proyectos
  auth_id?: string; // ID de Google almacenado como texto
  email: string;
  nombre: string;
  avatar_url?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

class AuthService {
  private static instance: AuthService;
  private usuario: Usuario | null = null;
  private listeners: ((usuario: Usuario | null) => void)[] = [];

  private constructor() {
    // Suscribirse a cambios en la sesión solo si supabase está disponible
    if (supabase?.auth) {
      console.log('🔄 [AuthService] Configurando listener para cambios de autenticación');
      supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
        console.log(`🔄 [AuthService] Evento de autenticación: ${event}`);
        if (event === 'SIGNED_IN' && session?.user) {
          await this.sincronizarUsuario(session.user);
        } else if (event === 'SIGNED_OUT') {
          this.setUsuario(null);
        }
      });
    } else {
      console.warn('⚠️ [AuthService] Cliente Supabase no disponible, no se configuraron listeners de autenticación');
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async sincronizarUsuario(user: any): Promise<Usuario | null> {
    try {
      console.log('Iniciando sincronización de usuario:', user.email);
      
      // Determinar el ID de usuario de Google
      const googleId = user.id || user.sub || (user.user_metadata?.sub);
      
      if (!googleId) {
        console.error('Error: No se pudo determinar un ID de usuario de Google válido para sincronización');
        console.log('Datos de usuario disponibles:', JSON.stringify(user, null, 2));
        throw new Error('No se pudo determinar un ID de usuario de Google válido para sincronización');
      }
      
      console.log('ID de Google determinado:', googleId);

      // Si supabaseAdmin no está disponible, intentar usar Supabase directamente
      if (!supabaseAdmin) {
        try {
          // Primero, buscar por auth_id
          let { data: usuarioExistente, error: errorBusqueda } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_id', googleId)
            .single();
          
          // Si no encontramos por auth_id, buscar por email
          if (!usuarioExistente && errorBusqueda?.code === 'PGRST116') {
            console.log('Usuario no encontrado por auth_id, buscando por email:', user.email);
            const { data: usuarioPorEmail, error: errorEmail } = await supabase
              .from('usuarios')
              .select('*')
              .eq('email', user.email)
              .single();
            
            if (!errorEmail) {
              usuarioExistente = usuarioPorEmail;
              console.log('Usuario encontrado por email:', usuarioExistente);
            }
          }
          
          // Si encontramos el usuario, actualizar sus datos
          if (usuarioExistente) {
            console.log('Usuario existente encontrado, actualizando datos:', usuarioExistente);
            
            // Actualizar datos del usuario
            const datosActualizados = {
              auth_id: googleId,
              nombre: user.user_metadata?.full_name || user.name || usuarioExistente.nombre,
              avatar_url: user.user_metadata?.avatar_url || user.image || usuarioExistente.avatar_url,
              ultimo_acceso: new Date().toISOString(),
              fecha_actualizacion: new Date().toISOString()
            };
            
            const { data: usuarioActualizado, error: errorActualizacion } = await supabase
              .from('usuarios')
              .update(datosActualizados)
              .eq('id', usuarioExistente.id)
              .select()
              .single();
            
            if (errorActualizacion) {
              console.error('Error al actualizar usuario:', errorActualizacion);
              // No bloquear, seguir con los datos existentes
            }
            
            const usuario = usuarioActualizado || usuarioExistente;
            
            // Adaptar el formato para mantener compatibilidad
            const usuarioAdaptado: Usuario = {
              id: usuario.id,
              userid: googleId, // Para compatibilidad con la tabla proyectos
              auth_id: googleId,
              email: usuario.email,
              nombre: usuario.nombre,
              avatar_url: usuario.avatar_url,
              fecha_creacion: usuario.fecha_creacion,
              fecha_actualizacion: new Date().toISOString()
            };
            
            this.setUsuario(usuarioAdaptado);
            return usuarioAdaptado;
          }
          
          // Si no existe, crear el usuario en la base de datos
          console.log('Usuario no encontrado, creando nuevo usuario');
          const nuevoUsuario = {
            auth_id: googleId,
            email: user.email,
            nombre: user.user_metadata?.full_name || user.name || user.email.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url || user.image,
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
          };
          
          const { data: usuarioCreado, error } = await supabase
            .from('usuarios')
            .insert([nuevoUsuario])
            .select()
            .single();
          
          if (error) {
            // Si es error de duplicidad de email, intentar actualizar el usuario existente
            if (error.code === '23505' && error.message.includes('usuarios_email_key')) {
              console.log('Email duplicado, obteniendo usuario existente para actualizar');
              
              // Obtener el usuario existente por email
              const { data: usuarioPorEmail, error: errorEmail } = await supabase
                .from('usuarios')
                .select('*')
                .eq('email', user.email)
                .single();
              
              if (errorEmail) {
                console.error('Error al obtener usuario por email:', errorEmail);
                throw new Error('No se pudo sincronizar el usuario con la base de datos');
              }
              
              // Actualizar auth_id del usuario existente
              const { data: usuarioActualizado, error: errorActualizacion } = await supabase
                .from('usuarios')
                .update({
                  auth_id: googleId,
                  avatar_url: user.user_metadata?.avatar_url || user.image || usuarioPorEmail.avatar_url,
                  ultimo_acceso: new Date().toISOString(),
                  fecha_actualizacion: new Date().toISOString()
                })
                .eq('id', usuarioPorEmail.id)
                .select()
                .single();
              
              if (errorActualizacion) {
                console.error('Error al actualizar auth_id:', errorActualizacion);
                throw new Error('No se pudo actualizar el usuario existente');
              }
              
              const usuarioAdaptado: Usuario = {
                id: usuarioActualizado.id,
                userid: googleId, // Para compatibilidad con la tabla proyectos
                auth_id: googleId,
                email: usuarioActualizado.email,
                nombre: usuarioActualizado.nombre,
                avatar_url: usuarioActualizado.avatar_url,
                fecha_creacion: usuarioActualizado.fecha_creacion,
                fecha_actualizacion: new Date().toISOString()
              };
              
              this.setUsuario(usuarioAdaptado);
              return usuarioAdaptado;
            } else {
              console.error('Error al crear usuario en la base de datos:', error);
              throw error;
            }
          }
          
          console.log('Usuario creado en la base de datos:', usuarioCreado);
          
          // Adaptar el usuario creado al formato esperado
          const usuarioAdaptado: Usuario = {
            id: usuarioCreado.id,
            userid: googleId, // Para compatibilidad con la tabla proyectos
            auth_id: googleId,
            email: usuarioCreado.email,
            nombre: usuarioCreado.nombre,
            avatar_url: usuarioCreado.avatar_url,
            fecha_creacion: usuarioCreado.fecha_creacion,
            fecha_actualizacion: usuarioCreado.fecha_actualizacion
          };
          
          this.setUsuario(usuarioAdaptado);
          return usuarioAdaptado;
        } catch (error) {
          console.error('Error al sincronizar usuario con la base de datos:', error);
          throw new Error('No se pudo sincronizar el usuario con la base de datos');
        }
      }

      // Buscar usuario existente por email
      const { data: existingUser, error: searchError } = await supabaseAdmin.from('usuarios')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error al buscar usuario existente:', searchError);
        throw new Error('No se pudo sincronizar el usuario con la base de datos');
      }
      
      // Si el usuario ya existe, actualizar sus datos
      if (existingUser) {
        console.log('Usuario existente encontrado:', existingUser.id, existingUser.email);
        
        // Actualizar el campo auth_id si está vacío
        if (!existingUser.auth_id) {
          const { error: updateError } = await supabaseAdmin.from('usuarios')
            .update({ 
              auth_id: googleId,
              ultimo_acceso: new Date().toISOString(),
              fecha_actualizacion: new Date().toISOString()
            })
            .eq('id', existingUser.id);
          
          if (updateError) {
            console.error('Error al actualizar auth_id del usuario:', updateError);
            throw new Error('No se pudo sincronizar el usuario con la base de datos');
          } else {
            console.log('Campo auth_id actualizado correctamente con el ID de Google');
          }
        }
        
        const usuario: Usuario = {
          id: existingUser.id, // Usar el ID de la tabla usuarios
          userid: googleId, // Para compatibilidad, usar el ID de Google
          auth_id: existingUser.auth_id || googleId,
          email: existingUser.email,
          nombre: existingUser.nombre,
          avatar_url: existingUser.avatar_url,
          fecha_creacion: existingUser.fecha_creacion,
          fecha_actualizacion: new Date().toISOString()
        };
        
        this.setUsuario(usuario);
        return usuario;
      } else {
        // Crear nuevo usuario
        const { data: newUser, error: insertError } = await supabaseAdmin.from('usuarios')
          .insert([{
            email: user.email,
            nombre: user.user_metadata?.full_name || user.name || user.email.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url || user.image,
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
            auth_id: googleId
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Error al crear usuario:', insertError);
          throw new Error('No se pudo sincronizar el usuario con la base de datos');
        }

        const usuario: Usuario = {
          id: newUser.id, // Usar el ID de la tabla usuarios
          userid: googleId, // Para compatibilidad, usar el ID de Google
          auth_id: googleId,
          email: newUser.email,
          nombre: newUser.nombre,
          avatar_url: newUser.avatar_url,
          fecha_creacion: newUser.fecha_creacion,
          fecha_actualizacion: new Date().toISOString()
        };

        this.setUsuario(usuario);
        return usuario;
      }
    } catch (error) {
      console.error('Error en sincronizarUsuario:', error);
      throw new Error('No se pudo sincronizar el usuario con la base de datos');
    }
  }

  public async getUsuario(): Promise<Usuario | null> {
    if (this.usuario) {
      return this.usuario;
    }

    const { data: { session } } = await supabase?.auth.getSession();
    if (session?.user) {
      return this.sincronizarUsuario(session.user);
    }

    return null;
  }

  public setUsuario(usuario: Usuario | null) {
    this.usuario = usuario;
    this.notifyListeners();
  }

  public subscribe(listener: (usuario: Usuario | null) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.usuario));
  }

  public async signOut() {
    await supabase?.auth.signOut();
    this.setUsuario(null);
  }

  public async signIn(provider: string) {
    const { error } = await supabase?.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
  }
}

// Exportar la instancia única del servicio de autenticación
export const authService = AuthService.getInstance();

/**
 * Sincroniza la sesión de Supabase con los tokens de NextAuth
 * Esta función debe usarse para sincronizar las sesiones sin crear nuevas instancias de GoTrueClient
 */
export async function syncWithNextAuth(session: NextAuthSession): Promise<boolean> {
  if (!session?.supabaseAccessToken) {
    console.warn('⚠️ [syncWithNextAuth] No hay token de Supabase en la sesión de NextAuth');
    return false;
  }

  try {
    console.log('🔄 [syncWithNextAuth] Sincronizando Supabase con token de NextAuth');
    
    // Usar la instancia global para evitar crear múltiples instancias
    const { error } = await supabase.auth.setSession({
      access_token: session.supabaseAccessToken as string,
      refresh_token: session.supabaseRefreshToken as string || ''
    });
    
    if (error) {
      console.error('❌ [syncWithNextAuth] Error al sincronizar sesión de Supabase:', error);
      return false;
    }
    
    console.log('✅ [syncWithNextAuth] Sesión de Supabase sincronizada exitosamente');
    
    // Sincronizar usuario en AuthService
    const { data: { user } } = await supabase.auth.getUser();
    if (user && authService) {
      await authService.sincronizarUsuario(user);
    }
    
    return true;
  } catch (error) {
    console.error('❌ [syncWithNextAuth] Error general al sincronizar con Supabase:', error);
    return false;
  }
}

/**
 * Sincroniza la sesión de Supabase con el estado de la aplicación
 */
export async function syncSupabaseSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error al sincronizar sesión:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error en syncSupabaseSession:', error);
    return null;
  }
}

/**
 * Verifica si hay una sesión activa de Supabase
 */
export async function hasSupabaseSession(): Promise<boolean> {
  try {
    const session = await syncSupabaseSession();
    return !!session;
  } catch (error) {
    console.error('Error en hasSupabaseSession:', error);
    return false;
  }
} 