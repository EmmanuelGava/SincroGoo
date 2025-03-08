import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import ClientLayout from "@/components/client-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SincroGoo - Sincroniza tus documentos de Google",
  description: "Sincroniza precios entre Google Sheets y Google Slides fácilmente",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.ico',
  }
}

// Definir la política de seguridad de contenido
const cspContent = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com https://*.googleapis.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com;
  img-src 'self' data: https://*.googleusercontent.com https://*.gstatic.com https://*.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.googleapis.com https://*.google.com https://supabase.co https://*.supabase.co;
  frame-src 'self' https://accounts.google.com https://*.googleusercontent.com;
  object-src 'none';
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={cspContent.replace(/\s+/g, ' ').trim()} />
      </head>
      <body className={inter.className}>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  )
}