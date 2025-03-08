"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function PaginaErrorAuth() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [errorDescripcion, setErrorDescripcion] = useState<string>("Ha ocurrido un error durante la autenticación.")

  useEffect(() => {
    const errorParam = searchParams.get("error")
    setError(errorParam)

    // Personalizar mensaje según el tipo de error
    if (errorParam === "AccessDenied") {
      setErrorDescripcion("Has denegado el acceso a tu cuenta de Google. Necesitamos estos permisos para funcionar correctamente.")
    } else if (errorParam === "Configuration") {
      setErrorDescripcion("Hay un problema con la configuración de autenticación. Por favor, contacta al administrador.")
    } else if (errorParam === "OAuthCallback") {
      setErrorDescripcion("Hubo un problema durante el proceso de autenticación con Google. Por favor, intenta nuevamente.")
    } else if (errorParam === "OAuthAccountNotLinked") {
      setErrorDescripcion("Esta cuenta de correo ya está asociada a otro método de inicio de sesión.")
    } else if (errorParam === "Verification") {
      setErrorDescripcion("No se pudo verificar tu solicitud. Por favor, intenta nuevamente.")
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Error de Autenticación</CardTitle>
          <CardDescription>
            {errorDescripcion}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/10 p-3 rounded-md text-sm text-destructive mb-4">
              <p className="font-semibold">Código de error: {error}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/">
              Volver al Inicio
            </Link>
          </Button>
          <Button asChild>
            <Link href="/auth/login">
              Intentar Nuevamente
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 