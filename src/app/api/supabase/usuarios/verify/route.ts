import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '../../../../../lib/supabase/client';
import { formatErrorResponse } from '../../../../../lib/supabase/utils/error-handler';
import { ensureOrganizacionForUsuario } from '@/lib/auth/getOrganizacionContext';

/**
 * GET /api/supabase/usuarios/verify
 * Verifica si existe un usuario, y si no, lo crea.
 * Identidad siempre de la sesión; ignora auth_id/email/nombre del query.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const auth_id = session.user.id;
    const email = session.user.email;
    const nombre = session.user.name ?? email;

    console.log('🔍 [API Users Verify] Verificando usuario:', { auth_id, email });

    const supabase = getSupabaseAdmin();
    
    // Buscar si el usuario ya existe
    // eslint-disable-next-line prefer-const
    let { data: userData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, auth_id')
      .eq('auth_id', auth_id);
    
    if (usuarioError) {
      console.error('❌ [API Users Verify] Error buscando usuario:', usuarioError);
      throw usuarioError;
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

      await ensureOrganizacionForUsuario(newUser[0].id, nombre);
      
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