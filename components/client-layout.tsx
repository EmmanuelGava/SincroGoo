"use client"

import React, { useEffect } from "react"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Inicializar el tema oscuro basado en las preferencias del usuario
  useEffect(() => {
    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
    document.documentElement.classList.toggle("dark", isDarkMode)
  }, [])

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
      <Toaster richColors />
    </SessionProvider>
  )
} 