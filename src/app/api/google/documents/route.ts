import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export const dynamic = 'force-dynamic'

interface DriveDocument {
  id: string
  name: string
  iconUrl: string
  thumbnailLink?: string
  lastModified: string
  type: 'sheets' | 'slides'
}

export async function GET(req: NextRequest) {
  try {
    console.log("Iniciando petición a /api/google/documents")
    
    // Verificar headers de autorización
    const authHeader = req.headers.get('authorization')
    console.log("Headers de autorización:", { 
      hasAuthHeader: !!authHeader,
      authType: authHeader?.split(' ')[0]
    })

    const token = await getToken({ 
      req,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    console.log("Token obtenido:", { 
      hasToken: !!token,
      hasAccessToken: !!token?.accessToken,
      tokenType: typeof token?.accessToken
    })
    
    if (!token?.accessToken) {
      console.error("No hay token de acceso válido")
      return NextResponse.json({ 
        error: "No autorizado",
        details: "Token de acceso no encontrado"
      }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get("type")

    console.log("Parámetros de búsqueda:", { type })

    let query = ""
    if (type === "sheets") {
      query = "mimeType='application/vnd.google-apps.spreadsheet'"
    } else if (type === "slides") {
      query = "mimeType='application/vnd.google-apps.presentation'"
    } else {
      query = "(mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.presentation')"
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,modifiedTime,iconLink,thumbnailLink,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true`
    
    console.log("URL de la petición a Drive API:", url)

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store'
      })

      console.log("Respuesta de Drive API recibida:", { 
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error en la respuesta de Drive API:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        return NextResponse.json({ 
          error: "Error al acceder a Google Drive",
          details: errorText,
          status: response.status
        }, { status: response.status })
      }

      const data = await response.json()
      console.log("Datos recibidos de Drive API:", {
        hasFiles: !!data.files,
        filesCount: data.files?.length || 0,
        dataKeys: Object.keys(data)
      })

      if (!data.files) {
        console.log("No hay archivos en la respuesta")
        return NextResponse.json({ documents: [] })
      }

      const documents: DriveDocument[] = data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        iconUrl: file.iconLink,
        thumbnailLink: file.thumbnailLink,
        lastModified: file.modifiedTime,
        type: file.mimeType.includes('spreadsheet') ? 'sheets' : 'slides'
      }))

      console.log("Documentos procesados exitosamente:", {
        count: documents.length,
        types: documents.map(d => d.type)
      })

      return NextResponse.json({ documents })
    } catch (fetchError) {
      console.error("Error al realizar la petición a Drive API:", {
        error: fetchError,
        message: fetchError instanceof Error ? fetchError.message : 'Error desconocido',
        stack: fetchError instanceof Error ? fetchError.stack : undefined
      })
      return NextResponse.json({ 
        error: "Error al comunicarse con Google Drive",
        details: fetchError instanceof Error ? fetchError.message : 'Error desconocido'
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error general en /api/google/documents:", {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json({
      error: "Error al procesar la petición",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
} 