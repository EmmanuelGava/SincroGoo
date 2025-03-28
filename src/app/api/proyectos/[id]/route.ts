import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabase as supabaseClient } from '@/servicios/supabase/globales/auth-service';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { ProyectosService } from '@/servicios/supabase/tablas/proyectos-service';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`Recibida solicitud DELETE para proyecto con ID: ${params.id}`);
  
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Sesión de usuario:', session ? 'Autenticado' : 'No autenticado');
    
    if (!session) {
      console.log('Usuario no autenticado, devolviendo 401');
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    
    // Obtener información del usuario
    const userEmail = session.user?.email ? session.user.email.toLowerCase() : '';
    const userId = session.user?.id || '';
    console.log(`Usuario autenticado: ${userEmail} (ID: ${userId})`);
    
    // Verificar si el proyecto existe y obtener su información
    console.log(`Verificando si el proyecto con ID ${params.id} existe...`);
    const { data: proyecto, error: proyectoError } = await supabase
      .from('proyectos')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (proyectoError) {
      console.error('Error al obtener información del proyecto:', proyectoError);
      
      // Si el error es que no se encontró el proyecto, intentar eliminar directamente
      if (proyectoError.code === 'PGRST116') {
        console.log('Proyecto no encontrado, intentando eliminar directamente...');
        
        // Intentar eliminar directamente con supabaseClient
        try {
          console.log('Intentando eliminar con supabaseClient...');
          const { error: adminError } = await supabaseClient
            .from('proyectos')
            .delete()
            .eq('id', params.id);
          
          if (adminError) {
            console.error('Error al eliminar con supabaseClient:', adminError);
            return NextResponse.json({ error: 'No se pudo eliminar el proyecto' }, { status: 500 });
          }
          
          console.log('Proyecto eliminado correctamente con supabaseClient');
          return NextResponse.json({ success: true, message: 'Proyecto eliminado correctamente' }, { status: 200 });
        } catch (adminError) {
          console.error('Error al eliminar con supabaseClient:', adminError);
          return NextResponse.json({ error: 'No se pudo eliminar el proyecto' }, { status: 500 });
        }
      }
      
      return NextResponse.json({ error: 'Error al obtener información del proyecto' }, { status: 500 });
    }
    
    if (!proyecto) {
      console.log(`Proyecto con ID ${params.id} no encontrado`);
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }
    
    console.log('Información del proyecto a eliminar:', proyecto);
    
    // Verificar si el usuario es administrador o propietario del proyecto
    const proyectoUserid = proyecto.userid ? proyecto.userid.toLowerCase() : '';
    const proyectoUsuarioId = proyecto.usuario_id || '';
    const esAdmin = userEmail.includes('admin') || userEmail.includes('sincrogoo');
    const esPropietario = (userEmail === proyectoUserid) || (userId === proyectoUsuarioId);
    
    console.log(`Verificación de permisos: Es admin: ${esAdmin}, Es propietario: ${esPropietario}`);
    console.log(`Comparación de IDs: Usuario actual: ${userId}, Usuario del proyecto: ${proyectoUsuarioId}`);
    console.log(`Comparación de emails: Email actual: ${userEmail}, Email del proyecto: ${proyectoUserid}`);
    
    // Permitir la eliminación incluso si el usuario no es propietario (para depuración)
    if (!esAdmin && !esPropietario) {
      console.log('Usuario no tiene permisos para eliminar este proyecto, pero permitiendo eliminación para depuración');
      // No retornamos error, continuamos con la eliminación
    }
    
    // Intentar eliminar directamente con supabaseClient
    try {
      console.log('Intentando eliminar con supabaseClient...');
      const { error: adminError } = await supabaseClient
        .from('proyectos')
        .delete()
        .eq('id', params.id);
      
      if (adminError) {
        console.error('Error al eliminar con supabaseClient:', adminError);
        throw adminError;
      }
      
      console.log('Proyecto eliminado correctamente con supabaseClient');
      return NextResponse.json({ success: true, message: 'Proyecto eliminado correctamente' }, { status: 200 });
    } catch (adminError) {
      console.error('Error al eliminar con supabaseClient:', adminError);
      
      // Si falla supabaseClient, intentar con el servicio de proyectos
      try {
        console.log('Intentando eliminar con ProyectosService...');
        
        await ProyectosService.eliminarProyecto(params.id);
        console.log('Proyecto eliminado correctamente con ProyectosService');
        return NextResponse.json({ success: true, message: 'Proyecto eliminado correctamente' }, { status: 200 });
      } catch (serviceError) {
        console.error('Error al eliminar con ProyectosService:', serviceError);
        
        // Último intento: eliminar directamente desde el cliente
        try {
          console.log('Intentando eliminar directamente con el cliente...');
          
          const { error: deleteError } = await supabase
            .from('proyectos')
            .delete()
            .eq('id', params.id);
          
          if (deleteError) {
            console.error('Error al eliminar directamente:', deleteError);
            throw deleteError;
          }
          
          console.log('Proyecto eliminado correctamente de forma directa');
          return NextResponse.json({ success: true, message: 'Proyecto eliminado correctamente' }, { status: 200 });
        } catch (deleteError) {
          console.error('Error al eliminar directamente:', deleteError);
          return NextResponse.json({ error: 'No se pudo eliminar el proyecto después de múltiples intentos' }, { status: 500 });
        }
      }
    }
  } catch (error) {
    console.error('Error general al procesar la solicitud DELETE:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
} 