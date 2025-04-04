import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../../lib/supabase/client';
import { formatErrorResponse } from '../../../../../lib/supabase/utils/error-handler';

/**
 * POST /api/supabase/users/sync
 * Crea o actualiza un usuario en Supabase basado en los datos de NextAuth
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener datos del cuerpo
    const data = await request.json();
    
    console.log('🔄 [API Users Sync] Recibida solicitud para sincronizar usuario:', data.email);
    
    // Validar datos mínimos requeridos
    if (!data.auth_id || !data.email) {
      console.error('❌ [API Users Sync] Faltan datos requeridos:', { auth_id: !!data.auth_id, email: !!data.email });
      return NextResponse.json(
        { error: 'Se requiere auth_id y email' }, 
        { status: 400 }
      );
    }
    
    const { auth_id, email, nombre, avatar_url, provider } = data;
    
    const client = getSupabaseClient();
    
    // Buscar si el usuario ya existe por auth_id
    console.log(`🔍 [API Users Sync] Buscando usuario existente con auth_id: ${auth_id}`);
    const { data: existingUserByAuthId, error: searchAuthIdError } = await client
      .from('usuarios')
      .select('id')
      .eq('auth_id', auth_id);
      
    if (searchAuthIdError) {
      console.error('❌ [API Users Sync] Error buscando por auth_id:', searchAuthIdError);
    }
      
    // Si no se encontró por auth_id, buscar por email
    const existingUser = existingUserByAuthId && existingUserByAuthId.length > 0 
      ? existingUserByAuthId[0] 
      : null;
      
    if (!existingUser) {
      console.log(`🔍 [API Users Sync] No se encontró por auth_id, buscando por email: ${email}`);
      const { data: existingUserByEmail, error: searchEmailError } = await client
        .from('usuarios')
        .select('id')
        .eq('email', email);
        
      if (searchEmailError) {
        console.error('❌ [API Users Sync] Error buscando por email:', searchEmailError);
      }
      
      if (existingUserByEmail && existingUserByEmail.length > 0) {
        console.log(`✅ [API Users Sync] Usuario encontrado por email: ${existingUserByEmail[0].id}`);
        
        // Actualizar el auth_id si se encontró por email pero no por auth_id
        const { error: updateAuthIdError } = await client
          .from('usuarios')
          .update({
            auth_id,
            nombre: nombre || 'Usuario',
            avatar_url,
            provider,
            ultimo_acceso: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id', existingUserByEmail[0].id);
          
        if (updateAuthIdError) {
          console.error('❌ [API Users Sync] Error al actualizar auth_id:', updateAuthIdError);
          throw updateAuthIdError;
        }
        
        console.log(`✅ [API Users Sync] Usuario actualizado con nuevo auth_id: ${existingUserByEmail[0].id}`);
        
        return NextResponse.json({ 
          id: existingUserByEmail[0].id,
          message: 'Usuario actualizado correctamente (por email)'
        });
      }
    }
    
    if (existingUser) {
      // Actualizar usuario existente
      console.log(`🔄 [API Users Sync] Actualizando usuario existente: ${existingUser.id}`);
      
      const { error: updateError } = await client
        .from('usuarios')
        .update({
          nombre: nombre || 'Usuario',
          avatar_url,
          ultimo_acceso: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('❌ [API Users Sync] Error al actualizar usuario:', updateError);
        throw updateError;
      }
      
      console.log(`✅ [API Users Sync] Usuario actualizado correctamente: ${existingUser.id}`);
      
      return NextResponse.json({ 
        id: existingUser.id,
        message: 'Usuario actualizado correctamente'
      });
    } else {
      // Crear nuevo usuario
      console.log(`🆕 [API Users Sync] Creando nuevo usuario para: ${email}`);
      
      const { data: newUser, error: insertError } = await client
        .from('usuarios')
        .insert({
          auth_id,
          email,
          nombre: nombre || 'Usuario',
          avatar_url,
          provider,
          ultimo_acceso: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error('❌ [API Users Sync] Error al crear usuario:', insertError);
        throw insertError;
      }
      
      console.log(`✅ [API Users Sync] Usuario creado correctamente: ${newUser.id}`);
      
      return NextResponse.json({ 
        id: newUser.id,
        message: 'Usuario creado correctamente'
      });
    }
  } catch (error) {
    console.error('❌ [API Users Sync] Error general:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 