import { NextResponse } from 'next/server';

// Función para procesar solicitudes GET
export async function GET(/* request: Request */) {
  return handleSignout();
}

// Función para procesar solicitudes POST
export async function POST(/* request: Request */) {
  return handleSignout();
}

async function handleSignout() {
  // Determinar si estamos en desarrollo o producción
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Crear respuesta
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
  
  // Eliminar cookies de NextAuth
  response.cookies.delete('next-auth.session-token');
  response.cookies.delete('next-auth.csrf-token');
  response.cookies.delete('next-auth.callback-url');
  
  // En producción, también eliminar cookies con prefijos especiales
  if (isProduction) {
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.callback-url');
    response.cookies.delete('__Host-next-auth.csrf-token');
  }
  
  console.log('✅ [API Signout] Sesión cerrada correctamente');
  
  return response;
} 