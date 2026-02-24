import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

/**
 * POST /api/google/sheets/from-pdf
 * Extrae texto de un PDF y crea un Google Sheet con los datos.
 * FormData: { file: File (.pdf), nombreSheet?: string, modoTabla?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const nombreSheet = (formData.get('nombreSheet') as string) || file?.name?.replace(/\.pdf$/i, '') || 'PDF importado'
    const modoTabla = formData.get('modoTabla') === 'true'

    if (!file) {
      return NextResponse.json({ exito: false, error: 'Se requiere un archivo PDF' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfData = await pdfParse(buffer)
    const text = pdfData.text

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { exito: false, error: 'No se pudo extraer texto del PDF. El archivo puede contener solo imágenes.' },
        { status: 400 }
      )
    }

    let rows: string[][]
    const lines = text.split('\n').filter((l: string) => l.trim().length > 0)

    if (modoTabla) {
      // Intenta detectar tablas buscando líneas con separadores consistentes
      const separators = ['\t', '|', '  ']
      let bestSep = '\t'
      let bestCount = 0

      for (const sep of separators) {
        const counts = lines.map((l: string) => l.split(sep).length)
        const avgCount = counts.reduce((a: number, b: number) => a + b, 0) / counts.length
        if (avgCount > bestCount) {
          bestCount = avgCount
          bestSep = sep
        }
      }

      rows = lines.map((line: string) => {
        if (bestSep === '  ') {
          return line.split(/\s{2,}/).map((c: string) => c.trim())
        }
        return line.split(bestSep).map((c: string) => c.trim().replace(/^\||\|$/g, ''))
      })
    } else {
      rows = lines.map((line: string, i: number) => [`Línea ${i + 1}`, line.trim()])
      rows.unshift(['Línea', 'Texto'])
    }

    // Normalizar columnas
    const maxCols = Math.max(...rows.map(r => r.length))
    rows = rows.map(r => {
      while (r.length < maxCols) r.push('')
      return r
    })

    const token = session.accessToken

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: nombreSheet },
        sheets: [{ properties: { title: 'PDF' } }],
      }),
    })

    if (!createRes.ok) {
      return NextResponse.json({ exito: false, error: 'No se pudo crear el Sheet' }, { status: 500 })
    }

    const sheetData = await createRes.json()
    const spreadsheetId = sheetData.spreadsheetId

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/PDF?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'PDF', values: rows }),
      }
    )

    return NextResponse.json({
      exito: true,
      datos: {
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        filas: rows.length,
        columnas: maxCols,
        paginas: pdfData.numpages,
        preview: rows.slice(0, 5),
      },
    })
  } catch (error) {
    console.error('[sheets/from-pdf] Error:', error)
    return NextResponse.json(
      { exito: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
