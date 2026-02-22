import { NextRequest, NextResponse } from 'next/server';

// Este endpoint solo sirve para verificar que Socket.IO está funcionando
export function GET(req: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'Socket.IO endpoint disponible',
    timestamp: new Date().toISOString()
  });
}

export function POST(req: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'Socket.IO endpoint disponible',
    timestamp: new Date().toISOString()
  });
} 