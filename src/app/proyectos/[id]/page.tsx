"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Box, Typography, Button, Container } from '@mui/material'
import { ProyectosService, Proyecto } from '@/servicios/supabase/tablas/proyectos-service'

export default function PaginaProyecto() {
  const params = useParams()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargarProyecto = async () => {
      try {
        if (!params.id) {
          throw new Error('No se proporcionó un ID de proyecto')
        }

        const proyectoId = Array.isArray(params.id) ? params.id[0] : params.id
        const resultado = await ProyectosService.obtenerProyecto(proyectoId)
        
        if (!resultado) {
          throw new Error('No se encontró el proyecto')
        }

        setProyecto(resultado)
      } catch (error) {
        console.error('Error al cargar el proyecto:', error)
        setError(error instanceof Error ? error.message : 'Error al cargar el proyecto')
      } finally {
        setCargando(false)
      }
    }

    cargarProyecto()
  }, [params.id])

  if (cargando) {
    return (
      <Container>
        <Typography>Cargando proyecto...</Typography>
      </Container>
    )
  }

  if (error || !proyecto) {
    return (
      <Container>
        <Typography color="error">{error || 'No se pudo cargar el proyecto'}</Typography>
        <Link href="/proyectos">
          <Button variant="contained" color="primary">
            Volver a Proyectos
          </Button>
        </Link>
      </Container>
    )
  }

  return (
    <Container>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          {proyecto.titulo || proyecto.nombre}
        </Typography>
        
        <Typography variant="body1" paragraph>
          {proyecto.descripcion}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Link href={`/editor-proyectos?idProyectoActual=${proyecto.id}&idPresentacion=${proyecto.slides_id || ''}&idHojaCalculo=${proyecto.sheets_id || ''}`}>
            <Button variant="contained" color="primary">
              Editar Proyecto
            </Button>
          </Link>
          
          <Link href="/proyectos">
            <Button variant="outlined">
              Volver a Proyectos
            </Button>
          </Link>
        </Box>
      </Box>
    </Container>
  )
} 