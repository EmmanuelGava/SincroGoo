import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { updates, slidesId, token } = await request.json()

    if (!updates || !slidesId || !token) {
      return NextResponse.json({ error: "Faltan datos necesarios" }, { status: 400 })
    }

    // Realizar la actualización en Google Slides
    const response = await fetch(`https://slides.googleapis.com/v1/presentations/${slidesId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: updates.map((update: any) => ({
          replaceAllText: {
            containsText: {
              text: update.oldPrice,
              matchCase: true,
            },
            replaceText: update.newPrice,
          },
        })),
      }),
    })

    if (!response.ok) {
      throw new Error("Error al actualizar las diapositivas")
    }

    const result = await response.json()

    return NextResponse.json({ message: "Precios actualizados correctamente", result }, { status: 200 })
  } catch (error) {
    console.error("Error en la sincronización:", error)
    return NextResponse.json({ error: "Error al procesar la sincronización" }, { status: 500 })
  }
}

