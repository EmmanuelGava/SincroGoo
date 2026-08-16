"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  Menu,
  MessageSquare,
  Kanban,
  LayoutDashboard,
  Folder,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { ThemeToggleButton } from "./ThemeToggleButton"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/componentes/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/componentes/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/componentes/ui/sheet"
import { cn } from "@/app/lib/utils"

const primaryNav = [
  { name: "Chat", href: "/chat" },
  { name: "CRM", href: "/crm" },
  { name: "Dashboard", href: "/dashboard" },
]

const syncTools = [
  { name: "Mis proyectos", href: "/proyectos" },
  { name: "Nuevo proyecto", href: "/proyectos/nuevo" },
  { name: "Excel/CSV → Sheets", href: "/excel-to-sheets" },
  { name: "Excel/CSV → Slides", href: "/excel-to-slides" },
  { name: "Explorador", href: "/explorer" },
]

export function EncabezadoSistema() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const isAuthenticated = status === "authenticated"
  const initials = (session?.user?.name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const go = (href: string) => {
    setMobileOpen(false)
    router.push(href)
  }

  return (
    <header className="fixed top-0 z-50 h-[70px] w-full border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border md:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>KloSync</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {primaryNav.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => go(item.href)}
                  className={cn(
                    "rounded-md px-3 py-2 text-left text-sm",
                    pathname === item.href ? "bg-accent font-medium" : "hover:bg-accent"
                  )}
                >
                  {item.name}
                </button>
              ))}
              {syncTools.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => go(item.href)}
                  className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href={isAuthenticated ? "/chat" : "/"} className="flex items-center gap-2">
          <Image src="/logo.png" alt="KloSync" width={32} height={32} priority />
          <span className="hidden text-sm font-semibold tracking-wide md:inline">KLOSYNC</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                pathname === item.href
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {item.name}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              Sync Tools
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {syncTools.map((item) => (
                <DropdownMenuItem key={item.href} onClick={() => router.push(item.href)}>
                  <Folder className="mr-2 h-4 w-4" />
                  {item.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggleButton />
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none">
                <Avatar className="h-8 w-8 border">
                  <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || "Usuario"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-medium">{session?.user?.name || "Usuario"}</div>
                  <div className="text-xs text-muted-foreground">{session?.user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/chat")}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/crm")}>
                  <Kanban className="mr-2 h-4 w-4" />
                  Kanban
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/configuracion")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/configuracion/mensajeria")}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Mensajería
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ redirect: true, callbackUrl: "/" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth/login" className="rounded-md border px-3 py-1.5 text-sm">
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
