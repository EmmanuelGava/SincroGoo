"use client"

import { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/app/lib/theme"
import { Toaster } from "sonner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  )
} 