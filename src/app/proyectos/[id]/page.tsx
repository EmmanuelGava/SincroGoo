"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { 
  Box, Typography, Button, Container, Paper, CircularProgress, Alert, IconButton, Tabs, Tab 
} from '@mui/material'
import { createClient } from '@supabase/supabase-js'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

// Cliente Supabase local para este componente
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Definir el tipo de Proyecto localmente para no depender de tipos antiguos
interface Proyecto {
  id: string;
  nombre: string;
  descripcion?: string;
  usuario_id: string;
  created_at?: string;
  updated_at?: string;
  sheets_id?: string;
  slides_id?: string;
  hojastitulo?: string;
  presentaciontitulo?: string;
}

// Definir el tipo de Sheet localmente
interface Sheet {
  id: string;
  nombre: string;
  proyecto_id: string;
  created_at?: string;
  updated_at?: string;
  columnas?: number;
  filas?: number;
  activa?: boolean;
}

export default function PaginaProyecto() {
  const params = useParams()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargarProyecto = async () => {
      if (!params.id) {
        throw new Error('No se proporcionó un ID de proyecto')
      }

      const proyectoId = Array.isArray(params.id) ? params.id[0] : params.id
      setCargando(true)
      setError(null)
      
      try {
        const { data: resultado, error } = await supabase
          .from('proyectos')
          .select('*')
          .eq('id', proyectoId)
          .single();
        
        if (error) throw error;
        
        if (resultado) {
          setProyecto(resultado)
        } else {
          setError('No se encontró el proyecto solicitado')
        }
      } catch (err) {
        console.error('Error al cargar proyecto:', err)
        setError('Error al cargar los datos del proyecto')
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
          {proyecto.nombre}
        </Typography>
        
        <Typography variant="body1" paragraph>
          {proyecto.descripcion}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Link href={`/editor-proyectos/${proyecto.id}${proyecto.slides_id || proyecto.sheets_id ? `?${new URLSearchParams({
            ...(proyecto.slides_id && { idPresentacion: proyecto.slides_id }),
            ...(proyecto.sheets_id && { idHojaCalculo: proyecto.sheets_id })
          }).toString()}` : ''}`}>
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