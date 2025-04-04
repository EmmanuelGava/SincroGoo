import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../lib/supabase/services/auth';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';

/**
 * Endpoint para registro de usuarios
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.email || !data.password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son requeridos' },
        { status: 400 }
      );
    }
    
    const result = await authService.signUp(data);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { user: result.user, session: result.session },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: 500 }
    );
  }
}

/**
 * Endpoint para obtener sesión actual
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener token del encabezado
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Ahora podemos llamar directamente a los métodos de authService
    const userProfile = await authService.getUserProfile(token);
    
    return NextResponse.json({ user: userProfile });
  } catch (error) {
    console.error('Error al obtener sesión:', error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: 500 }
    );
  }
} 