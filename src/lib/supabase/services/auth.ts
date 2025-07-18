import { supabase, getSupabaseClient } from '../client';
import { handleError } from '../utils/error-handler';
import type { AuthResponse, SignInRequest, SignUpRequest, User, UserProfile } from '../types/auth';

class AuthService {
  /**
   * Registra un nuevo usuario
   * @param params Datos de registro
   * @returns Respuesta de autenticación
   */
  async signUp(params: SignUpRequest): Promise<AuthResponse> {
    try {
      const { email, password, nombre, apellido } = params;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            apellido,
            role: 'user'
          }
        }
      });
      
      if (error) throw error;
      
      // Crear documento de usuario en tabla profiles
      if (data.user) {
        await supabase
          .from('perfiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            nombre,
            apellido,
            created_at: new Date().toISOString()
          });
      }
      
      return {
        user: data.user ? this.mapUserFromAuth(data.user) : null,
        session: data.session ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        } : null
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Error al registrar usuario'
      };
    }
  }
  
  /**
   * Inicia sesión de usuario
   * @param params Credenciales
   * @returns Respuesta de autenticación
   */
  async signIn(params: SignInRequest): Promise<AuthResponse> {
    try {
      const { email, password } = params;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      return {
        user: data.user ? this.mapUserFromAuth(data.user) : null,
        session: data.session ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        } : null
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Error al iniciar sesión'
      };
    }
  }
  
  /**
   * Cierra la sesión del usuario actual
   * @returns true si se cerró correctamente
   */
  async signOut(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      return false;
    }
  }
  
  /**
   * Obtiene el perfil del usuario actual
   * @param token Token de acceso
   * @returns Perfil de usuario
   */
  async getUserProfile(token: string): Promise<UserProfile | null> {
    try {
      const { supabase } = await getSupabaseClient();
      
      // Primero obtener datos de auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!userData.user) {
        throw new Error('Usuario no encontrado');
      }
      
      // Luego obtener datos extendidos del perfil
      const { data: profileData, error: profileError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Combinar datos
      return {
        id: userData.user.id,
        email: userData.user.email || '',
        nombre: profileData?.nombre,
        apellido: profileData?.apellido,
        rol: userData.user.user_metadata?.role,
        avatar_url: profileData?.avatar_url,
        created_at: userData.user.created_at,
        preferencias: profileData?.preferencias,
        metadatos: profileData?.metadatos
      };
    } catch (error) {
      console.error('Error al obtener perfil de usuario:', error);
      return null;
    }
  }
  
  /**
   * Actualiza el perfil del usuario
   * @param token Token de acceso
   * @param profile Datos a actualizar
   * @returns Perfil actualizado
   */
  async updateUserProfile(token: string, profile: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { supabase } = await getSupabaseClient();
      
      // Obtener usuario actual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!userData.user) {
        throw new Error('Usuario no encontrado');
      }
      
      // Actualizar datos en la tabla de perfiles
      const { data: updatedProfile, error: updateError } = await supabase
        .from('perfiles')
        .update({
          nombre: profile.nombre,
          apellido: profile.apellido,
          avatar_url: profile.avatar_url,
          preferencias: profile.preferencias,
          metadatos: profile.metadatos,
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.user.id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Actualizar metadatos en auth si es necesario
      if (profile.nombre || profile.apellido) {
        await supabase.auth.updateUser({
          data: {
            nombre: profile.nombre,
            apellido: profile.apellido
          }
        });
      }
      
      return {
        id: userData.user.id,
        email: userData.user.email || '',
        nombre: updatedProfile.nombre,
        apellido: updatedProfile.apellido,
        rol: userData.user.user_metadata?.role,
        avatar_url: updatedProfile.avatar_url,
        created_at: userData.user.created_at,
        preferencias: updatedProfile.preferencias,
        metadatos: updatedProfile.metadatos
      };
    } catch (error) {
      console.error('Error al actualizar perfil de usuario:', error);
      return null;
    }
  }
  
  /**
   * Mapea usuario desde respuesta de autenticación
   * @param authUser Usuario desde Auth API
   * @returns Usuario formateado
   */
  private mapUserFromAuth(authUser: any): User {
    return {
      id: authUser.id,
      email: authUser.email || '',
      nombre: authUser.user_metadata?.nombre,
      apellido: authUser.user_metadata?.apellido,
      rol: authUser.user_metadata?.role,
      avatar_url: authUser.user_metadata?.avatar_url,
      created_at: authUser.created_at,
      provider: authUser.app_metadata?.provider
    };
  }

  /**
   * Obtiene un usuario por su correo electrónico
   * @param email Email del usuario
   * @returns Usuario o null si no se encuentra
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      if (!email) {
        console.error('❌ [AuthService] Error: email no proporcionado');
        return null;
      }

      const { supabase } = await getSupabaseClient();
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error('❌ [AuthService] Error al obtener usuario:', error);
        return null;
      }

      return this.mapUserFromAuth(data);
    } catch (error) {
      console.error('❌ [AuthService] Error inesperado:', error);
      return null;
    }
  }

  /**
   * Sincroniza un usuario con Supabase
   * @param userData Datos del usuario a sincronizar
   * @returns Usuario sincronizado o null si hay error
   */
  async sincronizarUsuario(userData: { email: string; name?: string; image?: string }): Promise<User | null> {
    try {
      if (!userData.email) {
        console.error('❌ [AuthService] Error: email no proporcionado');
        return null;
      }

      const { supabase } = await getSupabaseClient();
      
      // Buscar si el usuario ya existe
      const { data: existingUser, error: searchError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', userData.email)
        .single();

      if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no se encontró el registro
        console.error('❌ [AuthService] Error al buscar usuario:', searchError);
        return null;
      }

      if (existingUser) {
        // Actualizar usuario existente
        const { data: updatedUser, error: updateError } = await supabase
          .from('usuarios')
          .update({
            nombre: userData.name || existingUser.nombre,
            imagen: userData.image || existingUser.imagen,
            ultimo_acceso: new Date().toISOString()
          })
          .eq('email', userData.email)
          .select()
          .single();

        if (updateError) {
          console.error('❌ [AuthService] Error al actualizar usuario:', updateError);
          return null;
        }

        return this.mapUserFromAuth(updatedUser);
      } else {
        // Crear nuevo usuario
        const { data: newUser, error: createError } = await supabase
          .from('usuarios')
          .insert({
            email: userData.email,
            nombre: userData.name || '',
            imagen: userData.image || '',
            ultimo_acceso: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ [AuthService] Error al crear usuario:', createError);
          return null;
        }

        return this.mapUserFromAuth(newUser);
      }
    } catch (error) {
      console.error('❌ [AuthService] Error inesperado:', error);
      return null;
    }
  }

  /**
   * Obtiene el usuario actualmente autenticado
   * @returns Usuario actual o null si no hay sesión
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { supabase } = await getSupabaseClient();
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ [AuthService] Error al obtener usuario actual:', error);
        return null;
      }
      
      if (!data?.user) {
        return null;
      }
      
      return data.user as unknown as User;
    } catch (error) {
      console.error('❌ [AuthService] Error en getCurrentUser:', error);
      return null;
    }
  }

  /**
   * Verifica la conexión con Supabase
   * @returns Objeto indicando si la conexión es exitosa
   */
  async checkConnection(): Promise<{conectado: boolean, mensaje: string}> {
    try {
      console.log('✅ [AuthService] Verificando conexión a Supabase...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ [AuthService] Error al verificar conexión:', error);
        return { conectado: false, mensaje: error.message };
      }
      
      return { conectado: true, mensaje: 'Conexión exitosa' };
    } catch (error) {
      console.error('❌ [AuthService] Error al verificar conexión:', error);
      return { 
        conectado: false, 
        mensaje: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Refresca la sesión del usuario actual
   * @returns Nueva sesión o null si hay error
   */
  async refreshSession(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      return {
        user: data.user ? this.mapUserFromAuth(data.user) : null,
        session: data.session ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        } : null
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Error al refrescar sesión'
      };
    }
  }

  /**
   * Envía correo de restablecimiento de contraseña
   * @param email Email del usuario
   * @returns true si se envió correctamente
   */
  async resetPassword(email: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al solicitar reset de contraseña:', error);
      return false;
    }
  }

  /**
   * Actualiza la contraseña del usuario
   * @param newPassword Nueva contraseña
   * @returns true si se actualizó correctamente
   */
  async updatePassword(newPassword: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      return false;
    }
  }

  /**
   * Elimina la cuenta del usuario actual
   * @param userId ID del usuario a eliminar
   * @returns true si se eliminó correctamente
   */
  async deleteAccount(userId: string): Promise<boolean> {
    try {
      const { supabase } = await getSupabaseClient();
      
      // Primero eliminar datos del perfil
      const { error: profileError } = await supabase
        .from('perfiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
      // Luego eliminar usuario de auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;
      
      return true;
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      return false;
    }
  }

  /**
   * Verifica el email del usuario
   * @param token Token de verificación
   * @returns true si se verificó correctamente
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al verificar email:', error);
      return false;
    }
  }

  /**
   * Vincula una cuenta de proveedor externo
   * @param provider Proveedor (google, github, etc)
   * @returns URL para iniciar el flujo de vinculación
   */
  async linkProvider(provider: 'google' | 'github'): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'email profile'
        }
      });
      
      if (error) throw error;
      return data.url;
    } catch (error) {
      console.error('Error al vincular proveedor:', error);
      return null;
    }
  }
}

// Exportar una instancia única del servicio
const authService = new AuthService();
export { authService };
export default authService;