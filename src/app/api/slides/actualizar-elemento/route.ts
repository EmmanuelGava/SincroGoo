import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    
    // Obtener datos del cuerpo de la solicitud
    const body = await req.json()
    const { presentacionId, diapositivaId, elementoId, contenido } = body
    
    if (!presentacionId || !diapositivaId || !elementoId || contenido === undefined) {
      return NextResponse.json(
        { error: 'Parámetros incompletos' },
        { status: 400 }
      )
    }

    // Simular actualización de elementos de diapositiva
    // En producción, harías una llamada a la API de Google Slides
    console.log('Actualizando elemento:', {
      presentacionId,
      diapositivaId,
      elementoId,
      contenido
    })

    // Simular un retraso de red
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({ 
      exito: true, 
      mensaje: 'Elemento actualizado correctamente' 
    })
  } catch (error) {
    console.error('Error al actualizar elemento de diapositiva:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
} 