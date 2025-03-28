import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Variable para habilitar el modo de desarrollo (sin autenticación)
const DEV_MODE_NO_AUTH = process.env.DEV_MODE_NO_AUTH === 'true';

// Rutas que no requieren autenticación
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/error',
  '/api/check-dev-mode',
  '/api/auth',
  '/api'
]

// Lista de rutas que requieren autenticación
const protectedRoutes = [
  '/proyectos', 
  '/editor-proyectos',
  '/dashboard',
  '/excel-to-sheets'
];

export async function middleware(request: NextRequest) {
  // En modo desarrollo, permitir acceso a todas las rutas sin autenticación
  if (DEV_MODE_NO_AUTH) {
    return NextResponse.next();
  }
  
  // Verificar si la ruta es pública
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Obtener el token de autenticación
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })

  // Si no hay token y no es una ruta pública, redirigir a login
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Si hay token, sincronizar con Supabase
  const response = NextResponse.next()
  
  // Agregar el token a los headers para que esté disponible en la API
  response.headers.set('x-user-email', token.email as string)
  response.headers.set('x-access-token', token.accessToken as string)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /api/auth (NextAuth.js internals)
     * 3. /static (static files)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /robots.txt (static files)
     */
    '/((?!_next|api/auth|static|_vercel|favicon.ico|robots.txt).*)',
  ],
} 