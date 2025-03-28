"use client"

import { useEffect, useState } from "react"
import { ThemeProvider } from "next-themes"
import { Box, Container } from "@mui/material"
import { EncabezadoSitio } from "./componentes/EncabezadoSitio"
import { Button } from "@/componentes/ui/button"
import Link from "next/link"

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Box className="min-h-screen bg-background">
        <EncabezadoSitio />
        <Container className="py-8">
          <div className="flex flex-col items-center justify-center text-center space-y-8">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              SincroGoo
            </h1>
            <p className="text-xl text-muted-foreground max-w-[600px]">
              Sincroniza tus presentaciones de Google Slides con datos de hojas de cálculo de manera inteligente y eficiente.
            </p>
            <div className="flex gap-4">
              <Button asChild size="lg">
                <Link href="/proyectos">Comenzar</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/demo">Ver Demo</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Box>
    </ThemeProvider>
  )
}