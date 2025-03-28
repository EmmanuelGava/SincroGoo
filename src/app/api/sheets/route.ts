import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getServerSession } from 'next-auth'
import { supabase } from '@/servicios/supabase/globales/auth-service'
import { SupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Usar cliente de Supabase directamente
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const proyecto_id = searchParams.get('proyecto_id');
    const sheets_id = searchParams.get('sheets_id');

    // Si se proporciona ID específico, devolver datos simulados (compatibilidad anterior)
    if (id) {
      const hojaCalculo = {
        id,
        titulo: 'Hoja de datos de ejemplo',
        hojas: [
          {
            id: 'h1',
            titulo: 'Ventas',
            indice: 0
          },
          {
            id: 'h2',
            titulo: 'Gastos',
            indice: 1
          },
          {
            id: 'h3',
            titulo: 'Inventario',
            indice: 2
          }
        ]
      }
      return NextResponse.json({ exito: true, datos: hojaCalculo })
    }

    // Si no hay ID específico, buscar por proyecto_id o sheets_id
    if (!proyecto_id && !sheets_id) {
      return NextResponse.json(
        { error: 'Se requiere id, proyecto_id o sheets_id' },
        { status: 400 }
      )
    }

    // Construir query para Supabase
    let query = supabase.from('sheets').select('*');
    if (proyecto_id) query = query.eq('proyecto_id', proyecto_id);
    if (sheets_id) query = query.eq('sheets_id', sheets_id);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en la ruta API de sheets:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const { proyectoId, sheetsId, titulo, url, googleId } = await request.json();
    
    if (!proyectoId || !sheetsId || !titulo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: proyectoId, sheetsId, titulo' },
        { status: 400 }
      );
    }

    console.log('[API] Guardando sheet con los siguientes datos:', {
      proyecto_id: proyectoId,
      sheets_id: sheetsId,
      titulo,
      nombre: titulo,
      google_id: googleId || sheetsId,
      email_usuario: session.user.email
    });
    
    try {
      // Primero verificar si ya existe el sheet para este proyecto
      const { data: existingSheets, error: findError } = await supabase
        .from('sheets')
        .select('*')
        .eq('proyecto_id', proyectoId)
        .eq('sheets_id', sheetsId);
        
      if (findError) {
        console.error('[API] Error al buscar sheet existente:', findError);
        return NextResponse.json(
          { error: findError.message },
          { status: 500 }
        );
      }
        
      let result;
      
      if (existingSheets && existingSheets.length > 0) {
        // Actualizar sheet existente
        console.log('[API] Sheet existente encontrado, actualizando:', existingSheets[0].id);
        const { data: updateData, error: updateError } = await supabase
          .from('sheets')
          .update({
            titulo,
            nombre: titulo,
            ultima_sincronizacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
            google_id: googleId || sheetsId,
            email_usuario: session.user.email
          })
          .eq('id', existingSheets[0].id)
          .select()
          .single();
          
        if (updateError) {
          console.error('[API] Error al actualizar sheet:', updateError);
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
          );
        }
        
        result = updateData;
      } else {
        // Insertar nuevo sheet
        console.log('[API] No se encontró sheet existente, creando nuevo');
        const { data: insertData, error: insertError } = await supabase
          .from('sheets')
          .insert({
            proyecto_id: proyectoId,
            sheets_id: sheetsId,
            titulo,
            nombre: titulo,
            ultima_sincronizacion: new Date().toISOString(),
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
            google_id: googleId || sheetsId,
            email_usuario: session.user.email
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('[API] Error al insertar sheet:', insertError);
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 }
          );
        }
        
        result = insertData;
      }
    
      console.log('[API] Sheet guardado correctamente:', result);
      return NextResponse.json(result);
    } catch (dbError) {
      console.error('[API] Error de base de datos:', dbError);
      return NextResponse.json(
        { error: 'Error al procesar la operación en la base de datos' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Error interno al guardar sheet:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}