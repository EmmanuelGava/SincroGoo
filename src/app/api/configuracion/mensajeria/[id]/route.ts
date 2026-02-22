import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

// GET - Obtener configuración específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación con NextAuth
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el UUID de Supabase del usuario
    let userId = session.user.id;
    
    // Si es un ID de Google (numérico), necesitamos obtener el UUID de Supabase
    if (userId && /^\d+$/.test(userId)) {
      console.log('🔄 [Config API] ID de Google detectado, obteniendo UUID de Supabase...');
      try {
        const supabase = getSupabaseAdmin();
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_id', userId)
          .single();
        
        if (userError) {
          console.error('❌ [Config API] Error obteniendo UUID de Supabase:', userError);
          return NextResponse.json({
            error: 'Error obteniendo información del usuario'
          }, { status: 500 });
        }
        
        if (userData) {
          userId = userData.id;
          console.log('✅ [Config API] UUID de Supabase obtenido:', userId);
        }
      } catch (error) {
        console.error('❌ [Config API] Error en consulta de usuario:', error);
        return NextResponse.json({
          error: 'Error obteniendo información del usuario'
        }, { status: 500 });
      }
    }

    const supabase = getSupabaseAdmin();
    const { data: configuracion, error } = await supabase
      .from('configuracion_mensajeria_usuario')
      .select('*')
      .eq('id', params.id)
      .eq('usuario_id', userId)
      .single();

    if (error) {
      console.error('Error fetching configuracion:', error);
      return NextResponse.json({
        error: 'Configuración no encontrada'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      configuracion
    });

  } catch (error) {
    console.error('Error en GET /api/configuracion/mensajeria/[id]:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// PUT - Actualizar configuración
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación con NextAuth (excepto en modo desarrollo)
    const DEV_MODE_NO_AUTH = process.env.DEV_MODE_NO_AUTH === 'true';
    const session = await getServerSession(authOptions);
    
    if (!DEV_MODE_NO_AUTH && !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el UUID de Supabase del usuario
    let userId = session?.user?.id || 'dev-user-id';
    
    // Si es un ID de Google (numérico), necesitamos obtener el UUID de Supabase
    if (userId && /^\d+$/.test(userId)) {
      console.log('🔄 [Config API] ID de Google detectado, obteniendo UUID de Supabase...');
      try {
        const supabase = getSupabaseAdmin();
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_id', userId)
          .single();
        
        if (userError) {
          console.error('❌ [Config API] Error obteniendo UUID de Supabase:', userError);
          return NextResponse.json({
            error: 'Error obteniendo información del usuario'
          }, { status: 500 });
        }
        
        if (userData) {
          userId = userData.id;
          console.log('✅ [Config API] UUID de Supabase obtenido:', userId);
        }
      } catch (error) {
        console.error('❌ [Config API] Error en consulta de usuario:', error);
        return NextResponse.json({
          error: 'Error obteniendo información del usuario'
        }, { status: 500 });
      }
    }

    const { 
      nombre_configuracion, 
      descripcion, 
      activa, 
      configuracion 
    } = await req.json();

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('configuracion_mensajeria_usuario')
      .update({
        nombre_configuracion,
        descripcion,
        activa,
        configuracion,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('usuario_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating configuracion:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      configuracion: data
    });

  } catch (error) {
    console.error('Error en PUT /api/configuracion/mensajeria/[id]:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// DELETE - Eliminar configuración
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación con NextAuth
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el UUID de Supabase del usuario
    let userId = session.user.id;
    
    // Si es un ID de Google (numérico), necesitamos obtener el UUID de Supabase
    if (userId && /^\d+$/.test(userId)) {
      console.log('🔄 [Config API] ID de Google detectado, obteniendo UUID de Supabase...');
      try {
        const supabase = getSupabaseAdmin();
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_id', userId)
          .single();
        
        if (userError) {
          console.error('❌ [Config API] Error obteniendo UUID de Supabase:', userError);
          return NextResponse.json({
            error: 'Error obteniendo información del usuario'
          }, { status: 500 });
        }
        
        if (userData) {
          userId = userData.id;
          console.log('✅ [Config API] UUID de Supabase obtenido:', userId);
        }
      } catch (error) {
        console.error('❌ [Config API] Error en consulta de usuario:', error);
        return NextResponse.json({
          error: 'Error obteniendo información del usuario'
        }, { status: 500 });
      }
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('configuracion_mensajeria_usuario')
      .delete()
      .eq('id', params.id)
      .eq('usuario_id', userId);

    if (error) {
      console.error('Error deleting configuracion:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración eliminada correctamente'
    });

  } catch (error) {
    console.error('Error en DELETE /api/configuracion/mensajeria/[id]:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}