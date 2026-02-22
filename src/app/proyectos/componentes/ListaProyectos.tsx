"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useThemeMode } from '@/app/lib/theme'

// Material UI
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'

// Icons
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PresentationIcon from '@mui/icons-material/Slideshow'
import SpreadsheetIcon from '@mui/icons-material/TableChart'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

// Types
interface Proyecto {
  id: string;
  usuario_id: string;
  nombre: string;
  descripcion: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  sheets_id: string | null;
  slides_id: string | null;
  hojastitulo: string | null;
  presentaciontitulo: string | null;
}

interface ListaProyectosProps {
  proyectos: Proyecto[]
  cargando: boolean
  busqueda: string
}

export default function ListaProyectos({ proyectos, cargando, busqueda }: ListaProyectosProps) {
  const router = useRouter()
  const { mode } = useThemeMode()
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<Proyecto | null>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [accion, setAccion] = useState<'editar' | 'eliminar' | null>(null)

  const proyectosFiltrados = proyectos.filter(proyecto => 
    (proyecto.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (proyecto.descripcion && proyecto.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
  )

  const eliminarProyecto = async (id: string) => {
    try {
      const response = await fetch(`/api/supabase/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el proyecto');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success("Proyecto eliminado correctamente")
        // Recargar la página para actualizar la lista
        window.location.reload()
      } else {
        throw new Error(data.error || 'Error al eliminar el proyecto');
      }
    } catch (error) {
      console.error("Error al eliminar proyecto:", error)
      toast.error("Error al eliminar el proyecto")
    }
  }

  const handleAccion = (proyecto: Proyecto, tipo: 'editar' | 'eliminar') => {
    setProyectoSeleccionado(proyecto)
    setAccion(tipo)
    setDialogoAbierto(true)
  }

  const handleConfirmarAccion = async () => {
    if (!proyectoSeleccionado) return

    try {
      if (accion === 'eliminar') {
        await eliminarProyecto(proyectoSeleccionado.id || '')
      } else if (accion === 'editar') {
        router.push(`/proyectos/${proyectoSeleccionado.id || ''}`)
      }
    } catch (error) {
      console.error(`Error al ${accion} proyecto:`, error)
      toast.error(`Error al ${accion} el proyecto`)
    } finally {
      setDialogoAbierto(false)
      setProyectoSeleccionado(null)
      setAccion(null)
    }
  }

  const irAlEditor = (proyecto: Proyecto) => {
    if (!proyecto.id) {
      toast.error("Error: El proyecto no tiene un ID válido")
      return
    }

    const params = new URLSearchParams({
      ...(proyecto.slides_id && { idPresentacion: proyecto.slides_id }),
      ...(proyecto.sheets_id && { idHojaCalculo: proyecto.sheets_id }),
      ...(proyecto.presentaciontitulo && { tituloPresentacion: proyecto.presentaciontitulo }),
      ...(proyecto.hojastitulo && { tituloHoja: proyecto.hojastitulo })
    })

    router.push(`/editor-proyectos/${proyecto.id}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {proyectosFiltrados.length > 0 ? (
          proyectosFiltrados.map((proyecto) => (
            <Grid item xs={12} sm={6} md={4} key={proyecto.id}>
              <Card sx={{ position: 'relative' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {proyecto.nombre || 'Proyecto sin nombre'}
                  </Typography>
                  {proyecto.descripcion && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {proyecto.descripcion}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {proyecto.slides_id && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PresentationIcon fontSize="small" />
                        <Typography variant="body2">{proyecto.presentaciontitulo || 'Presentación'}</Typography>
                      </Box>
                    )}
                    {proyecto.sheets_id && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SpreadsheetIcon fontSize="small" />
                        <Typography variant="body2">{proyecto.hojastitulo || 'Hoja de cálculo'}</Typography>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Creado: {proyecto.fecha_creacion ? new Date(proyecto.fecha_creacion).toLocaleDateString() : 'Fecha desconocida'}
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<OpenInNewIcon />}
                      onClick={() => irAlEditor(proyecto)}
                    >
                      Abrir Editor
                    </Button>
                  </Box>
                </CardContent>
                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleAccion(proyecto, 'editar')}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleAccion(proyecto, 'eliminar')}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography variant="body1" color="text.secondary" align="center">
              No se encontraron proyectos
            </Typography>
          </Grid>
        )}
      </Grid>

      <Dialog open={dialogoAbierto} onClose={() => setDialogoAbierto(false)}>
        <DialogTitle>
          {accion === 'eliminar' ? 'Eliminar Proyecto' : 'Editar Proyecto'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {accion === 'eliminar'
              ? `¿Estás seguro de que deseas eliminar el proyecto "${proyectoSeleccionado?.nombre}"?`
              : `¿Deseas editar el proyecto "${proyectoSeleccionado?.nombre}"?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoAbierto(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirmarAccion}
            color={accion === 'eliminar' ? 'error' : 'primary'}
            variant="contained"
          >
            {accion === 'eliminar' ? 'Eliminar' : 'Editar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 