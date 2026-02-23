import { NextRequest, NextResponse } from 'next/server';
import { SlidesService } from '@/app/servicios/google/slides/SlidesService';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { LAYOUTS, generarLayoutDinamico } from '@/app/servicios/google/slides/plantilla-layouts';

const DELAY_MS = 1500;
const MAX_RETRIES_429 = 5;
const RETRY_DELAY_429_MS = 60000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function is429(error: unknown): boolean {
  const e = error as { status?: number; code?: number; response?: { status?: number } };
  return e?.status === 429 || e?.code === 429 || e?.response?.status === 429;
}

/**
 * POST /api/google/slides/plantilla/process
 * Construye cada slide desde cero usando el LAYOUT de la plantilla.
 * Body: { jobId: string, accessToken: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, accessToken } = body;

    if (!jobId || !accessToken) {
      return NextResponse.json(
        { exito: false, error: 'Se requieren jobId y accessToken' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: job, error: jobErr } = await supabase
      .from('generacion_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json(
        { exito: false, error: 'Job no encontrado' },
        { status: 404 }
      );
    }

    if (job.estado === 'procesando') {
      return NextResponse.json({ exito: true, mensaje: 'Job ya en procesamiento' });
    }

    if (job.estado === 'completado') {
      return NextResponse.json({ exito: true, mensaje: 'Job ya completado' });
    }

    await supabase
      .from('generacion_jobs')
      .update({ estado: 'procesando', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    const { data: items } = await supabase
      .from('generacion_job_items')
      .select('id, fila_index, datos_fila')
      .eq('job_id', jobId)
      .eq('estado', 'pendiente')
      .order('fila_index', { ascending: true });

    const itemsToProcess = items || [];
    const presentationId = job.presentation_id;
    const templateType = job.template_type as string | null;
    const templateSlideId = job.slide_template_id as string | null;
    const columnMapping = (job.column_mapping || {}) as Record<string, string>;
    const headers = itemsToProcess[0]?.datos_fila?.encabezados || [];

    const placeholdersFromMapping = columnMapping && Object.keys(columnMapping).length > 0
      ? Object.keys(columnMapping)
      : null;
    const usarLayoutDinamico = placeholdersFromMapping && placeholdersFromMapping.length > 0;

    let layout: import('@/app/servicios/google/slides/plantilla-layouts').LayoutElement[];
    if (usarLayoutDinamico) {
      layout = generarLayoutDinamico(placeholdersFromMapping, templateType || 'ficha_local');
    } else if (templateType && LAYOUTS[templateType]) {
      layout = LAYOUTS[templateType];
    } else {
      console.error(`[plantilla/process] template_type no válido: ${templateType}`);
      await supabase
        .from('generacion_jobs')
        .update({
          estado: 'completado',
          filas_error: itemsToProcess.length,
          errores: [{ fila: 0, error: `Tipo de plantilla no reconocido: ${templateType}` }],
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      return NextResponse.json(
        { exito: false, error: `Tipo de plantilla no reconocido: ${templateType}` },
        { status: 400 }
      );
    }
    const slidesService = SlidesService.getInstance(accessToken);
    const errores: { fila: number; error: string }[] = [];
    let filasProcesadas = 0;
    let filasError = 0;

    for (const item of itemsToProcess) {
      await supabase
        .from('generacion_job_items')
        .update({ estado: 'procesando' })
        .eq('id', item.id);

      let lastError: unknown = null;
      let ok = false;

      for (let intento = 0; intento <= MAX_RETRIES_429; intento++) {
        try {
          const valores = (item.datos_fila?.valores || []) as { valor?: string }[];
          const datos: Record<string, string> = {};

          if (columnMapping && Object.keys(columnMapping).length > 0) {
            for (const [placeholder, columnName] of Object.entries(columnMapping)) {
              const colIdx = headers.findIndex(
                (h: string) => String(h || '').trim() === String(columnName || '').trim()
              );
              const valor = colIdx >= 0 ? valores[colIdx] : null;
              datos[placeholder] =
                valor?.valor != null && valor.valor !== '' ? String(valor.valor) : '';
            }
          } else {
            for (const el of layout) {
              const colIdx = headers.findIndex(
                (h: string) => String(h || '').trim() === el.placeholder
              );
              const valor = colIdx >= 0 ? valores[colIdx] : null;
              datos[el.placeholder] =
                valor?.valor != null && valor.valor !== '' ? String(valor.valor) : '';
            }
          }

          const result = await slidesService.crearSlideConDatos(
            presentationId,
            templateType || 'ficha_local',
            datos,
            item.fila_index,
            layout
          );

          if (!result.exito || !result.datos) {
            throw new Error(result.error || 'Error al crear slide');
          }

          await supabase
            .from('generacion_job_items')
            .update({
              estado: 'completado',
              slide_id: result.datos
            })
            .eq('id', item.id);

          filasProcesadas++;
          ok = true;
          break;
        } catch (err) {
          lastError = err;
          if (is429(err) && intento < MAX_RETRIES_429) {
            await sleep(RETRY_DELAY_429_MS);
          } else {
            break;
          }
        }
      }

      if (!ok && lastError) {
        const errMsg = lastError instanceof Error ? lastError.message : 'Error desconocido';
        filasError++;
        errores.push({ fila: item.fila_index + 2, error: errMsg });
        await supabase
          .from('generacion_job_items')
          .update({ estado: 'error', error: errMsg })
          .eq('id', item.id);
      }

      await supabase
        .from('generacion_jobs')
        .update({
          filas_procesadas: filasProcesadas,
          filas_error: filasError,
          errores: errores,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      await sleep(DELAY_MS);
    }

    // Eliminar la slide plantilla original al terminar
    if (templateSlideId) {
      try {
        await slidesService.eliminarDiapositiva(presentationId, templateSlideId);
      } catch (err) {
        console.warn('[plantilla/process] No se pudo eliminar la slide plantilla:', err);
      }
    }

    await supabase
      .from('generacion_jobs')
      .update({
        estado: 'completado',
        filas_procesadas: filasProcesadas,
        filas_error: filasError,
        errores: errores,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Actualizar proyecto con la nueva presentación y slide_padre_id
    const proyectoId = job.proyecto_id as string | null;
    if (proyectoId) {
      await supabase
        .from('proyectos')
        .update({
          slides_id: presentationId,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', proyectoId);

      // Guardar slide_padre_id en metadata para asociar sheet con slides
      const { data: primerItem } = await supabase
        .from('generacion_job_items')
        .select('slide_id')
        .eq('job_id', jobId)
        .eq('estado', 'completado')
        .order('fila_index', { ascending: true })
        .limit(1)
        .single();

      if (filasProcesadas > 0 && primerItem?.slide_id) {
        const { data: proyecto } = await supabase
          .from('proyectos')
          .select('metadata')
          .eq('id', proyectoId)
          .single();

        const metadataActual = (proyecto?.metadata as Record<string, unknown>) || {};
        const metadataNuevo = {
          ...metadataActual,
          slide_padre_id: primerItem.slide_id
        };

        await supabase
          .from('proyectos')
          .update({
            metadata: metadataNuevo,
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id', proyectoId);
      }
    }

    return NextResponse.json({
      exito: true,
      datos: {
        generadas: filasProcesadas,
        fallidas: filasError,
        errores
      }
    });
  } catch (error) {
    console.error('[plantilla/process] Error:', error);
    return NextResponse.json(
      {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
