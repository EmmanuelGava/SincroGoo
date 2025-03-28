import { NextResponse } from 'next/server';

// Verificar si estamos en modo desarrollo
export async function GET() {
  // El modo desarrollo está deshabilitado permanentemente
  const devMode = false;
  
  // Devolver el estado del modo desarrollo
  return NextResponse.json({ 
    devMode,
    timestamp: new Date().toISOString()
  });
}
