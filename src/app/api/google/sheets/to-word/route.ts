import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

/**
 * POST /api/google/sheets/to-word
 * Genera un archivo .docx por cada fila de un Google Sheet usando una plantilla Word.
 * FormData: { template: File (.docx), spreadsheetId: string, nombreDocumento?: string }
 * 
 * La plantilla usa placeholders con {NombreColumna} que se reemplazan por valores de cada fila.
 * Retorna un .docx con los datos de la primera fila (o todas las filas si se especifica).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const template = formData.get('template') as File
    const spreadsheetId = formData.get('spreadsheetId') as string
    const nombreDocumento = formData.get('nombreDocumento') as string || 'documento'

    if (!template || !spreadsheetId) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere template (.docx) y spreadsheetId' },
        { status: 400 }
      )
    }

    const token = session.accessToken

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z10000`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      return NextResponse.json({ exito: false, error: 'No se pudo leer el Sheet' }, { status: res.status })
    }

    const sheetData = await res.json()
    const values: string[][] = sheetData.values || []
    if (values.length < 2) {
      return NextResponse.json({ exito: false, error: 'El Sheet no tiene suficientes datos' }, { status: 400 })
    }

    const headers = values[0]
    const rows = values.slice(1)

    const templateBuffer = await template.arrayBuffer()
    const zip = new PizZip(templateBuffer)

    const filaIndex = parseInt(formData.get('fila') as string || '0', 10)
    const fila = rows[filaIndex] || rows[0]

    const data: Record<string, string> = {}
    headers.forEach((h, i) => {
      data[h] = fila[i] || ''
    })

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
    })

    doc.render(data)

    const buffer = doc.getZip().generate({ type: 'nodebuffer' })
    const nombreArchivo = `${nombreDocumento.replace(/[^a-zA-Z0-9_\-\s.áéíóúñ]/gi, '_')}.docx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[sheets/to-word] Error:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ exito: false, error: msg }, { status: 500 })
  }
}
