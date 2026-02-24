import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

/**
 * POST /api/google/slides/import-pptx
 * Sube un archivo .pptx y lo convierte a Google Slides usando Drive API.
 * FormData: { file: File (.pptx), nombre?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const nombre = (formData.get('nombre') as string) || file?.name?.replace(/\.pptx$/i, '') || 'Presentación importada'

    if (!file) {
      return NextResponse.json({ exito: false, error: 'Se requiere un archivo .pptx' }, { status: 400 })
    }

    const token = session.accessToken
    const fileBuffer = await file.arrayBuffer()

    // 1. Crear metadata del archivo con conversión a Google Slides
    const metadata = JSON.stringify({
      name: nombre,
      mimeType: 'application/vnd.google-apps.presentation',
    })

    const boundary = '---boundary' + Date.now()
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n`),
      Buffer.from(fileBuffer),
      Buffer.from(`\r\n--${boundary}--`),
    ])

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&convert=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    )

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}))
      console.error('[import-pptx] Error de Drive API:', err)
      return NextResponse.json(
        { exito: false, error: err.error?.message || 'Error al importar el archivo' },
        { status: uploadRes.status }
      )
    }

    const driveFile = await uploadRes.json()

    return NextResponse.json({
      exito: true,
      datos: {
        presentationId: driveFile.id,
        url: `https://docs.google.com/presentation/d/${driveFile.id}/edit`,
        nombre: driveFile.name,
      },
    })
  } catch (error) {
    console.error('[import-pptx] Error:', error)
    return NextResponse.json(
      { exito: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
