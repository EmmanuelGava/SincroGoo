import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';

/**
 * GET /api/google/slides/plantilla/job/[jobId]
 * Retorna el estado del job para polling.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { jobId } = await params;
    if (!jobId) {
      return NextResponse.json(
        { exito: false, error: 'jobId requerido' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', session.user.id)
      .single();

    const { data: job, error } = await supabase
      .from('generacion_jobs')
      .select('id, usuario_id, estado, total_filas, filas_procesadas, filas_error, errores, presentation_id')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { exito: false, error: 'Job no encontrado' },
        { status: 404 }
      );
    }

    if (usuario?.id && job.usuario_id && job.usuario_id !== usuario.id) {
      return NextResponse.json({ exito: false, error: 'No autorizado para este job' }, { status: 403 });
    }

    return NextResponse.json({
      exito: true,
      datos: {
        estado: job.estado,
        total_filas: job.total_filas ?? 0,
        filas_procesadas: job.filas_procesadas ?? 0,
        filas_error: job.filas_error ?? 0,
        errores: job.errores ?? [],
        presentation_id: job.presentation_id
      }
    });
  } catch (error) {
    console.error('[plantilla/job] Error:', error);
    return NextResponse.json(
      {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
