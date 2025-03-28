import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/app/componentes/providers"
import ClientLayout from "@/app/componentes/client-layout"
import { ThemeProvider } from "@/lib/theme"

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

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
  img-src 'self' data: https://*.googleusercontent.com https://*.gstatic.com https://*.googleapis.com https://*.tile.openstreetmap.org;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.googleapis.com https://*.google.com https://supabase.co https://*.supabase.co https://overpass-api.de;
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
      <body className="font-sans antialiased">
        <Providers>
          <ThemeProvider>
            <ClientLayout>{children}</ClientLayout>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}