"use client"

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/app/lib/theme'
import { Toaster } from "sonner"
import { SyncSupabaseUser } from "./SyncSupabaseUser"

// Proveedor de sesión simplificado utilizando directamente NextAuth
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SyncSupabaseUser />
      {children}
    </NextAuthSessionProvider>
  )
}

// Proveedor general simplificado
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        {children}
        <Toaster richColors position="top-right" />
      </SessionProvider>
    </ThemeProvider>
  )
} 