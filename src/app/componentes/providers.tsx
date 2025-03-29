"use client"

import { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/app/lib/theme"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  )
} 