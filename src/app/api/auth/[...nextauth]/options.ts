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
    supabaseToken?: string;
    supabaseRefreshToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    provider?: string;
    supabaseToken?: string;
    supabaseRefreshToken?: string;
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
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/presentations"
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
            email: data.user.email || '',
            name: data.user.user_metadata?.name || '',
            image: data.user.user_metadata?.avatar_url || '',
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
    async signIn({ user, account, profile }) {
      // El token de Supabase aún no está disponible aquí. 
      // Se obtiene en el callback 'jwt' que se ejecuta DESPUÉS de 'signIn'.
      // La sincronización ahora se inicia desde el frontend.
      return true;
    },
    
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        token.sub = user.id;
        token.email = user.email;
        if (account.provider === 'google') {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
          token.provider = 'google';
          // Obtener JWT de Supabase usando Google OAuth
          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            // Intercambiar el token de Google por un JWT de Supabase
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: account.id_token as string,
            });
            if (error) {
              console.error('[NextAuth] Error al intercambiar token de Google por JWT de Supabase:', error);
              token.error = "SupabaseTokenError";
            } else if (data?.session) {
              token.supabaseToken = data.session.access_token;
              token.supabaseRefreshToken = data.session.refresh_token;
            }
          } catch (e) {
            console.error('[NextAuth] Error obteniendo JWT de Supabase para Google:', e);
            token.error = "SupabaseTokenError";
          }
        } else if (account.provider === 'credentials') {
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
      
      if (token.supabaseToken) {
        session.supabaseToken = token.supabaseToken as string;
        session.supabaseRefreshToken = token.supabaseRefreshToken as string;
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