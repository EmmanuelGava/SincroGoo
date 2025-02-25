"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleAuth() {
      try {
        // Obtener el token de acceso del hash de la URL
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get("access_token")

        if (!accessToken) {
          throw new Error("No se recibió el token de acceso")
        }

        // Verificar el token obteniendo información del usuario
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!userResponse.ok) {
          throw new Error("Error al verificar el token")
        }

        const userData = await userResponse.json()

        // Guardar la información necesaria
        localStorage.setItem("googleAccessToken", accessToken)
        localStorage.setItem("userEmail", userData.email)
        localStorage.setItem("userName", userData.name)

        // Redirigir al dashboard
        router.push("/dashboard")
      } catch (error) {
        console.error("Error de autenticación:", error)
        setError("Error al autenticar con Google")
      }
    }

    handleAuth()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-800 p-4">
        <Card className="w-full max-w-md bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-center text-white">Error de autenticación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-red-400">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Volver al inicio
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-800 p-4">
      <Card className="w-full max-w-md bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-center text-white">Autenticando...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

