import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { getSupabaseAdmin } from '@/lib/supabase/client'

/**
 * GET /api/supabase/projects/[id]/sync-config
 * Obtiene la configuración de sync de un proyecto.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('proyectos')
      .select('id, sync_automatica, sync_frecuencia, ultima_sync, sync_notificacion')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { exito: false, error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      exito: true,
      datos: {
        sync_automatica: data.sync_automatica ?? false,
        sync_frecuencia: data.sync_frecuencia ?? 'dia',
        ultima_sync: data.ultima_sync ?? null,
        sync_notificacion: data.sync_notificacion ?? { email: false, whatsapp: false },
      },
    })
  } catch (error) {
    console.error('[sync-config GET] Error:', error)
    return NextResponse.json(
      { exito: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/supabase/projects/[id]/sync-config
 * Actualiza la configuración de sync automática de un proyecto.
 * Body: { sync_automatica?, sync_frecuencia?, sync_notificacion? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()

    if (!usuario) {
      return NextResponse.json({ exito: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { data: proyecto } = await supabase
      .from('proyectos')
      .select('id, usuario_id')
      .eq('id', id)
      .single()

    if (!proyecto) {
      return NextResponse.json({ exito: false, error: 'Proyecto no encontrado' }, { status: 404 })
    }

    if (proyecto.usuario_id !== usuario.id) {
      return NextResponse.json({ exito: false, error: 'No autorizado para este proyecto' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {
      fecha_actualizacion: new Date().toISOString(),
    }

    if (body.sync_automatica !== undefined) {
      updateData.sync_automatica = body.sync_automatica
    }
    if (body.sync_frecuencia !== undefined) {
      const validas = ['hora', 'dia', 'semana']
      if (!validas.includes(body.sync_frecuencia)) {
        return NextResponse.json(
          { exito: false, error: 'sync_frecuencia debe ser hora, dia o semana' },
          { status: 400 }
        )
      }
      updateData.sync_frecuencia = body.sync_frecuencia
    }
    if (body.sync_notificacion !== undefined) {
      updateData.sync_notificacion = body.sync_notificacion
    }

    const { error } = await supabase
      .from('proyectos')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('[sync-config PATCH] Error:', error)
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ exito: true })
  } catch (error) {
    console.error('[sync-config PATCH] Error:', error)
    return NextResponse.json(
      { exito: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
