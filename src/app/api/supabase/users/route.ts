import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../lib/supabase/client';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/users
 * Obtiene el UUID de Supabase del usuario actual basado en su auth_id (ID de Google)
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const auth_id = searchParams.get('auth_id');
    
    console.log('🔍 [API Users] Buscando usuario con auth_id:', auth_id);
    
    // Validar que hay un auth_id (requerido)
    if (!auth_id) {
      console.error('❌ [API Users] Falta auth_id en los parámetros');
      return NextResponse.json(
        { error: 'Se requiere el auth_id (ID de Google)' }, 
        { status: 400 }
      );
    }
    
    const client = getSupabaseClient();
    
    // Intentar buscar usuario por auth_id primero
    console.log(`🔍 [API Users] Buscando usuario por auth_id: ${auth_id}`);
    let { data: userData, error: userError } = await client
      .from('usuarios')
      .select('id, email, nombre, auth_id')
      .eq('auth_id', auth_id);
    
    // Si hay algún error en la consulta de Supabase
    if (userError) {
      console.error('❌ [API Users] Error al buscar por auth_id:', userError);
      throw userError;
    }
    
    // Si no encontramos por auth_id y parece un email, intentamos buscar por email
    if ((!userData || userData.length === 0) && auth_id.includes('@')) {
      console.log(`🔍 [API Users] No encontrado por auth_id, buscando por email: ${auth_id}`);
      const { data: emailData, error: emailError } = await client
        .from('usuarios')
        .select('id, email, nombre, auth_id')
        .eq('email', auth_id);
      
      if (emailError) {
        console.error('❌ [API Users] Error al buscar por email:', emailError);
        throw emailError;
      }
      
      userData = emailData;
    }
    
    // Si no hay datos o el array está vacío
    if (!userData || userData.length === 0) {
      console.warn('⚠️ [API Users] No se encontró usuario para auth_id:', auth_id);
      return NextResponse.json(
        { error: 'Usuario no encontrado' }, 
        { status: 404 }
      );
    }
    
    // Si hay múltiples usuarios, log de advertencia y tomar el primero
    if (userData.length > 1) {
      console.warn(`⚠️ [API Users] Múltiples usuarios encontrados para auth_id ${auth_id}, usando el primero`);
    }
    
    const user = userData[0];
    console.log(`✅ [API Users] Usuario encontrado: ${user.id}`);
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('❌ [API Users] Error general:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 