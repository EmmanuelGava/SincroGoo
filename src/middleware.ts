import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
];

export async function middleware(request: NextRequest) {
  // Implementación minimalista para evitar bucles
  
  // En desarrollo, permitir acceso directo
  if (DEV_MODE_NO_AUTH) {
    return NextResponse.next();
  }

  // Para la ruta /api/auth/clear-session no hacer ninguna verificación
  if (request.nextUrl.pathname.includes('/api/auth/clear-session')) {
    return NextResponse.next();
  }
  
  // Para rutas públicas, permitir acceso directo
  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Para el resto de rutas, sólo verificar la cookie, sin alterarla
  const hasAuthCookie = request.cookies.has('next-auth.session-token') || 
                       request.cookies.has('__Secure-next-auth.session-token');
  
  if (!hasAuthCookie) {
    // Si no hay cookie de autenticación, redirigir a login
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  // En casos normales, simplemente continuar
  const response = NextResponse.next();
  
  // Si esta URL tiene el parámetro de cierre de sesión forzado
  if (request.nextUrl.searchParams.has('forcedLogout')) {
    console.log('🚨 [Middleware] Detectada redirección desde cierre de sesión forzado');
    
    // Eliminar todas las cookies de autenticación en el nivel de middleware
    // NextAuth estándar
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('next-auth.csrf-token');
    response.cookies.delete('next-auth.callback-url');
    
    // Cookies con prefijo Secure
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.callback-url');
    
    // Cookies con prefijo Host
    response.cookies.delete('__Host-next-auth.csrf-token');
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * 1. /api (rutas API)
     * 2. /_next (archivos estáticos de Next.js)
     * 3. /favicon.ico, etc.
     */
    '/((?!api|_next|favicon.ico).*)',
  ],
} 