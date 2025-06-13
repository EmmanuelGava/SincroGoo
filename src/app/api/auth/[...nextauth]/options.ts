import { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
import { type Database } from '@/lib/supabase/types/database';
// import { Session } from 'next-auth' // Comentado porque no se utiliza

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
    provider?: string; // Add provider
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    provider?: string;
    // Make sure all fields used in the jwt callback are here
    // For example, if you add user profile info to the token:
    // name?: string;
    // picture?: string;
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
    }),
    CredentialsProvider({
      name: 'Supabase',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tu@email.com" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Supabase URL or Anon Key is missing');
          return null;
        }
        if (!credentials?.email || !credentials?.password) {
          console.error('Credentials missing for Supabase auth');
          return null;
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) {
          console.error('Supabase signInWithPassword error:', error.message);
          throw new Error(error.message || "Credenciales inválidas");
        }

        if (data.user) {
          return {
            id: data.user.id,
            email: data.user.email,
            // name and image are not returned by signInWithPassword
            // these can be fetched and added in the jwt or session callbacks if needed
          };
        }
        return null;
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
    async signIn({ user, account, profile }) { // Added profile
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      // For Google (OAuth)
      if (account?.provider === 'google') {
        console.log('[NextAuth] Iniciando sesión con cuenta Google');
        if (!user.email) {
          console.error('[NextAuth] Usuario Google sin email');
          return false;
        }
        try {
          console.log(`[NextAuth] Sincronizando usuario Google con Supabase: ${user.email}`);
          const response = await fetch(`${baseUrl}/api/supabase/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auth_id: user.id,
              email: user.email,
              nombre: user.name,
              avatar_url: user.image,
              provider: 'google',
            }),
          });
          if (response.ok) {
            const data = await response.json();
            console.log(`[NextAuth] Usuario Google sincronizado. ID interno: ${data.id}`);
          } else {
            const errorData = await response.json();
            console.warn(`[NextAuth] Error al sincronizar usuario Google: ${errorData.error || 'Error desconocido'}`);
          }
        } catch (error) {
          console.error('[NextAuth] Error en API de sincronización para Google:', error);
        }
      }
      // For Supabase (Credentials)
      else if (account?.provider === 'credentials') {
        console.log('[NextAuth] Iniciando sesión con credenciales Supabase');
        if (!user?.email || !user?.id) {
           console.error('[NextAuth] Usuario Supabase sin email o id desde authorize');
           return false;
        }
        try {
          console.log(`[NextAuth] Sincronizando usuario Supabase: ${user.email}`);
          const response = await fetch(`${baseUrl}/api/supabase/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auth_id: user.id,
              email: user.email,
              provider: 'supabase',
            }),
          });
          if (response.ok) {
            const data = await response.json();
            console.log(`[NextAuth] Usuario Supabase sincronizado. ID interno: ${data.id}`);
          } else {
            const errorData = await response.json();
            console.warn(`[NextAuth] Error al sincronizar usuario Supabase: ${errorData.error || 'Error desconocido'}`);
          }
        } catch (error) {
          console.error('[NextAuth] Error en API de sincronización para Supabase:', error);
        }
      }
      return true;
    },
    
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        token.sub = user.id;
        token.email = user.email;

        if (account.provider === 'google') {
          console.log('[NextAuth] Configurando token inicial para Google');
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
          token.provider = 'google';
        } else if (account.provider === 'credentials') {
          console.log('[NextAuth] Configurando token inicial para Supabase (Credentials)');
          // For Supabase credentials, accessToken, refreshToken, accessTokenExpires are not set here
          // as they are handled by Supabase client-side SDK or cookies.
          token.provider = 'supabase';
        }
      }

      // Handle Google token refresh
      // Note: The original refreshAccessToken function might need to be adapted if it's specific to Google's token structure
      if (token.provider === 'google' && token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
        console.log('[NextAuth] Renovando token de Google expirado');
        // Ensure refreshAccessToken is compatible or use a specific one for Google
        return await refreshAccessToken(token);
      }

      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string;
        session.error = token.error as string | undefined;
        session.provider = token.provider as string;
        
        if (session.user) {
          session.user.id = token.sub as string;
          session.user.email = token.email as string;
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

async function refreshAccessToken(token: any) { // This function is specific to Google OAuth
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