"use client"

import React, { useState, useEffect } from "react"
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  CircularProgress, 
  Paper, 
  useTheme,
  List,
  ListItem,
  ListItemButton,
  Tooltip,
} from "@mui/material"
import { 
  Close as CloseIcon, 
  Link as LinkIcon,
  ImageNotSupported,
  Warning as WarningIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  PictureAsPdf as PdfIcon,
  ContentCopy as ContentCopyIcon,
  OpenInNew as OpenInNewIcon
} from "@mui/icons-material"
import { ElementoDiapositiva, VistaPreviaDiapositiva } from '../../types'
import { useThemeMode } from "@/lib/theme"
import { useThumbnails } from "../../hooks/useThumbnails"
import { useSlides, useUI } from "../../contexts"
import { toast } from "sonner"
import { EditorElementos } from './EditorElementos'

interface NavegacionFilas {
  indiceActual: number
  total: number
  onAnterior: () => void
  onSiguiente: () => void
  puedeAnterior: boolean
  puedeSiguiente: boolean
}

interface SidebarSlidesProps {
  sidebarAbierto: boolean
  setSidebarAbierto: (abierto: boolean) => void
  onDiapositivaSeleccionada?: (idDiapositiva: string) => void
  navegacionFilas?: NavegacionFilas
}

