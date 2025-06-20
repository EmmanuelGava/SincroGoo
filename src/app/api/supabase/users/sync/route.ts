import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase/client';
import { formatErrorResponse } from '../../../../../lib/supabase/utils/error-handler';
import { jwtDecode } from 'jwt-decode';

/**
 * POST /api/supabase/users/sync
 * Crea o actualiza un usuario en la tabla `usuarios` de Supabase.
 * Este endpoint ahora espera un `supabaseToken` para obtener el `id` del usuario (de auth.users)
 * y así garantizar que el usuario ya existe en el sistema de autenticación antes de crear su perfil.
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('🔄 [API Users Sync] Recibida solicitud para sincronizar usuario:', data.email);

    if (!data.email || !data.supabaseToken) {
      return NextResponse.json(
        { error: 'Se requieren `email` y `supabaseToken`' },
        { status: 400 }
      );
    }

    const { email, nombre, avatar_url, provider, supabaseToken } = data;
    const supabaseAdmin = getSupabaseAdmin();

    // Decodificar el JWT de Supabase para obtener el sub (UUID de auth.users)
    let supabaseUserId: string;
    try {
      supabaseUserId = jwtDecode<{ sub: string }>(supabaseToken).sub;
    } catch (e) {
      console.error('❌ [API Users Sync] Error decodificando JWT de Supabase:', e);
      return NextResponse.json({ error: 'JWT de Supabase inválido' }, { status: 400 });
    }

    // 1. Verificar si el perfil del usuario ya existe en `usuarios`
    const user = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('id', supabaseUserId)
      .single();

    const findError = user.error;

    if (findError && findError.code !== 'PGRST116') {
      throw findError;
    }

    // 2. Si el usuario existe, actualizarlo (opcional, por ahora solo log)
    if (user) {
      console.log(`✅ [API Users Sync] El perfil del usuario ${supabaseUserId} ya existe. No se necesita acción.`);
      return NextResponse.json({
        id: user.data ? user.data.id : null,
        message: 'El perfil del usuario ya existe.'
      });
    }
    
    // 3. Si no existe, crearlo usando el ID de `auth.users`
    console.log(`🆕 [API Users Sync] Creando nuevo perfil para usuario: ${supabaseUserId}`);
    
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: supabaseUserId, // Usamos el ID de auth.users
        auth_id: data.auth_id, // Guardamos el ID de Google como referencia
        email,
        nombre: nombre || 'Usuario',
        avatar_url,
        provider,
        ultimo_acceso: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    console.log(`✅ [API Users Sync] Perfil de usuario creado correctamente: ${newUser.id}`);
    return NextResponse.json({
      id: newUser.id,
      message: 'Perfil de usuario creado correctamente'
    });

  } catch (error) {
    console.error('❌ [API Users Sync] Error general:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 