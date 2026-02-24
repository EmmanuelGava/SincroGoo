import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

/**
 * GET /api/google/slides/export-pptx?presentationId=xxx&nombre=MiPresentacion
 * Exporta una presentación de Google Slides a .pptx y retorna el archivo para descarga.
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

    const exportUrl = `https://www.googleapis.com/drive/v3/files/${presentationId}/export?mimeType=application/vnd.openxmlformats-officedocument.presentationml.presentation`

    const response = await fetch(exportUrl, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Error desconocido')
      console.error('[API export-pptx] Error de Drive API:', response.status, errorText)
      return NextResponse.json(
        { error: 'Error al exportar la presentación' },
        { status: response.status }
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const nombreArchivo = nombre.replace(/[^a-zA-Z0-9_\-\s.áéíóúñÁÉÍÓÚÑ]/g, '_') + '.pptx'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Content-Length': buffer.length.toString()
      }
    })
  } catch (error) {
    console.error('[API export-pptx] Error:', error)
    return NextResponse.json(
      { error: 'Error al exportar la presentación' },
      { status: 500 }
    )
  }
}
