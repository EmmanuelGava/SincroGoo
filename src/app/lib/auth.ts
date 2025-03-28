import type { NextAuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"
import GoogleProvider from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"

// Importar lo necesario para Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

interface User {
  id?: string
  email?: string | null
  name?: string | null
  image?: string | null
}

declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: string
    user?: User
    // Añadir tokens de Supabase a la sesión
    supabaseAccessToken?: string
    supabaseRefreshToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    error?: string
    accessTokenExpires?: number
    refreshToken?: string
    user?: User
    // Añadir tokens de Supabase al token JWT
    supabaseAccessToken?: string
    supabaseRefreshToken?: string
  }
}

// Función para sincronizar con Supabase
async function syncWithSupabase(token: string): Promise<{ access_token: string, refresh_token: string } | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Faltan variables de entorno para Supabase');
    return null;
  }

  try {
    console.log('🔄 Sincronizando sesión con Supabase...');
    
    // Crear un cliente de Supabase temporal para la autenticación
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Sincronizar con la sesión de Google usando el token de OAuth
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: token,
    });
    
    if (error) {
      console.error('❌ Error al sincronizar con Supabase:', error);
      return null;
    }
    
    if (!data.session) {
      console.error('❌ No se pudo obtener sesión de Supabase');
      return null;
    }
    
    console.log('✅ Sesión sincronizada con Supabase exitosamente');
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    };
  } catch (error) {
    console.error('❌ Error general al sincronizar con Supabase:', error);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/presentations",
            "https://www.googleapis.com/auth/drive.readonly"
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
          response_type: "code"
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account && profile) {
        console.log('🔐 Usuario autenticado con Google:', profile.email);
        return true;
      }
      return false;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Si la URL es una URL de callback, mantener la URL original
      if (url.startsWith('/api/auth') || url.includes('/api/auth/callback/')) {
        return url;
      }
      
      // Si es una URL externa, redirigir a la página principal
      if (!url.startsWith(baseUrl)) {
        return baseUrl;
      }
      
      // Si es la página de login y el usuario está autenticado, redirigir a la página principal
      if (url.includes('/auth/login')) {
        return baseUrl;
      }
      
      // Mantener la URL original para todas las demás rutas
      return url;
    }
  },
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/auth/error",
  },
  events: {
    async signIn({ user }) {
      console.log("✅ Usuario autenticado:", user?.email)
    },
    async signOut() {
      console.log("🚪 Cerrando sesión y limpiando almacenamiento local")
      if (typeof window !== "undefined") {
        localStorage.clear()
        sessionStorage.clear()
      }
    }
  },
  debug: process.env.NODE_ENV === "development"
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
