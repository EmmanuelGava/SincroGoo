import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

/**
 * POST /api/google/sheets/merge
 * Fusiona datos de múltiples Google Sheets en un nuevo Sheet.
 * Body: {
 *   sheets: Array<{ spreadsheetId: string, name: string }>,
 *   nombreResultado: string,
 *   modo: 'append' | 'merge_by_key',
 *   columnaKey?: string  (solo para merge_by_key)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { sheets, nombreResultado, modo, columnaKey } = body

    if (!sheets || !Array.isArray(sheets) || sheets.length < 2) {
      return NextResponse.json(
        { exito: false, error: 'Se requieren al menos 2 sheets para fusionar' },
        { status: 400 }
      )
    }

    if (!nombreResultado) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere nombreResultado' },
        { status: 400 }
      )
    }

    const token = session.accessToken
    const allData: { name: string; headers: string[]; rows: string[][] }[] = []

    for (const sheet of sheets) {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/A1:Z10000`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        return NextResponse.json(
          { exito: false, error: `Error al leer "${sheet.name}"` },
          { status: res.status }
        )
      }
      const data = await res.json()
      const values = data.values || []
      if (values.length === 0) continue
      allData.push({
        name: sheet.name,
        headers: values[0] as string[],
        rows: values.slice(1) as string[][],
      })
    }

    if (allData.length === 0) {
      return NextResponse.json(
        { exito: false, error: 'Ninguno de los sheets tiene datos' },
        { status: 400 }
      )
    }

    let mergedHeaders: string[]
    let mergedRows: string[][]

    if (modo === 'merge_by_key' && columnaKey) {
      const allHeaders = new Set<string>()
      allData.forEach(d => d.headers.forEach(h => allHeaders.add(h)))
      mergedHeaders = Array.from(allHeaders)

      const keyIndex = (headers: string[]) => headers.indexOf(columnaKey)
      const rowMap = new Map<string, string[]>()

      for (const d of allData) {
        const ki = keyIndex(d.headers)
        if (ki === -1) continue
        for (const row of d.rows) {
          const key = row[ki] || ''
          if (!key) continue
          const existing = rowMap.get(key) || new Array(mergedHeaders.length).fill('')
          for (let i = 0; i < d.headers.length; i++) {
            const mi = mergedHeaders.indexOf(d.headers[i])
            if (mi !== -1 && row[i]) {
              existing[mi] = row[i]
            }
          }
          rowMap.set(key, existing)
        }
      }
      mergedRows = Array.from(rowMap.values())
    } else {
      mergedHeaders = allData[0].headers
      mergedRows = []
      for (const d of allData) {
        for (const row of d.rows) {
          const aligned = mergedHeaders.map((h, i) => {
            const srcIdx = d.headers.indexOf(h)
            return srcIdx !== -1 ? (row[srcIdx] || '') : ''
          })
          mergedRows.push(aligned)
        }
      }
    }

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: nombreResultado },
        sheets: [{ properties: { title: 'Fusionado' } }],
      }),
    })

    if (!createRes.ok) {
      return NextResponse.json(
        { exito: false, error: 'No se pudo crear el Sheet resultado' },
        { status: createRes.status }
      )
    }

    const sheetData = await createRes.json()
    const spreadsheetId = sheetData.spreadsheetId

    const valores = [mergedHeaders, ...mergedRows]
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Fusionado?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ range: 'Fusionado', values: valores }),
      }
    )

    return NextResponse.json({
      exito: true,
      datos: {
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        filas: mergedRows.length,
        columnas: mergedHeaders.length,
        sheetsUsados: allData.length,
      },
    })
  } catch (error) {
    console.error('[sheets/merge] Error:', error)
    return NextResponse.json(
      { exito: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
