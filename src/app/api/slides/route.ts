import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabase } from '@/servicios/supabase/globales/auth-service'
import { getServerSession } from 'next-auth'

// Esta es una implementación simulada para desarrollo
// En producción, deberías usar la API real de Google Slides

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url);
    const proyecto_id = searchParams.get('proyecto_id');
    const slides_id = searchParams.get('slides_id');

    if (!proyecto_id && !slides_id) {
      return NextResponse.json(
        { error: 'Se requiere proyecto_id o slides_id' },
        { status: 400 }
      )
    }

    // Construir query para Supabase
    let query = supabase.from('slides').select('*');
    if (proyecto_id) query = query.eq('proyecto_id', proyecto_id);
    if (slides_id) query = query.eq('slides_id', slides_id);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en la ruta API de slides:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      console.error('[API] Error de autenticación: No hay sesión de usuario');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener datos del cuerpo de la solicitud
    const { proyectoId, slidesId, titulo, url, googleId } = await request.json();
    
    if (!proyectoId || !slidesId || !titulo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: proyectoId, slidesId, titulo' },
        { status: 400 }
      );
    }

    console.log('[API] Guardando slide con los siguientes datos:', {
      proyecto_id: proyectoId,
      google_presentation_id: slidesId,
      slides_id: slidesId,
      titulo,
      nombre: titulo,
      google_id: googleId || slidesId,
      url,
      email_usuario: session.user.email
    });
    
    try {
      // Primero verificar si ya existe el slide para este proyecto
      const { data: existingSlides, error: findError } = await supabase
        .from('slides')
        .select('*')
        .eq('proyecto_id', proyectoId)
        .eq('google_presentation_id', slidesId);
        
      if (findError) {
        console.error('[API] Error al buscar slide existente:', findError);
        return NextResponse.json(
          { error: findError.message },
          { status: 500 }
        );
      }
        
      let result;
      
      if (existingSlides && existingSlides.length > 0) {
        // Actualizar slide existente
        console.log('[API] Slide existente encontrado, actualizando:', existingSlides[0].id);
        const { data: updateData, error: updateError } = await supabase
          .from('slides')
          .update({
            titulo,
            nombre: titulo,
            url,
            ultima_sincronizacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
            google_id: googleId || slidesId,
            email_usuario: session.user.email
          })
          .eq('id', existingSlides[0].id)
          .select()
          .single();
          
        if (updateError) {
          console.error('[API] Error al actualizar slide:', updateError);
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
          );
        }
        
        result = updateData;
      } else {
        // Insertar nuevo slide
        console.log('[API] No se encontró slide existente, creando nuevo');
        const { data: insertData, error: insertError } = await supabase
          .from('slides')
          .insert({
            proyecto_id: proyectoId,
            google_presentation_id: slidesId,
            slides_id: slidesId,
            titulo,
            nombre: titulo,
            url,
            ultima_sincronizacion: new Date().toISOString(),
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
            google_id: googleId || slidesId,
            email_usuario: session.user.email
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('[API] Error al insertar slide:', insertError);
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 }
          );
        }
        
        result = insertData;
      }
    
      console.log('[API] Slide guardado correctamente:', result);
      return NextResponse.json(result);
    } catch (dbError) {
      console.error('[API] Error de base de datos:', dbError);
      return NextResponse.json(
        { error: 'Error al procesar la operación en la base de datos' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Error interno al guardar slide:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}