"use client"

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from "sonner"

// Proveedor de sesión simplificado utilizando directamente NextAuth
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  )
}

// Proveedor general simplificado
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class">
      <SessionProvider>
        {children}
        <Toaster richColors position="top-right" />
      </SessionProvider>
    </ThemeProvider>
  )
} 