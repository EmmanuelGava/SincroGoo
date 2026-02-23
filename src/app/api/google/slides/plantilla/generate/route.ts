import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { SlidesService } from '@/app/servicios/google/slides/SlidesService';
import { PlantillaTemplateService } from '@/app/servicios/google/slides/PlantillaTemplateService';
import { SheetsService } from '@/servicios/google/sheets';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { LAYOUTS } from '@/app/servicios/google/slides/plantilla-layouts';

const getBaseUrl = (req: NextRequest) =>
  req.nextUrl.origin || process.env.NEXTAUTH_URL || 'http://localhost:3000';

/**
 * POST /api/google/slides/plantilla/generate
 * Crea un ARCHIVO NUEVO de Slides con la plantilla elegida, un job en cola, y dispara el procesamiento.
 * Retorna job_id. El process actualizará proyecto.slides_id con el nuevo archivo.
 * Body: { spreadsheetId, proyectoId, templateType, encabezados?, columnMapping?, tituloPresentacion? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      spreadsheetId,
      proyectoId,
      templateType: templateTypeBody,
      encabezados,
      columnMapping,
      tituloPresentacion
    } = body;

    if (!spreadsheetId || !proyectoId) {
      return NextResponse.json(
        { exito: false, error: 'Se requieren spreadsheetId y proyectoId' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: proyecto } = await supabase
      .from('proyectos')
      .select('usuario_id, nombre, metadata')
      .eq('id', proyectoId)
      .single();

    if (!proyecto?.usuario_id) {
      return NextResponse.json(
        { exito: false, error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    const templateType = templateTypeBody || (proyecto.metadata as Record<string, unknown>)?.plantilla_template_id as string | undefined;
    const tipoValido = templateType && LAYOUTS[templateType];
    if (!tipoValido) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere templateType válido (ej: ficha_local, catalogo_productos). O configúralo en el proyecto.' },
        { status: 400 }
      );
    }

    const slidesService = SlidesService.getInstance(session.accessToken);
    const plantillaService = new PlantillaTemplateService(slidesService);
    const sheetsService = SheetsService.getInstance(session.accessToken);

    const datosResult = await sheetsService.obtenerDatosHoja(spreadsheetId);
    if (!datosResult.exito || !datosResult.datos) {
      return NextResponse.json(
        { exito: false, error: datosResult.error || 'Error al leer el Sheet' },
        { status: 500 }
      );
    }

    const { encabezados: headers, filas } = datosResult.datos;
    if (filas.length === 0) {
      return NextResponse.json(
        { exito: false, error: 'El Sheet no tiene filas de datos' },
        { status: 400 }
      );
    }

    const titulo = tituloPresentacion || proyecto.nombre || 'Plantilla SincroGoo';
    const crearResult = await plantillaService.crearPresentacionDesdePlantilla(templateType, titulo);
    if (!crearResult) {
      return NextResponse.json(
        { exito: false, error: 'No se pudo crear la nueva presentación' },
        { status: 500 }
      );
    }

    const presentationId = crearResult.presentationId;
    const templateSlideId = crearResult.slideId;

    const { data: job, error: jobError } = await supabase
      .from('generacion_jobs')
      .insert({
        proyecto_id: proyectoId,
        usuario_id: proyecto.usuario_id,
        estado: 'pendiente',
        presentation_id: presentationId,
        spreadsheet_id: spreadsheetId,
        slide_template_id: templateSlideId,
        template_type: templateType,
        column_mapping: columnMapping || {},
        total_filas: filas.length
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('[plantilla/generate] Error creando job:', jobError);
      return NextResponse.json(
        { exito: false, error: 'Error al crear el job de generación' },
        { status: 500 }
      );
    }

    const items = filas.map((fila: { valores?: unknown[] }, i: number) => ({
      job_id: job.id,
      fila_index: i,
      datos_fila: {
        valores: fila.valores || [],
        encabezados: headers
      },
      estado: 'pendiente'
    }));

    const { error: itemsError } = await supabase.from('generacion_job_items').insert(items);
    if (itemsError) {
      console.error('[plantilla/generate] Error creando items:', itemsError);
      await supabase.from('generacion_jobs').delete().eq('id', job.id);
      return NextResponse.json(
        { exito: false, error: 'Error al crear los items del job' },
        { status: 500 }
      );
    }

    const base = getBaseUrl(request);
    const processUrl = `${base}/api/google/slides/plantilla/process`;
    fetch(processUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        accessToken: session.accessToken
      })
    }).catch((err) => console.error('[plantilla/generate] Error disparando process:', err));

    return NextResponse.json({
      exito: true,
      datos: {
        job_id: job.id,
        total_filas: filas.length
      }
    });
  } catch (error) {
    console.error('[plantilla/generate] Error:', error);
    return NextResponse.json(
      {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
