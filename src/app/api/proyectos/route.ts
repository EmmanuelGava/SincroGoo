import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { authService } from '@/servicios/supabase/globales/auth-service';

// GET /api/proyectos - Obtener todos los proyectos del usuario
export async function GET(req: NextRequest) {
  console.log('API: Inicio de la solicitud GET /api/proyectos');
  
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Obtener la sesión del servidor
    console.log('API: Obteniendo sesión del servidor...');
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      console.log('API: No hay sesión de usuario válida');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Verificar si se solicitan todos los proyectos sin filtrar
    const url = new URL(req.url);
    const forzarTodos = url.searchParams.get('todos') === 'true';
    
    console.log('API: Cargando proyectos para usuario:', session.user.email, { forzarTodos });
    
    // Sincronizar usuario para asegurarnos de tener su ID
    console.log('API: Sincronizando usuario...');
    const usuarioSincronizado = await authService.sincronizarUsuario(session.user);
    
    if (!usuarioSincronizado?.id) {
      console.error('API: No se pudo obtener el ID del usuario sincronizado');
      return NextResponse.json(
        { error: 'Error al sincronizar usuario' },
        { status: 500 }
      );
    }

    // Intentar cargar los proyectos del usuario
    console.log('API: Cargando proyectos para usuario:', usuarioSincronizado.id);
    const { data: proyectos, error } = await supabase
      .from('proyectos')
      .select('*')
      .eq('userid', usuarioSincronizado.id)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('API: Error al cargar proyectos:', error);
      return NextResponse.json(
        { error: 'Error al cargar proyectos', details: error },
        { status: 500 }
      );
    }

    // Mapear los proyectos para asegurar consistencia en los campos
    const proyectosMapeados = proyectos?.map(proyecto => ({
      id: proyecto.id,
      usuario_id: proyecto.usuario_id || usuarioSincronizado.id,
      userid: proyecto.userid || usuarioSincronizado.id,
      nombre: proyecto.nombre || proyecto.titulo || '',
      titulo: proyecto.titulo || proyecto.nombre || '',
      descripcion: proyecto.descripcion,
      fecha_creacion: proyecto.fecha_creacion,
      fecha_actualizacion: proyecto.fecha_actualizacion,
      sheets_id: proyecto.sheets_id,
      slides_id: proyecto.slides_id,
      hojastitulo: proyecto.hojastitulo,
      presentaciontitulo: proyecto.presentaciontitulo
    })) || [];

    return NextResponse.json(proyectosMapeados);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/proyectos - Crear un nuevo proyecto
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Obtener la sesión del servidor
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { nombre, descripcion } = body;
    
    // Crear el proyecto
    const { data: proyecto, error } = await supabase
      .from('proyectos')
      .insert([
        {
          nombre,
          descripcion,
          userid: session.user.email.toLowerCase(),
          ultima_modificacion: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error al crear proyecto:', error);
      return NextResponse.json(
        { error: 'Error al crear el proyecto' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(proyecto);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 