import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

/**
 * POST /api/google/slides/slides-to-sheet
 * Extrae textos de cada slide de una presentación y crea un Google Sheet.
 * Body: { presentationId: string, nombreSheet?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { presentationId, nombreSheet } = body

    if (!presentationId) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere presentationId' },
        { status: 400 }
      )
    }

    const token = session.accessToken

    const presRes = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!presRes.ok) {
      const err = await presRes.json().catch(() => ({}))
      return NextResponse.json(
        { exito: false, error: err.error?.message || 'No se pudo leer la presentación' },
        { status: presRes.status }
      )
    }

    const presData = await presRes.json()
    const titulo = presData.title || 'Presentación'
    const slides = presData.slides || []

    const encabezados = ['Slide', 'Textos']
    const filas: string[][] = []

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      const textos: string[] = []
      extractTexts(slide.pageElements || [], textos)
      filas.push([`Slide ${i + 1}`, textos.join(' | ')])
    }

    const sheetTitle = nombreSheet || `Datos de: ${titulo}`
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: sheetTitle },
        sheets: [{ properties: { title: 'Slides' } }],
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}))
      return NextResponse.json(
        { exito: false, error: err.error?.message || 'No se pudo crear el Sheet' },
        { status: createRes.status }
      )
    }

    const sheetData = await createRes.json()
    const spreadsheetId = sheetData.spreadsheetId

    const valores = [encabezados, ...filas]
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Slides?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ range: 'Slides', values: valores }),
      }
    )

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}))
      return NextResponse.json(
        { exito: false, error: err.error?.message || 'No se pudieron escribir los datos' },
        { status: updateRes.status }
      )
    }

    return NextResponse.json({
      exito: true,
      datos: {
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        slides: filas.length,
        titulo: sheetTitle,
      },
    })
  } catch (error) {
    console.error('[slides-to-sheet] Error:', error)
    return NextResponse.json(
      { exito: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

function extractTexts(elements: any[], out: string[]) {
  for (const el of elements) {
    if (el.shape?.text?.textElements) {
      for (const te of el.shape.text.textElements) {
        const raw = te.textRun?.content?.trim()
        if (raw) out.push(raw)
      }
    }
    if (el.table) {
      for (const row of el.table.tableRows || []) {
        for (const cell of row.tableCells || []) {
          if (cell.text?.textElements) {
            for (const te of cell.text.textElements) {
              const raw = te.textRun?.content?.trim()
              if (raw) out.push(raw)
            }
          }
        }
      }
    }
    if (el.group?.children) {
      extractTexts(el.group.children, out)
    }
  }
}
