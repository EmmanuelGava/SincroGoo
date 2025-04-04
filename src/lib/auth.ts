import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * Configuración de NextAuth para ser usada en diferentes partes de la aplicación
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file"
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Validación básica
        if (!user.email) {
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Error en callback signIn:', error);
        return false;
      }
    },
    
    async jwt({ token, account, user }) {
      try {
        // En el primer inicio de sesión, añadimos información adicional al token
        if (account && user) {
          token.accessToken = account.access_token ?? '';
          token.id = user.id || token.sub || '';
          token.provider = account.provider || 'google';
        }
        
        return token;
      } catch (error) {
        console.error('Error en callback jwt:', error);
        return token;
      }
    },
    
    async session({ session, token }) {
      try {
        if (token) {
          // Añadir información del token JWT a la sesión
          session.accessToken = token.accessToken as string || '';
          
          if (session.user) {
            session.user.id = (token.sub as string) || '';
          }
        }
        
        return session;
      } catch (error) {
        console.error('Error en callback session:', error);
        return session;
      }
    },
    
    // Callback de redirección para ayudar con la navegación
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return baseUrl;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
}; 