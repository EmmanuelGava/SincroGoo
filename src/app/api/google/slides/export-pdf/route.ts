import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/options'
import { SlidesService } from '@/app/servicios/google/slides/SlidesService'

/**
 * GET /api/google/slides/export-pdf?presentationId=xxx&nombre=Presentacion
 * Exporta la presentación a PDF y retorna el archivo para descarga.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const presentationId = searchParams.get('presentationId')
    const nombre = searchParams.get('nombre') || 'presentacion'

    if (!presentationId) {
      return NextResponse.json(
        { error: 'Se requiere presentationId' },
        { status: 400 }
      )
    }

    const slidesService = SlidesService.getInstance(session.accessToken)
    const resultado = await slidesService.exportarAPdf(presentationId, nombre)

    if (!resultado.exito || !resultado.datos) {
      return NextResponse.json(
        { error: resultado.error || 'Error al exportar a PDF' },
        { status: 500 }
      )
    }

    const { buffer, nombreArchivo } = resultado.datos
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Content-Length': buffer.length.toString()
      }
    })
  } catch (error) {
    console.error('[API export-pdf] Error:', error)
    return NextResponse.json(
      { error: 'Error al exportar la presentación' },
      { status: 500 }
    )
  }
}
