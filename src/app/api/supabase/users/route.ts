import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase/client';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/users
 * Obtiene un usuario de la tabla `usuarios` basado en su `auth_id` (ID del proveedor de OAuth).
 * Utiliza el cliente administrativo para realizar la búsqueda.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const auth_id = searchParams.get('auth_id');
    
    console.log('🔍 [API Users] Buscando usuario con auth_id:', auth_id);
    
    if (!auth_id) {
      return NextResponse.json(
        { error: 'El parámetro `auth_id` es requerido' }, 
        { status: 400 }
      );
    }
    
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nombre, auth_id')
      .eq('auth_id', auth_id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // "No rows found"
        console.warn('⚠️ [API Users] No se encontró usuario para auth_id:', auth_id);
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }
      throw error;
    }
    
    console.log(`✅ [API Users] Usuario encontrado: ${user.id}`);
    return NextResponse.json({ user });

  } catch (error) {
    console.error('❌ [API Users] Error general:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 