'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, IconButton, CircularProgress, Chip, Stack,
} from '@mui/material'
import {
  ChevronLeft as PrevIcon, ChevronRight as NextIcon,
  OpenInNew as OpenIcon, Edit as EditIcon,
} from '@mui/icons-material'

interface PreviewCarruselProps {
  open: boolean
  presentationId: string
  projectId: string
  totalSlides: number
  onClose: () => void
  onOpenEditor: () => void
}

interface SlideInfo {
  objectId: string
  index: number
}

export function PreviewCarrusel({
  open, presentationId, projectId, totalSlides, onClose, onOpenEditor
}: PreviewCarruselProps) {
  const [slides, setSlides] = useState<SlideInfo[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!open || !presentationId) return
    setCargando(true)
    setCurrentIndex(0)

    fetch(`/api/google/slides?presentationId=${presentationId}`)
      .then(res => res.json())
      .then(data => {
        if (data.exito && data.datos?.diapositivas) {
          setSlides(data.datos.diapositivas.map((d: any, i: number) => ({
            objectId: d.id || d.objectId,
            index: i,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [open, presentationId])

  const thumbnailUrl = (slideId: string) =>
    `/api/google/slides/thumbnails?presentacionId=${presentationId}&diapositivaId=${slideId}`

  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < slides.length - 1

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>
          Presentación generada
        </Typography>
        <Chip label={`${slides.length} slides`} size="small" color="primary" variant="outlined" />
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {cargando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress />
          </Box>
        ) : slides.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography color="text.secondary">No se pudieron cargar las diapositivas</Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative' }}>
            <Box sx={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              bgcolor: 'grey.100', p: 2, minHeight: 400,
            }}>
              <Box sx={{
                width: '100%', maxWidth: 700, position: 'relative',
                aspectRatio: '16/9', borderRadius: 2, overflow: 'hidden',
                boxShadow: 3, bgcolor: 'white',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl(slides[currentIndex].objectId)}
                  alt={`Slide ${currentIndex + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
            </Box>

            {hasPrev && (
              <IconButton
                onClick={() => setCurrentIndex(i => i - 1)}
                sx={{
                  position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                  bgcolor: 'background.paper', boxShadow: 2,
                  '&:hover': { bgcolor: 'background.paper' },
                }}
              >
                <PrevIcon />
              </IconButton>
            )}
            {hasNext && (
              <IconButton
                onClick={() => setCurrentIndex(i => i + 1)}
                sx={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  bgcolor: 'background.paper', boxShadow: 2,
                  '&:hover': { bgcolor: 'background.paper' },
                }}
              >
                <NextIcon />
              </IconButton>
            )}

            <Typography
              variant="body2" color="text.secondary" align="center"
              sx={{ py: 1 }}
            >
              {currentIndex + 1} / {slides.length}
            </Typography>
          </Box>
        )}

        {slides.length > 1 && (
          <Box sx={{
            display: 'flex', gap: 1, p: 2, overflowX: 'auto',
            borderTop: 1, borderColor: 'divider',
          }}>
            {slides.map((slide, i) => (
              <Box
                key={slide.objectId}
                onClick={() => setCurrentIndex(i)}
                sx={{
                  flexShrink: 0, width: 100, height: 56, borderRadius: 1,
                  overflow: 'hidden', cursor: 'pointer', border: 2,
                  borderColor: i === currentIndex ? 'primary.main' : 'divider',
                  opacity: i === currentIndex ? 1 : 0.7,
                  transition: 'all 0.15s',
                  '&:hover': { opacity: 1 },
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl(slide.objectId)}
                  alt={`Mini ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="outlined" startIcon={<OpenIcon />}
          onClick={() => window.open(`https://docs.google.com/presentation/d/${presentationId}/edit`, '_blank')}
        >
          Abrir en Google Slides
        </Button>
        <Button variant="contained" startIcon={<EditIcon />} onClick={onOpenEditor}>
          Ir al editor
        </Button>
      </DialogActions>
    </Dialog>
  )
}
