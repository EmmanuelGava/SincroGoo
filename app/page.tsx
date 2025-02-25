"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (session) {
      const hasItems = sessionStorage.getItem('selectedItems')
      if (hasItems) {
        router.push("/dashboard/edit")
      } else {
        router.push("/dashboard")
      }
    }
  }, [session, router])

  const handleSignIn = async () => {
    try {
      await signIn("google", {
        callbackUrl: "/dashboard",
      })
    } catch (error) {
      console.error("Error al iniciar sesión:", error)
    }
  }

  const isLoading = status === "loading"

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Bienvenido a SincroGoo</CardTitle>
          <CardDescription>Sincroniza tus documentos de Google con facilidad</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <img src="/google.svg" alt="Google" className="mr-2 h-4 w-4" />
            )}
            Iniciar sesión con Google
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

