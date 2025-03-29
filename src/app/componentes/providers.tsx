"use client"

import { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeContext } from "@/app/theme"
import { Toaster } from "sonner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeContext>
        {children}
        <Toaster richColors position="top-right" />
      </ThemeContext>
    </SessionProvider>
  )
} 