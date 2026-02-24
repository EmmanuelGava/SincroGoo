import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

/**
 * POST /api/google/sheets/clean-data
 * Analiza un Sheet y devuelve problemas detectados + preview de limpieza.
 * Body: { spreadsheetId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
    }

    const { spreadsheetId, accion } = await request.json()
    if (!spreadsheetId) {
      return NextResponse.json({ exito: false, error: 'spreadsheetId requerido' }, { status: 400 })
    }

    const token = session.accessToken

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z10000`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      return NextResponse.json({ exito: false, error: 'No se pudo leer el Sheet' }, { status: res.status })
    }

    const data = await res.json()
    const values: string[][] = data.values || []
    if (values.length < 2) {
      return NextResponse.json({ exito: false, error: 'El Sheet no tiene suficientes datos' }, { status: 400 })
    }

    const headers = values[0]
    const rows = values.slice(1)

    const problemas: {
      tipo: string
      descripcion: string
      columna?: string
      filas: number
      ejemplos: string[]
    }[] = []

    // 1. Detectar duplicados por fila completa
    const rowStrings = rows.map(r => r.join('|||'))
    const duplicados = new Map<string, number[]>()
    rowStrings.forEach((s, i) => {
      const arr = duplicados.get(s) || []
      arr.push(i + 2)
      duplicados.set(s, arr)
    })
    const filaDups = Array.from(duplicados.entries()).filter(([, v]) => v.length > 1)
    if (filaDups.length > 0) {
      const totalDups = filaDups.reduce((s, [, v]) => s + v.length - 1, 0)
      problemas.push({
        tipo: 'duplicados',
        descripcion: `${totalDups} filas duplicadas encontradas`,
        filas: totalDups,
        ejemplos: filaDups.slice(0, 3).map(([, v]) => `Filas ${v.join(', ')}`),
      })
    }

    // 2. Detectar espacios extra (leading/trailing)
    for (let col = 0; col < headers.length; col++) {
      const conEspacios = rows.filter(r => r[col] && r[col] !== r[col]?.trim())
      if (conEspacios.length > 0) {
        problemas.push({
          tipo: 'espacios',
          descripcion: `Espacios extra en "${headers[col]}"`,
          columna: headers[col],
          filas: conEspacios.length,
          ejemplos: conEspacios.slice(0, 3).map(r => `"${r[col]}" → "${r[col]?.trim()}"`),
        })
      }
    }

    // 3. Detectar teléfonos sin formato
    const phoneRegex = /^\+?\d[\d\s\-().]{6,}$/
    for (let col = 0; col < headers.length; col++) {
      const hLow = headers[col]?.toLowerCase() || ''
      if (hLow.includes('tel') || hLow.includes('phone') || hLow.includes('celular') || hLow.includes('móvil') || hLow.includes('movil')) {
        const sinFormato = rows.filter(r => r[col] && phoneRegex.test(r[col]) && !r[col].startsWith('+'))
        if (sinFormato.length > 0) {
          problemas.push({
            tipo: 'telefonos',
            descripcion: `Teléfonos sin formato internacional en "${headers[col]}"`,
            columna: headers[col],
            filas: sinFormato.length,
            ejemplos: sinFormato.slice(0, 3).map(r => `"${r[col]}" → "+${r[col].replace(/\D/g, '')}"`),
          })
        }
      }
    }

    // 4. Detectar emails inválidos
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (let col = 0; col < headers.length; col++) {
      const hLow = headers[col]?.toLowerCase() || ''
      if (hLow.includes('email') || hLow.includes('correo') || hLow.includes('mail')) {
        const invalidos = rows.filter(r => r[col] && !emailRegex.test(r[col].trim()))
        if (invalidos.length > 0) {
          problemas.push({
            tipo: 'emails',
            descripcion: `Emails posiblemente inválidos en "${headers[col]}"`,
            columna: headers[col],
            filas: invalidos.length,
            ejemplos: invalidos.slice(0, 3).map(r => `"${r[col]}"`),
          })
        }
      }
    }

    // 5. Detectar capitalización inconsistente en nombres
    for (let col = 0; col < headers.length; col++) {
      const hLow = headers[col]?.toLowerCase() || ''
      if (hLow.includes('nombre') || hLow.includes('name') || hLow.includes('empresa') || hLow.includes('company')) {
        const inconsistentes = rows.filter(r => {
          const v = r[col]
          if (!v || v.length < 2) return false
          return v === v.toLowerCase() || v === v.toUpperCase()
        })
        if (inconsistentes.length > 3) {
          problemas.push({
            tipo: 'capitalizacion',
            descripcion: `Capitalización inconsistente en "${headers[col]}"`,
            columna: headers[col],
            filas: inconsistentes.length,
            ejemplos: inconsistentes.slice(0, 3).map(r => {
              const v = r[col]
              const fixed = v.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
              return `"${v}" → "${fixed}"`
            }),
          })
        }
      }
    }

    // 6. Celdas vacías en columnas que deberían tener datos
    for (let col = 0; col < headers.length; col++) {
      const vacias = rows.filter(r => !r[col] || r[col].trim() === '')
      const ratio = vacias.length / rows.length
      if (ratio > 0 && ratio < 0.5 && vacias.length > 2) {
        problemas.push({
          tipo: 'vacias',
          descripcion: `${vacias.length} celdas vacías en "${headers[col]}"`,
          columna: headers[col],
          filas: vacias.length,
          ejemplos: [`${vacias.length} de ${rows.length} filas (${Math.round(ratio * 100)}%)`],
        })
      }
    }

    // Si accion === 'aplicar', aplicar las correcciones y crear copia
    if (accion === 'aplicar') {
      const cleanedRows = [...rows]

      // Eliminar duplicados
      const seen = new Set<string>()
      const uniqueRows: string[][] = []
      for (const row of cleanedRows) {
        const key = row.join('|||')
        if (!seen.has(key)) {
          seen.add(key)
          uniqueRows.push(row)
        }
      }

      // Trim + capitalización
      const finalRows = uniqueRows.map(row =>
        row.map((cell, col) => {
          if (!cell) return cell
          let v = cell.trim()
          const hLow = headers[col]?.toLowerCase() || ''
          if (hLow.includes('nombre') || hLow.includes('name') || hLow.includes('empresa') || hLow.includes('company')) {
            if (v === v.toLowerCase() || v === v.toUpperCase()) {
              v = v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
            }
          }
          return v
        })
      )

      const nombre = `${data.range?.split('!')[0] || 'Sheet'} (limpio)`
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: { title: nombre },
          sheets: [{ properties: { title: 'Limpio' } }],
        }),
      })

      if (!createRes.ok) {
        return NextResponse.json({ exito: false, error: 'No se pudo crear Sheet limpio' }, { status: 500 })
      }

      const newSheet = await createRes.json()
      const newId = newSheet.spreadsheetId

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${newId}/values/Limpio?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Limpio', values: [headers, ...finalRows] }),
        }
      )

      return NextResponse.json({
        exito: true,
        datos: {
          spreadsheetId: newId,
          url: `https://docs.google.com/spreadsheets/d/${newId}/edit`,
          filasOriginales: rows.length,
          filasLimpias: finalRows.length,
          eliminadas: rows.length - finalRows.length,
        },
      })
    }

    return NextResponse.json({
      exito: true,
      datos: {
        totalFilas: rows.length,
        totalColumnas: headers.length,
        encabezados: headers,
        problemas,
      },
    })
  } catch (error) {
    console.error('[sheets/clean-data] Error:', error)
    return NextResponse.json(
      { exito: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
