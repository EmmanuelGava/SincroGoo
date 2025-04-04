"use client"

import { ReactNode, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Box, CircularProgress, Typography } from '@mui/material'

export default function EditorProyectosLayout({
  children,
}: {
  children: ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Verificación de autenticación simplificada usando solo NextAuth
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('Usuario no autenticado, redirigiendo a login')
      router.push('/auth/login')
    }
  }, [status, router])

  // Si está verificando la autenticación en NextAuth, mostrar spinner
  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Verificando autenticación...</Typography>
      </Box>
    )
  }

  // Si no hay sesión y ya verificamos (no está cargando), no renderizar el contenido
  if (!session && status === 'unauthenticated') {
    return null
  }

  // Usuario autenticado, mostrar el contenido
  return <>{children}</>
} 