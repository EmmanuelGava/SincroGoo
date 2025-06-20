import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../../lib/supabase/client';
import { formatErrorResponse } from '../../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/users/verify
 * Verifica si existe un usuario, y si no, lo crea
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const auth_id = searchParams.get('auth_id');
    const email = searchParams.get('email');
    const nombre = searchParams.get('nombre');
    
    console.log('🔍 [API Users Verify] Verificando usuario:', { auth_id, email });
    
    // Validar que hay auth_id y email (requeridos)
    if (!auth_id || !email) {
      console.error('❌ [API Users Verify] Parámetros incompletos:', { auth_id, email });
      return NextResponse.json(
        { error: 'Se requiere auth_id y email' }, 
        { status: 400 }
      );
    }
    
    const { supabase } = await getSupabaseClient();
    
    // Buscar si el usuario ya existe
    // eslint-disable-next-line prefer-const
    let { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, auth_id')
      .eq('auth_id', auth_id);
    
    if (userError) {
      // eslint-disable-next-line no-useless-escape
      console.error('❌ [API Users Verify] Error buscando usuario:', userError);
      throw userError;
    }
    
    // Si no encontramos por auth_id, buscar por email
    if (!userData || userData.length === 0) {
      console.log(`🔍 [API Users Verify] No encontrado por auth_id, buscando por email: ${email}`);
      
      const { data: emailData, error: emailError } = await supabase
        .from('usuarios')
        .select('id, email, nombre, auth_id')
        .eq('email', email);
      
      if (emailError) {
        console.error('❌ [API Users Verify] Error buscando por email:', emailError);
        throw emailError;
      }
      
      userData = emailData;
      
      // Si se encontró por email pero no por auth_id, actualizar auth_id
      if (userData && userData.length > 0) {
        console.log(`✅ [API Users Verify] Usuario encontrado por email, actualizando auth_id:`, userData[0].id);
        
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({
            auth_id,
            ultimo_acceso: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id', userData[0].id);
        
        if (updateError) {
          console.error('❌ [API Users Verify] Error actualizando auth_id:', updateError);
          throw updateError;
        }
      }
    }
    
    // Si no existe el usuario, crearlo
    if (!userData || userData.length === 0) {
      console.log('🆕 [API Users Verify] Creando nuevo usuario:', email);
      
      const { data: newUser, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          auth_id,
          email,
          nombre: nombre || 'Usuario',
          ultimo_acceso: new Date().toISOString()
        })
        .select('id, email, nombre');
      
      if (insertError) {
        console.error('❌ [API Users Verify] Error creando usuario:', insertError);
        throw insertError;
      }
      
      console.log('✅ [API Users Verify] Usuario creado:', newUser);
      
      return NextResponse.json({ 
        user: newUser[0],
        created: true 
      });
    }
    
    // Si hay múltiples usuarios, tomar el primero
    if (userData.length > 1) {
      console.warn(`⚠️ [API Users Verify] Múltiples usuarios encontrados, usando el primero:`, userData.map(u => u.id));
    }
    
    const user = userData[0];
    
    // Actualizar último acceso
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        ultimo_acceso: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.warn('⚠️ [API Users Verify] Error actualizando último acceso:', updateError);
    }
    
    console.log('✅ [API Users Verify] Usuario verificado:', user.id);
    
    return NextResponse.json({ 
      user,
      created: false
    });
  } catch (error) {
    console.error('❌ [API Users Verify] Error general:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 