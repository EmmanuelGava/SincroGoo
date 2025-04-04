import { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { Session } from 'next-auth'

// Extender el tipo Session para incluir nuestras propiedades personalizadas
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      id?: string;
      email?: string;
      name?: string;
      image?: string;
    }
  }
}

/**
 * Opciones de configuración de NextAuth
 * Se han añadido los scopes necesarios para Google Sheets, Drive y Slides
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/presentations"
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-next-auth.session-token` 
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      console.log('🔐 [NextAuth] Iniciando sesión con cuenta Google');
      
      // Validación básica
      if (!user.email) {
        console.error('❌ [NextAuth] Usuario sin email');
        return false;
      }
      
      // Guardamos el token de acceso para usar en API de Google
      if (account?.access_token) {
        console.log('✅ [NextAuth] Token de acceso disponible');
      } else {
        console.warn('⚠️ [NextAuth] No hay token de acceso disponible');
      }
      
      // Intentar crear/actualizar el usuario en Supabase
      try {
        // Obtener la URL base correcta (o usar la URL del entorno)
        const baseUrl = process.env.NEXTAUTH_URL || 
                      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
        
        console.log(`🔄 [NextAuth] Sincronizando usuario con Supabase: ${user.email}`);
        
        const response = await fetch(`${baseUrl}/api/supabase/users/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_id: user.id,
            email: user.email,
            nombre: user.name || 'Usuario',
            avatar_url: user.image,
            provider: 'google'
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ [NextAuth] Usuario sincronizado con Supabase. ID: ${data.id}`);
        } else {
          const error = await response.json();
          console.warn(`⚠️ [NextAuth] Error al sincronizar usuario con Supabase: ${error.error || 'Error desconocido'}`);
        }
      } catch (error) {
        console.error('❌ [NextAuth] Error en API de sincronización:', error);
        // Continuamos con el login aunque falle la sincronización
      }
      
      return true;
    },
    
    async jwt({ token, account, user }) {
      // Inicial sign in
      if (account && user) {
        console.log('🔄 [NextAuth] Configurando token inicial');
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          user
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        console.log('✅ [NextAuth] Token aún válido');
        return token;
      }

      // Access token has expired, try to update it
      console.log('🔄 [NextAuth] Renovando token expirado');
      return await refreshAccessToken(token);
    },
    
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string;
        session.error = token.error as string | undefined;
        
        if (session.user) {
          session.user.id = token.sub as string;
        }
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
}

async function refreshAccessToken(token: any) {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    console.log('✅ [NextAuth] Token renovado exitosamente');
    
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('❌ [NextAuth] Error al renovar token:', error);
    
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

// Configuración para determinar qué rutas requieren autenticación
export const authConfig = {
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    authorized({ auth, request }: { auth: any, request: { nextUrl: { pathname: string } } }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      
      // Lista de rutas que requieren autenticación
      const protectedRoutes = ['/proyectos', '/editor-proyectos', '/dashboard', '/excel-to-sheets'];
      
      // Verificar si la ruta actual requiere autenticación
      const isProtected = protectedRoutes.some(route => 
        pathname.startsWith(route) || pathname === route
      );
      
      if (isProtected) {
        return isLoggedIn;
      }
      
      return true; // Permitir acceso a rutas no protegidas
    },
  },
};

// Funciones de utilidad para obtener la sesión y el usuario actual
export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
} 