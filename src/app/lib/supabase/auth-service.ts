import { Session as NextAuthSession } from "next-auth";
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from './config';
import { supabase as supabaseClient } from './client';

// Extender el tipo User de NextAuth para incluir el token de Supabase
interface ExtendedNextAuthSession extends NextAuthSession {
  user: {
    id?: string;
    email?: string;
    name?: string;
    image?: string;
    supabaseToken?: string;
  }
}

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

export class AuthService {
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
      console.log('🔄 Iniciando sincronización de usuario:', user.email);
      
      // Determinar el ID de usuario de Google
      const googleId = user.id || user.sub || user.providerAccountId || user.provider_id;
      
      if (!googleId) {
        console.error('❌ No se pudo determinar un ID de usuario de Google válido para sincronización');
        console.log('Datos de usuario disponibles:', JSON.stringify(user, null, 2));
        throw new Error('No se pudo determinar un ID de usuario de Google válido para sincronización');
      }
      
      console.log('✅ ID de Google determinado:', googleId);

      // Si supabaseAdmin no está disponible, intentar usar Supabase directamente
      if (!supabaseAdmin) {
        try {
          // Primero, buscar por auth_id
          // eslint-disable-next-line prefer-const
          let { data: usuarioExistente, error: errorBusqueda } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_id', googleId)
            .single();
          
          // Si no encontramos por auth_id, buscar por email
          if (!usuarioExistente && errorBusqueda?.code === 'PGRST116') {
            console.log('🔍 Usuario no encontrado por auth_id, buscando por email:', user.email);
            const { data: usuarioPorEmail, error: errorEmail } = await supabase
              .from('usuarios')
              .select('*')
              .eq('email', user.email)
              .single();
            
            if (!errorEmail) {
              usuarioExistente = usuarioPorEmail;
              console.log('✅ Usuario encontrado por email:', usuarioExistente);
            }
          }
          
          // Si encontramos el usuario, actualizar sus datos
          if (usuarioExistente) {
            console.log('🔄 Usuario existente encontrado, actualizando datos:', usuarioExistente);
            
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
              console.error('❌ Error al actualizar usuario:', errorActualizacion);
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
          console.log('➕ Usuario no encontrado, creando nuevo usuario');
          const nuevoUsuario = {
            auth_id: googleId,
            userid: googleId, // Asegurar que userid se establezca al crear
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
            console.error('❌ Error al crear usuario:', error);
            throw error;
          }
          
          if (usuarioCreado) {
            console.log('✅ Usuario creado exitosamente:', usuarioCreado);
            this.setUsuario(usuarioCreado);
            return usuarioCreado;
          }
          
          throw new Error('No se pudo crear el usuario');
        } catch (error) {
          console.error('❌ Error en sincronización de usuario:', error);
          throw error;
        }
      }
      
      // Si tenemos acceso a supabaseAdmin, usar ese cliente
      try {
        // Primero, buscar por auth_id
        // eslint-disable-next-line prefer-const
        let { data: usuarioExistente, error: errorBusqueda } = await supabaseAdmin
          .from('usuarios')
          .select('*')
          .eq('auth_id', googleId)
          .single();
        
        // Si no encontramos por auth_id, buscar por email
        if (!usuarioExistente && errorBusqueda?.code === 'PGRST116') {
          console.log('🔍 Usuario no encontrado por auth_id, buscando por email:', user.email);
          const { data: usuarioPorEmail, error: errorEmail } = await supabaseAdmin
            .from('usuarios')
            .select('*')
            .eq('email', user.email)
            .single();
          
          if (!errorEmail) {
            usuarioExistente = usuarioPorEmail;
            console.log('✅ Usuario encontrado por email:', usuarioExistente);
          }
        }
        
        // Si encontramos el usuario, actualizar sus datos
        if (usuarioExistente) {
          console.log('🔄 Usuario existente encontrado, actualizando datos:', usuarioExistente);
          
          // Actualizar datos del usuario
          const datosActualizados = {
            auth_id: googleId,
            nombre: user.user_metadata?.full_name || user.name || usuarioExistente.nombre,
            avatar_url: user.user_metadata?.avatar_url || user.image || usuarioExistente.avatar_url,
            ultimo_acceso: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
          };
          
          const { data: usuarioActualizado, error: errorActualizacion } = await supabaseAdmin
            .from('usuarios')
            .update(datosActualizados)
            .eq('id', usuarioExistente.id)
            .select()
            .single();
          
          if (errorActualizacion) {
            console.error('❌ Error al actualizar usuario:', errorActualizacion);
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
        console.log('➕ Usuario no encontrado, creando nuevo usuario');
        const nuevoUsuario = {
          auth_id: googleId,
          userid: googleId, // Asegurar que userid se establezca al crear
          email: user.email,
          nombre: user.user_metadata?.full_name || user.name || user.email.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url || user.image,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString()
        };
        
        const { data: usuarioCreado, error } = await supabaseAdmin
          .from('usuarios')
          .insert([nuevoUsuario])
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error al crear usuario:', error);
          throw error;
        }
        
        if (usuarioCreado) {
          console.log('✅ Usuario creado exitosamente:', usuarioCreado);
          this.setUsuario(usuarioCreado);
          return usuarioCreado;
        }
        
        throw new Error('No se pudo crear el usuario');
      } catch (error) {
        console.error('❌ Error en sincronización de usuario con admin:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Error en sincronización de usuario:', error);
      throw error;
    }
  }

  public setUsuario(usuario: Usuario | null) {
    this.usuario = usuario;
    this.notifyListeners();
  }

  public getUsuario(): Usuario | null {
    return this.usuario;
  }

  public addListener(listener: (usuario: Usuario | null) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.usuario));
  }

  /**
   * Utiliza el token de NextAuth para autorizar las peticiones a Supabase
   * Esta función simplificada evita sincronizaciones innecesarias
   */
  public async sincronizarSesionNextAuth(session: ExtendedNextAuthSession): Promise<boolean> {
    try {
      console.log('🔄 [AuthService] Sincronizando sesión con NextAuth:', {
        email: session.user.email
      });
      
      // Si tenemos token de Supabase en la sesión, lo usamos directamente
      const supabaseToken = session.user?.supabaseToken;
      
      if (supabaseToken) {
        console.log('✅ [AuthService] Utilizando token Supabase de la sesión');
        const { error } = await supabaseClient.auth.setSession({
          access_token: supabaseToken,
          refresh_token: ''
        });
        
        if (error) {
          console.error('❌ [AuthService] Error al establecer sesión en Supabase:', error);
          return false;
        }
        
        return true;
      }
      
      console.log('🔄 [AuthService] No hay token de Supabase en la sesión');
      return false;
    } catch (error) {
      console.error('❌ [AuthService] Error en sincronización con NextAuth:', error);
      return false;
    }
  }

  /**
   * Obtiene el usuario actual desde Supabase
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      if (error) {
        console.error('❌ [AuthService] Error al obtener usuario:', error);
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('❌ [AuthService] Error al obtener usuario actual:', error);
      return null;
    }
  }

  public async hasSupabaseSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.error('❌ Error al verificar sesión de Supabase:', error);
        return false;
      }
      return !!session;
    } catch (error) {
      console.error('❌ Error al verificar sesión de Supabase:', error);
      return false;
    }
  }

  public async syncSupabaseSession(): Promise<void> {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.error('❌ Error al obtener sesión de Supabase:', error);
        return;
      }
      if (session?.user) {
        await this.sincronizarUsuario(session.user);
      } else {
        this.setUsuario(null);
      }
    } catch (error) {
      console.error('❌ Error al sincronizar sesión de Supabase:', error);
    }
  }
}

export const authService = AuthService.getInstance(); 