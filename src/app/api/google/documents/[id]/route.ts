import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

type DocumentType = 'sheets' | 'slides'

interface DriveDocument {
  id: string
  name: string
  iconUrl: string
  modifiedTime: string
  type: DocumentType
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req })
    
    if (!token?.accessToken) {
      console.error("No hay token de acceso")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get("type") as DocumentType
    const id = params.id

    console.log("Verificando documento:", { id, type })

    if (!id || !type || (type !== 'sheets' && type !== 'slides')) {
      console.error("Parámetros inválidos:", { id, type })
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
    }

    const url = `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,modifiedTime,iconLink,mimeType&supportsAllDrives=true`
    console.log("Realizando petición a Drive API:", { url })

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error en la respuesta de Drive API:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return NextResponse.json({ error: "No se pudo acceder al documento" }, { status: response.status })
    }

    const data = await response.json()
    console.log("Respuesta de Drive API:", data)

    // Verificar que el tipo de documento coincida
    const expectedMimeType = type === 'sheets' 
      ? 'application/vnd.google-apps.spreadsheet'
      : 'application/vnd.google-apps.presentation'

    if (data.mimeType !== expectedMimeType) {
      console.error("Tipo de documento incorrecto:", {
        expected: expectedMimeType,
        received: data.mimeType
      })
      return NextResponse.json({ 
        error: `El documento no es una ${type === 'sheets' ? 'hoja de cálculo' : 'presentación'} válida` 
      }, { status: 400 })
    }

    const document: DriveDocument = {
      id: data.id,
      name: data.name,
      iconUrl: data.iconLink,
      modifiedTime: data.modifiedTime,
      type
    }

    console.log("Documento verificado:", document)

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error detallado en /api/google/documents/[id]:", {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al verificar el documento" },
      { status: 500 }
    )
  }
} 