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
    
    // Obtener parámetros de la consulta
    const url = new URL(req.url)
    const hojaId = url.searchParams.get('hojaId')
    const indiceHoja = url.searchParams.get('indiceHoja')
    
    if (!hojaId || indiceHoja === null) {
      return NextResponse.json(
        { error: 'Parámetros incompletos' },
        { status: 400 }
      )
    }

    // Simular datos de la hoja
    // En producción, harías una llamada a la API de Google Sheets
    const datos = {
      columnas: ['nombre', 'empresa', 'ventas', 'fecha', 'descripcion'],
      filas: [
        {
          nombre: 'Juan Pérez',
          empresa: 'Empresa A',
          ventas: 15000,
          fecha: '2023-01-15',
          descripcion: 'Cliente premium con alto potencial'
        },
        {
          nombre: 'María García',
          empresa: 'Empresa B',
          ventas: 25000,
          fecha: '2023-02-20',
          descripcion: 'Nuevo cliente, primera compra grande'
        },
        {
          nombre: 'Carlos López',
          empresa: 'Empresa C',
          ventas: 18500,
          fecha: '2023-03-10',
          descripcion: 'Cliente habitual, compra trimestral'
        },
        {
          nombre: 'Ana Rodríguez',
          empresa: 'Empresa D',
          ventas: 32000,
          fecha: '2023-04-05',
          descripcion: 'Cliente VIP, contrato anual renovado'
        }
      ]
    }

    return NextResponse.json({ exito: true, datos })
  } catch (error) {
    console.error('Error al obtener datos de la hoja:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
} 