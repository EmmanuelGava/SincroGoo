import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

/**
 * GET /api/google/sheets/export-excel?spreadsheetId=xxx&nombre=MiHoja
 * Exporta un Google Sheet a .xlsx y retorna el archivo para descarga.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const spreadsheetId = searchParams.get('spreadsheetId')
    const nombre = searchParams.get('nombre') || 'hoja'

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Se requiere spreadsheetId' },
        { status: 400 }
      )
    }

    const exportUrl = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

    const response = await fetch(exportUrl, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Error desconocido')
      console.error('[API export-excel] Error de Drive API:', response.status, errorText)
      return NextResponse.json(
        { error: 'Error al exportar el Sheet' },
        { status: response.status }
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const nombreArchivo = nombre.replace(/[^a-zA-Z0-9_\-\s.áéíóúñÁÉÍÓÚÑ]/g, '_') + '.xlsx'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Content-Length': buffer.length.toString()
      }
    })
  } catch (error) {
    console.error('[API export-excel] Error:', error)
    return NextResponse.json(
      { error: 'Error al exportar la hoja de cálculo' },
      { status: 500 }
    )
  }
}
