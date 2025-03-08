import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    
    // Obtener ID de la hoja de cálculo de los parámetros de la consulta
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de hoja de cálculo no proporcionado' },
        { status: 400 }
      )
    }

    // Simular datos de hoja de cálculo
    // En producción, harías una llamada a la API de Google Sheets
    const hojaCalculo = {
      id,
      titulo: 'Hoja de datos de ejemplo',
      hojas: [
        {
          id: 'h1',
          titulo: 'Ventas',
          indice: 0
        },
        {
          id: 'h2',
          titulo: 'Gastos',
          indice: 1
        },
        {
          id: 'h3',
          titulo: 'Inventario',
          indice: 2
        }
      ]
    }

    return NextResponse.json({ exito: true, datos: hojaCalculo })
  } catch (error) {
    console.error('Error en la ruta API de Google Sheets:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
} 