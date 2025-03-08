"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/ModeToggle"
import { 
  FileSpreadsheet, 
  PresentationIcon, 
  Home, 
  Menu, 
  User, 
  LogOut,
  Settings,
  LayoutGrid
} from "lucide-react"

export function EncabezadoSitio() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const rutas = [
    {
      nombre: "Inicio",
      ruta: "/",
      icono: <Home className="h-4 w-4 mr-2" />,
    },
    {
      nombre: "Proyectos",
      ruta: "/proyectos",
      icono: <LayoutGrid className="h-4 w-4 mr-2" />,
    },
    {
      nombre: "Presentaciones",
      ruta: "/presentaciones",
      icono: <PresentationIcon className="h-4 w-4 mr-2" />,
    },
    {
      nombre: "Hojas de Cálculo",
      ruta: "/hojas-de-calculo",
      icono: <FileSpreadsheet className="h-4 w-4 mr-2" />,
    },
    {
      nombre: "Sincronizar",
      ruta: "/sincronizar",
      icono: <Settings className="h-4 w-4 mr-2" />,
    },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <PresentationIcon className="h-6 w-6" />
            <span className="font-bold text-xl">SincroGoo</span>
          </Link>
        </div>

        {/* Navegación para escritorio */}
        <nav className="hidden md:flex items-center gap-1">
          {rutas.map((ruta) => (
            <Button
              key={ruta.ruta}
              variant={pathname === ruta.ruta ? "default" : "ghost"}
              asChild
            >
              <Link href={ruta.ruta} className="flex items-center">
                {ruta.icono}
                {ruta.nombre}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Navegación móvil */}
        {menuAbierto && (
          <div className="absolute top-16 left-0 w-full bg-background border-b md:hidden">
            <nav className="container py-2">
              {rutas.map((ruta) => (
                <Button
                  key={ruta.ruta}
                  variant={pathname === ruta.ruta ? "default" : "ghost"}
                  className="w-full justify-start mb-1"
                  asChild
                  onClick={() => setMenuAbierto(false)}
                >
                  <Link href={ruta.ruta} className="flex items-center">
                    {ruta.icono}
                    {ruta.nombre}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>
        )}

        <div className="flex items-center gap-2">
          <ModeToggle />
          
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/auth/login">Iniciar Sesión</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
} 