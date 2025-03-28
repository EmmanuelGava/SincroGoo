"use client"

import React from "react"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"
import { ThemeProvider } from "next-themes"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        {children}
        <Toaster 
          richColors 
          position="top-center" 
          closeButton 
          expand={false} 
          toastOptions={{
            duration: 3000,
            className: "toast-notification"
          }}
        />
      </SessionProvider>
    </ThemeProvider>
  )
} 