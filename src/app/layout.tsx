import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/app/componentes/providers"
import EmotionRegistry from "./registry"
import { NotificacionProvider } from '@/app/editor-proyectos/contexts/NotificacionContext'

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: "SincroGoo - Sincroniza tus documentos de Google",
  description: "Sincroniza precios entre Google Sheets y Google Slides fácilmente",
  generator: 'Next.js',
  applicationName: 'SincroGoo',
  referrer: 'origin-when-cross-origin',
  keywords: ['Google Slides', 'Google Sheets', 'Sincronización', 'Automatización', 'Presentaciones', 'Hojas de cálculo'],
  authors: [{ name: 'Emmanuel Gava' }],
  creator: 'Emmanuel Gava',
  publisher: 'Emmanuel Gava',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "SincroGoo - Sincroniza tus documentos de Google",
    description: "Sincroniza precios entre Google Sheets y Google Slides fácilmente",
    url: 'https://sincrogoo.vercel.app',
    siteName: 'SincroGoo',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      }
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SincroGoo - Sincroniza tus documentos de Google',
    description: 'Sincroniza precios entre Google Sheets y Google Slides fácilmente',
    images: ['/og-image.png'],
    creator: '@emmanuelgava',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/apple-touch-icon-precomposed.png',
    },
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  colorScheme: 'dark light'
}

// Definir la política de seguridad de contenido
const cspContent = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com https://*.googleapis.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com;
  img-src 'self' data: https://*.googleusercontent.com https://*.gstatic.com https://*.googleapis.com https://*.tile.openstreetmap.org;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.googleapis.com https://*.google.com https://supabase.co https://*.supabase.co wss://*.supabase.co https://overpass-api.de;
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Lato:wght@400;600;700&family=Oswald:wght@400;600&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <NotificacionProvider>
          <EmotionRegistry>
            <Providers>
              {children}
            </Providers>
          </EmotionRegistry>
        </NotificacionProvider>
      </body>
    </html>
  )
}