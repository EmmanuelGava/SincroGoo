"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"
import Image from "next/image"

export function SiteHeader() {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const { data: session } = useSession()

  return (
    <header className="fixed w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg mt-2 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 items-center h-20">
          {/* Logo - Ocupa 1/3 izquierda */}
          <div className="flex justify-start">
            <Link href="/" className="relative w-16 h-16">
              <Image
                src="/logo.png"
                alt="SincroGoo Logo"
                fill
                className="object-contain"
                priority
              />
            </Link>
          </div>

          {/* Título - Ocupa 1/3 centro */}
          <div className="flex justify-center">
            <span className="font-medium text-2xl text-slate-900 dark:text-slate-200 tracking-tight">
              SincroGoo
            </span>
          </div>

          {/* Botones - Ocupa 1/3 derecha */}
          <div className="flex justify-end items-center gap-3">
            <ModeToggle />
            {isHome ? (
              <Button 
                variant="outline" 
                size="default"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="gap-2 h-10 px-4 text-base border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
              >
                <Image src="/google.svg" alt="Google" width={20} height={20} className="rounded-full bg-white p-1" />
                Iniciar sesión
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="default"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="gap-2 h-10 px-4 text-base border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
              >
                Cerrar sesión
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 