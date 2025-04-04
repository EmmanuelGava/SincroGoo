import NextAuth from 'next-auth'
import { authOptions } from './options'

/**
 * Manejadores para las rutas de autenticación de NextAuth.
 * Estos handlers procesarán todas las solicitudes a /api/auth/*
 */
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }

