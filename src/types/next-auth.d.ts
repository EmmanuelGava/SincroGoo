import 'next-auth'
import { DefaultSession } from 'next-auth'
import { JWT as NextAuthJWT } from 'next-auth/jwt'
import NextAuth from "next-auth"

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      supabaseToken?: string
    } & DefaultSession['user']
    accessToken?: string
  }
  
  interface User {
    id: string
    email: string
    name: string
    image?: string
    supabaseToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends NextAuthJWT {
    accessToken?: string
  }
} 