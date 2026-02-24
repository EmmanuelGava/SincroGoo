import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

/**
 * POST /api/webhooks/sheet-change
 * Webhook llamado por Google Apps Script cuando un Sheet vinculado cambia.
 * Body: { spreadsheetId: string, sheetName?: string, secret: string }
 * 
 * Instrucciones para Google Apps Script:
 * 
 *   function onEdit(e) {
 *     var ss = SpreadsheetApp.getActiveSpreadsheet();
 *     var payload = {
 *       spreadsheetId: ss.getId(),
 *       sheetName: e.source.getActiveSheet().getName(),
 *       secret: "TU_WEBHOOK_SECRET"
 *     };
 *     UrlFetchApp.fetch("https://tu-dominio.com/api/webhooks/sheet-change", {
 *       method: "post",
 *       contentType: "application/json",
 *       payload: JSON.stringify(payload)
 *     });
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { spreadsheetId, sheetName, secret } = body

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'spreadsheetId requerido' }, { status: 400 })
    }

    const expectedSecret = process.env.WEBHOOK_SHEET_SECRET
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    const { data: proyectos, error } = await supabase
      .from('proyectos')
      .select('id, usuario_id, slides_id, sheets_id, sync_automatica')
      .eq('sheets_id', spreadsheetId)
      .eq('sync_automatica', true)

    if (error) {
      console.error('[webhook/sheet-change] Error buscando proyectos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!proyectos || proyectos.length === 0) {
      return NextResponse.json({
        message: 'No hay proyectos con sync automática para este Sheet',
        triggered: 0,
      })
    }

    const resultados: { proyecto_id: string; ok: boolean; error?: string }[] = []

    for (const proyecto of proyectos) {
      if (!proyecto.slides_id) {
        resultados.push({ proyecto_id: proyecto.id, ok: false, error: 'Sin presentación vinculada' })
        continue
      }

      try {
        const { error: jobError } = await supabase.from('generacion_jobs').insert({
          proyecto_id: proyecto.id,
          usuario_id: proyecto.usuario_id,
          estado: 'pendiente',
          spreadsheet_id: proyecto.sheets_id,
          presentation_id: proyecto.slides_id,
          total_filas: 0,
          filas_procesadas: 0,
          filas_error: 0,
        })

        if (jobError) {
          resultados.push({ proyecto_id: proyecto.id, ok: false, error: jobError.message })
        } else {
          await supabase
            .from('proyectos')
            .update({ ultima_sync: new Date().toISOString() })
            .eq('id', proyecto.id)

          resultados.push({ proyecto_id: proyecto.id, ok: true })
        }
      } catch (e) {
        resultados.push({
          proyecto_id: proyecto.id,
          ok: false,
          error: e instanceof Error ? e.message : 'Error desconocido',
        })
      }
    }

    return NextResponse.json({
      message: `${resultados.filter(r => r.ok).length}/${proyectos.length} syncs disparadas`,
      triggered: resultados.filter(r => r.ok).length,
      resultados,
    })
  } catch (error) {
    console.error('[webhook/sheet-change] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
