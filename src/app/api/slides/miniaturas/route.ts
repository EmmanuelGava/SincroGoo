import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    
    // Obtener ID de la presentación de los parámetros de la consulta
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de presentación no proporcionado' },
        { status: 400 }
      )
    }

    // Simular datos de miniaturas
    // En producción, harías una llamada a la API de Google Slides
    const diapositivas = [
      {
        id: 'p1',
        titulo: 'Diapositiva 1',
        urlImagen: 'https://via.placeholder.com/800x450?text=Slide+1',
        indice: 0
      },
      {
        id: 'p2',
        titulo: 'Diapositiva 2',
        urlImagen: 'https://via.placeholder.com/800x450?text=Slide+2',
        indice: 1
      },
      {
        id: 'p3',
        titulo: 'Diapositiva 3',
        urlImagen: 'https://via.placeholder.com/800x450?text=Slide+3',
        indice: 2
      },
      {
        id: 'p4',
        titulo: 'Diapositiva 4',
        urlImagen: 'https://via.placeholder.com/800x450?text=Slide+4',
        indice: 3
      }
    ]

    return NextResponse.json({ exito: true, datos: diapositivas })
  } catch (error) {
    console.error('Error al obtener miniaturas:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
} 