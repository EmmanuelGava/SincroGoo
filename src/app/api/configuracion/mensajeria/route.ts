import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

// GET - Obtener configuraciones del usuario
export async function GET(req: NextRequest) {
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
    
    console.log('✅ [Config API] Usuario autenticado:', session?.user?.email || 'dev-mode', userId);

    // Usar cliente admin para operaciones del servidor
    const supabase = getSupabaseAdmin();

    // Obtener configuraciones reales de la base de datos
    const { data: configuraciones, error } = await supabase
      .from('configuracion_mensajeria_usuario')
      .select('*')
      .eq('usuario_id', userId)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('❌ [Config API] Error obteniendo configuraciones:', error);
      return NextResponse.json({
        error: 'Error obteniendo configuraciones'
      }, { status: 500 });
    }

    console.log('✅ [Config API] Configuraciones obtenidas:', configuraciones?.length || 0);

    return NextResponse.json({
      success: true,
      configuraciones: configuraciones || []
    });

  } catch (error) {
    console.error('Error en GET /api/configuracion/mensajeria:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// POST - Crear nueva configuración
export async function POST(req: NextRequest) {
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
    
    console.log('✅ [Config API] Usuario autenticado:', session?.user?.email || 'dev-mode', userId);

    // Usar cliente admin para operaciones del servidor
    const supabase = getSupabaseAdmin();

    const { 
      plataforma, 
      nombre_configuracion, 
      descripcion, 
      activa, 
      configuracion 
    } = await req.json();

    if (!plataforma || !nombre_configuracion || !configuracion) {
      return NextResponse.json({
        error: 'plataforma, nombre_configuracion y configuracion son requeridos'
      }, { status: 400 });
    }

    // Validar y mapear plataforma
    let plataformaNormalizada = plataforma;
    
    // Mapear plataformas específicas a las válidas
    if (plataforma === 'whatsapp-lite' || plataforma === 'whatsapp-business') {
      plataformaNormalizada = 'whatsapp';
    }
    
    const plataformasValidas = ['telegram', 'whatsapp', 'email'];
    if (!plataformasValidas.includes(plataformaNormalizada)) {
      return NextResponse.json({
        error: `Plataforma no válida: ${plataforma}. Plataformas válidas: ${plataformasValidas.join(', ')}`
      }, { status: 400 });
    }

    // Verificar que no exista una configuración con el mismo nombre
    const { data: existente } = await supabase
      .from('configuracion_mensajeria_usuario')
      .select('id')
      .eq('usuario_id', userId)
      .eq('plataforma', plataformaNormalizada)
      .eq('nombre_configuracion', nombre_configuracion)
      .single();

    if (existente) {
      return NextResponse.json({
        error: 'Ya existe una configuración con ese nombre para esta plataforma'
      }, { status: 409 });
    }

    const nuevaConfiguracion = {
      usuario_id: userId,
      plataforma: plataformaNormalizada,
      nombre_configuracion,
      descripcion: descripcion || null,
      activa: activa !== false, // Default true
      configuracion: {
        ...configuracion,
        tipo_conexion: plataforma, // Guardar el tipo original (lite/business)
        plataforma_original: plataforma
      },
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('configuracion_mensajeria_usuario')
      .insert(nuevaConfiguracion)
      .select()
      .single();

    if (error) {
      console.error('Error creating configuracion:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      configuracion: data
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST /api/configuracion/mensajeria:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}