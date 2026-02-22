import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { SlidesService } from "@/app/servicios/google/slides/SlidesService"

export const dynamic = 'force-dynamic'

/**
 * Proxy para miniaturas de Drive y Slides.
 * - Drive thumbnailLink falla por CORS en <img>, lo obtenemos en servidor.
 * - Para presentaciones sin thumbnail en Drive, usamos Slides API (1ª diapositiva).
 */
export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get("fileId")
    const type = req.nextUrl.searchParams.get("type") // "slides" para presentaciones
    if (!fileId) {
      return NextResponse.json({ error: "Se requiere fileId" }, { status: 400 })
    }

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET
    })

    if (!token?.accessToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // 1. Intentar Drive thumbnailLink
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink,mimeType&supportsAllDrives=true`
    const driveRes = await fetch(driveUrl, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    let thumbnailUrl: string | null = null
    let mimeType = ""
    if (driveRes.ok) {
      const driveData = await driveRes.json()
      thumbnailUrl = driveData?.thumbnailLink || null
      mimeType = driveData?.mimeType || ""
    }
    const isPresentation = type === "slides" || mimeType.includes("presentation")

    // 2. Si es presentación y Drive no tiene thumbnail: solo 1ª diapositiva (evita N llamadas y rate limit)
    if (!thumbnailUrl && isPresentation) {
      try {
        const accessToken = token.accessToken as string
        if (accessToken) {
          const slidesService = SlidesService.getInstance(accessToken)
          const res = await slidesService.obtenerPrimeraMiniatura(fileId)
          const thumbUrl = (res.exito && res.datos) ? res.datos : null
          if (thumbUrl) {
            const imgRes = await fetch(thumbUrl, {
              cache: "no-store",
              headers: { Authorization: `Bearer ${accessToken}` },
            })
            if (imgRes.ok) {
              const blob = await imgRes.blob()
              return new NextResponse(blob, {
                headers: {
                  "Content-Type": "image/png",
                  "Cache-Control": "public, max-age=3600",
                },
              })
            }
          }
        }
      } catch (slidesErr) {
        console.warn("[thumbnail] Slides API fallback:", slidesErr)
      }
    }

    if (!thumbnailUrl) {
      return NextResponse.json({ error: "El archivo no tiene miniatura" }, { status: 404 })
    }

    const thumbUrl = thumbnailUrl.replace(/=s\d+/, "=s400")
    const imgRes = await fetch(thumbUrl, {
      headers: { Accept: "image/*" },
      cache: "no-store",
    })

    if (!imgRes.ok) {
      return NextResponse.json({ error: "No se pudo cargar la imagen" }, { status: 502 })
    }

    const blob = await imgRes.blob()
    const contentType = imgRes.headers.get("content-type") || "image/png"

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[thumbnail] Error:", error)
    return NextResponse.json(
      { error: "Error al obtener la miniatura" },
      { status: 500 }
    )
  }
}