export const SidebarSlides: React.FC<SidebarSlidesProps> = ({
  sidebarAbierto,
  setSidebarAbierto,
  onDiapositivaSeleccionada,
  navegacionFilas
}) => {
  const theme = useTheme();
  const { theme: themeMode } = useThemeMode();
  const isDarkMode = themeMode === 'dark';
  
  const { 
    diapositivas,
    diapositivaSeleccionada,
    diapositivasConAsociaciones,
    cargandoDiapositivas,
    idPresentacion,
    tituloPresentacion: tituloPresentacionContext,
    manejarSeleccionDiapositiva
  } = useSlides()
  const { tituloPresentacion: tituloPresentacionUI } = useUI()
  const tituloPresentacion = tituloPresentacionContext || tituloPresentacionUI || 'Presentación'
  
  // Usar el hook de thumbnails
  const { thumbnails, cargandoThumbnails } = useThumbnails(diapositivas, idPresentacion);
  
  // Estado local para controlar la apertura del Drawer
  const [open, setOpen] = useState(false);

  // Estado para errores de imagen
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Combinar diapositivas con thumbnails
  const diapositivasConThumbnails: VistaPreviaDiapositiva[] = diapositivas.map(diapositiva => ({
    ...diapositiva,
    thumbnailUrl: thumbnails[diapositiva.id]
  }));
  
  // Efecto para sincronizar el estado local con la prop
  useEffect(() => {
    setOpen(sidebarAbierto);
  }, [sidebarAbierto]);

  // Manejar el cierre del sidebar
  const handleClose = () => {
    console.log('🎯 [SidebarSlides] Cerrando sidebar');
    setSidebarAbierto(false);
  };

  // Manejar errores de carga de imágenes
  const handleImageError = (slideId: string) => {
    setImageErrors(prev => ({ ...prev, [slideId]: true }));
  };

  const handleDiapositivaClick = (idDiapositiva: string) => {
    if (onDiapositivaSeleccionada) {
      onDiapositivaSeleccionada(idDiapositiva)
    } else {
      manejarSeleccionDiapositiva(idDiapositiva, null)
    }
  }

  // Renderizar solo cuando tengamos datos válidos
  if (!idPresentacion || (!cargandoDiapositivas && diapositivas.length === 0)) {
    return null;
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      variant="persistent"
      PaperProps={{
        sx: {
          width: '30%',
          boxSizing: 'border-box',
          border: 'none',
          borderLeft: 1,
          borderColor: 'divider'
        }
      }}
      sx={{
        width: open ? '30%' : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: '30%'
        }
      }}
    >
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Cabecera */}
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{tituloPresentacion}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="Exportar a PDF">
                <IconButton
                  size="small"
                  onClick={() => {
                    if (idPresentacion) {
                      window.open(
                        `/api/google/slides/export-pdf?presentationId=${idPresentacion}&nombre=${encodeURIComponent(tituloPresentacion || 'presentacion')}`,
                        '_blank'
                      );
                    }
                  }}
                >
                  <PdfIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Copiar enlace para compartir">
                <IconButton
                  size="small"
                  onClick={() => {
                    if (idPresentacion) {
                      const link = `https://docs.google.com/presentation/d/${idPresentacion}/view`;
                      navigator.clipboard.writeText(link);
                      toast.success('Enlace copiado al portapapeles');
                    }
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Abrir en Google Slides">
                <IconButton
                  size="small"
                  href={`https://docs.google.com/presentation/d/${idPresentacion}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton onClick={handleClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          {navegacionFilas && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Fila {navegacionFilas.indiceActual} de {navegacionFilas.total}
              </Typography>
              <IconButton
                size="small"
                disabled={!navegacionFilas.puedeAnterior}
                onClick={navegacionFilas.onAnterior}
                sx={{ p: 0.25 }}
                aria-label="Fila anterior"
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                disabled={!navegacionFilas.puedeSiguiente}
                onClick={navegacionFilas.onSiguiente}
                sx={{ p: 0.25 }}
                aria-label="Fila siguiente"
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>

        {/* Contenido */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Lista de diapositivas */}
          <Box sx={{ 
            flex: '0 0 auto',
            maxHeight: '40%',
            overflowY: 'auto',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            {cargandoDiapositivas ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {diapositivasConThumbnails.map((slide) => {
                  const isSelected = diapositivaSeleccionada?.id === slide.id;
                  const hasAssociations = diapositivasConAsociaciones.has(slide.id);
                  const hasError = imageErrors[slide.id];

                  // Formatear el título
                  const titulo = !slide.titulo ? 
                    `Diapositiva ${(slide.indice || 0) + 1}` : 
                    typeof slide.titulo === 'string' ? 
                      slide.titulo : 
                      slide.titulo.texto || `Diapositiva ${(slide.indice || 0) + 1}`;

                  return (
                    <ListItem
                      key={slide.id}
                      disablePadding
                      sx={{
                        mb: 1,
                        borderRadius: 1,
                        border: 1,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? 'action.selected' : 'background.paper'
                      }}
                    >
                      <ListItemButton
                        onClick={() => handleDiapositivaClick(slide.id)}
                        sx={{ p: 1 }}
                      >
                        <Box sx={{ width: '100%' }}>
                          <Box
                            sx={{
                              width: '100%',
                              height: 120,
                              borderRadius: 1,
                              overflow: 'hidden',
                              mb: 1,
                              bgcolor: isDarkMode ? 'grey.800' : 'grey.100',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Paper
                              elevation={2}
                              sx={{
                                position: 'relative',
                                width: '100%',
                                paddingTop: '56.25%',
                                backgroundColor: isDarkMode ? 'grey.800' : 'grey.200',
                                overflow: 'hidden',
                                borderRadius: 1,
                              }}
                            >
                              {slide.thumbnailUrl && !hasError ? (
                                <img
                                  src={slide.thumbnailUrl}
                                  alt={`Miniatura de ${titulo}`}
                                  onError={() => handleImageError(slide.id)}
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    opacity: hasError ? 0.3 : 1
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {cargandoThumbnails ? (
                                    <CircularProgress size={24} />
                                  ) : (
                                    <ImageNotSupported sx={{ fontSize: 40, opacity: 0.5 }} />
                                  )}
                                </Box>
                              )}
                            </Paper>
                          </Box>
                          <Box sx={{ px: 1 }}>
                            <Typography variant="subtitle2" noWrap>
                              {titulo}
                            </Typography>
                            {hasAssociations && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LinkIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                <Typography variant="caption" color="primary">
                                  Con asociaciones
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>

          {/* Editor de elementos */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <EditorElementos />
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}; 