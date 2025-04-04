"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/app/lib/theme"
import { Toaster } from "sonner"

interface ProvidersClienteProps {
  children: React.ReactNode
}

/**
 * Proveedor principal de la aplicación que engloba todos los providers necesarios.
 * Incluye:
 * - ThemeProvider: Para el manejo del tema claro/oscuro
 * - SessionProvider: Para la autenticación y manejo de sesión
 * - Toaster: Para las notificaciones toast
 */
export default function ProvidersCliente({ children }: ProvidersClienteProps) {
  return (
    <ThemeProvider>
      <SessionProvider
        refetchInterval={0}
        refetchOnWindowFocus={false}
      >
        {children}
        <Toaster 
          richColors 
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--background)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)'
            }
          }} 
        />
      </SessionProvider>
    </ThemeProvider>
  )
} 