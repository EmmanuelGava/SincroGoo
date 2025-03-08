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
    
    // Obtener parámetros de la consulta
    const url = new URL(req.url)
    const presentacionId = url.searchParams.get('presentacionId')
    const diapositivaId = url.searchParams.get('diapositivaId')
    
    if (!presentacionId || !diapositivaId) {
      return NextResponse.json(
        { error: 'Parámetros incompletos' },
        { status: 400 }
      )
    }

    // Simular datos de elementos de diapositiva
    // En producción, harías una llamada a la API de Google Slides
    const elementosSimulados = [
      {
        id: 'e1',
        tipo: 'texto',
        contenido: 'Título de la diapositiva con variables {{nombre}} y {{fecha}}',
      },
      {
        id: 'e2',
        tipo: 'texto',
        contenido: 'Subtítulo con datos {{empresa}} - Ventas: {{ventas}}',
      },
      {
        id: 'e3',
        tipo: 'texto',
        contenido: 'Contenido informativo con variable {{descripcion}}',
      }
    ]

    return NextResponse.json({ exito: true, datos: elementosSimulados })
  } catch (error) {
    console.error('Error al obtener elementos de diapositiva:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
} 