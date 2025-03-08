import type { NextAuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"
import GoogleProvider from "next-auth/providers/google"

interface User {
  email?: string | null
  name?: string | null
  image?: string | null
}

declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: string
    user?: User
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    error?: string
    accessTokenExpires?: number
    refreshToken?: string
    user?: User
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
        return true
      }
      return false
    },
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          user: {
            email: user.email,
            name: user.name,
            image: user.image
          }
        }
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token
      }

      // Access token has expired, try to refresh it
      try {
        // Implementar lógica de refresh token si es necesario
        return {
          ...token,
          error: "RefreshAccessTokenError",
        }
      } catch (error) {
        console.error("Error refreshing access token", error)
        return {
          ...token,
          error: "RefreshAccessTokenError",
        }
      }
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken
        session.error = token.error
        session.user = token.user
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Redirigir a la página de proyectos después del inicio de sesión
      if (url.startsWith(baseUrl)) {
        return `${baseUrl}/proyectos`
      }
      return baseUrl
    }
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  events: {
    async signIn({ user }) {
      console.log("Usuario autenticado:", user?.email)
    },
    async signOut() {
      if (typeof window !== "undefined") {
        localStorage.clear()
        sessionStorage.clear()
      }
    }
  },
  debug: process.env.NODE_ENV === "development"
}

