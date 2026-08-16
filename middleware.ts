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
  '/auth/signin',
  '/auth/callback',
  '/privacy-policy',
  '/terms-of-service',
  '/data-deletion',
  '/api/integrations/incoming',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // En modo desarrollo, permitir acceso a todas las rutas sin autenticación
  if (DEV_MODE_NO_AUTH) {
    console.log('🔓 [Middleware] Modo desarrollo - permitiendo acceso:', pathname);
    return NextResponse.next();
  }
  
  // Permitir todas las rutas de NextAuth
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Verificar si la ruta es pública
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  )
  
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Para rutas protegidas, verificar autenticación
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })

  // Si no hay token, redirigir a login
  if (!token) {
    console.log('🚫 [Middleware] Sin token - redirigiendo a login:', pathname);
    
    // Para rutas API, devolver 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autorizado' }, 
        { status: 401 }
      );
    }
    
    // Para rutas de UI, redirigir a login
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(loginUrl)
  }

  console.log('✅ [Middleware] Token válido - permitiendo acceso:', pathname);
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /api/auth (NextAuth.js internals)
     * 3. Static files (favicon.ico, robots.txt, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|apple-touch-icon.png|site.webmanifest).*)',
  ],
} 