"use client"

import { Button } from "@/componentes/ui/button"
import { LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { toast } from "sonner"

interface DashboardHeaderProps {
  userName: string
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false })
      toast.success("Sesión cerrada correctamente")
      router.push("/")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      toast.error("Error al cerrar sesión")
    }
  }

  return (
    <header className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
      <div className="flex items-center text-muted-foreground">
        <User className="mr-2 h-4 w-4" />
        <span>Bienvenido, {userName}</span>
      </div>
    </header>
  )
}

