import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { getSupabaseAdmin } from '@/lib/supabase/client'

/**
 * GET /api/supabase/generacion-jobs?proyecto_id=xxx
 * Lista el historial de jobs de generación para un proyecto o todos los del usuario.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()

    if (!usuario) {
      return NextResponse.json({ exito: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    const proyectoId = request.nextUrl.searchParams.get('proyecto_id')

    let query = supabase
      .from('generacion_jobs')
      .select('id, proyecto_id, estado, presentation_id, spreadsheet_id, template_type, total_filas, filas_procesadas, filas_error, errores, created_at, updated_at')
      .eq('usuario_id', usuario.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId)
    }

    const { data: jobs, error } = await query

    if (error) {
      console.error('[generacion-jobs] Error:', error)
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ exito: true, datos: jobs || [] })
  } catch (error) {
    console.error('[generacion-jobs] Error:', error)
    return NextResponse.json(
      { exito: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
