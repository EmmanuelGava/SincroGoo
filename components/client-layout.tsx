"use client"

import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
      <Toaster richColors />
    </SessionProvider>
  )
} 