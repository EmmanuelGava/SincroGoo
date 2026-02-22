import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

/**
 * Endpoint para debuggear las conversaciones
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data: conversaciones, error } = await supabase
      .from('conversaciones')
      .select('id, remitente, servicio_origen, tipo, fecha_mensaje, metadata')
      .order('fecha_mensaje', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error obteniendo conversaciones:', error);
      return NextResponse.json({ error: 'Error obteniendo conversaciones' }, { status: 500 });
    }

    console.log('📋 Conversaciones encontradas:', conversaciones);

    return NextResponse.json({
      success: true,
      conversaciones,
      count: conversaciones?.length || 0
    });

  } catch (error) {
    console.error('❌ Error en debug de conversaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 