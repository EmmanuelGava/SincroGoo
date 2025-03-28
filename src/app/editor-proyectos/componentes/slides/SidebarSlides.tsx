"use client"

import { useState, useEffect } from "react"
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  Divider, 
  CircularProgress, 
  Grid, 
  Paper, 
  Tooltip, 
  useTheme
} from "@mui/material"
import { 
  Close as CloseIcon, 
  Link as LinkIcon
} from "@mui/icons-material"
import { ElementoDiapositiva, VistaPreviaDiapositiva } from "@/tipos/diapositivas"
import { FilaSeleccionada } from "@/tipos/hojas"
import { EditorElementos } from "./EditorElementos"
import { useThemeMode } from "@/lib/theme"
import { 
  handleImageLoad, 
  handleImageError, 
  processDiapositivasWithCachedThumbnails,
  buildThumbnailUrl
} from "../../utils/thumbnailManager"

interface SidebarSlidesProps {
  sidebarAbierto: boolean
  setSidebarAbierto: (abierto: boolean) => void
  cambiosPendientes: boolean
  elementos: ElementoDiapositiva[]
  elementosSeleccionados: string[]
  elementosPrevia: ElementoDiapositiva[]
  setElementosPrevia: (elementos: ElementoDiapositiva[]) => void
  setMostrarVistaPrevia: (mostrar: boolean) => void
  setCambiosPendientes: (pendientes: boolean) => void
  diapositivas: VistaPreviaDiapositiva[]
  diapositivaSeleccionada: VistaPreviaDiapositiva | null
  cargandoDiapositivas: boolean
  diapositivasConAsociaciones: Set<string>
  filaSeleccionada: FilaSeleccionada | null
  session: any
  manejarSeleccionDiapositiva: (idDiapositiva: string, idElemento: string | null) => Promise<void>
  actualizarElementos: (elementosActualizados: ElementoDiapositiva[]) => Promise<void>
  previsualizarCambios: (elementosNuevos: ElementoDiapositiva[]) => void
  setElementoSeleccionadoPopup: (elemento: ElementoDiapositiva | null) => void
  token: string
  idPresentacion: string
  idHoja?: string
}

export function SidebarSlides({
  sidebarAbierto,
  setSidebarAbierto,
  cambiosPendientes,
  elementos,
  elementosSeleccionados,
  elementosPrevia,
  setElementosPrevia,
  setMostrarVistaPrevia,
  setCambiosPendientes,
  diapositivas,
  diapositivaSeleccionada,
  cargandoDiapositivas,
  diapositivasConAsociaciones,
  filaSeleccionada,
  session,
  manejarSeleccionDiapositiva,
  actualizarElementos,
  previsualizarCambios,
  setElementoSeleccionadoPopup,
  token,
  idPresentacion,
  idHoja,
}: SidebarSlidesProps) {
  console.log('SidebarSlides - Renderizando con sidebarAbierto:', sidebarAbierto);
  console.log('SidebarSlides - filaSeleccionada:', filaSeleccionada);
  
  const theme = useTheme();
  const { mode } = useThemeMode();
  
  // Estado local para controlar la apertura del Drawer
  const [open, setOpen] = useState(sidebarAbierto);
  
  // Sincronizar el estado local con el prop
  useEffect(() => {
    console.log('SidebarSlides - useEffect - sidebarAbierto cambió a:', sidebarAbierto);
    setOpen(sidebarAbierto);

    // Si el sidebar se está abriendo y hay diapositivas disponibles pero ninguna seleccionada
    if (sidebarAbierto && diapositivas.length > 0 && !diapositivaSeleccionada) {
      console.log('Seleccionando primera diapositiva automáticamente:', diapositivas[0].id);
      manejarSeleccionDiapositiva(diapositivas[0].id, null);
    }
  }, [sidebarAbierto, diapositivas, diapositivaSeleccionada, manejarSeleccionDiapositiva]);
  
  // Estado para las diapositivas con miniaturas en caché
  const [diapositivasConCache, setDiapositivasConCache] = useState<Array<VistaPreviaDiapositiva & { urlImagenCached: string }>>([]);
  
  // Procesar diapositivas para añadir URLs de miniaturas en caché
  useEffect(() => {
    if (diapositivas.length > 0 && idPresentacion) {
      // Primero, asegurarnos de que todas las diapositivas tengan una URL de miniatura
      const diapositivasConUrl = diapositivas.map(diapositiva => {
        // Si la diapositiva ya tiene una URL de imagen, usarla
        if (diapositiva.urlImagen) {
          console.log(`Diapositiva ${diapositiva.id} ya tiene URL:`, diapositiva.urlImagen);
          return diapositiva;
        }
        
        // Si no, construir la URL usando buildThumbnailUrl
        const url = buildThumbnailUrl(idPresentacion, diapositiva.id);
        console.log(`Diapositiva ${diapositiva.id} URL construida:`, url);
        return {
          ...diapositiva,
          urlImagen: url
        };
      });
      
      // Asegurarse de que todas las diapositivas tengan una urlImagen definida
      const diapositivasConUrlDefinida = diapositivasConUrl.map(d => ({
        ...d,
        urlImagen: d.urlImagen || ''  // Proporcionar un valor por defecto si es undefined
      }));

      // Luego, procesar las diapositivas para añadir URLs en caché
      const diapositivasProcesadas = processDiapositivasWithCachedThumbnails(diapositivasConUrlDefinida);
      console.log('Diapositivas procesadas con caché:', diapositivasProcesadas);
      setDiapositivasConCache(diapositivasProcesadas as Array<VistaPreviaDiapositiva & { urlImagenCached: string }>);
    }
  }, [diapositivas, idPresentacion]);
  
  const handleOpenChange = (isOpen: boolean) => {
    console.log('SidebarSlides - handleOpenChange:', isOpen);
    
    // Verificar si hay un popup de edición activo
    const hayPopupActivo = document.querySelector('[data-popup-editor="true"]');
    
    // Si hay un popup activo, no permitimos cerrar el sidebar
    if (!isOpen && hayPopupActivo) {
      console.log('Hay un popup activo, evitando cierre del sidebar');
      return; // No permitir cerrar el sidebar mientras hay un popup abierto
    }
    
    // Cuando se cierra el sidebar, cerrar el popup de edición si está abierto
    if (!isOpen && setElementoSeleccionadoPopup) {
      setElementoSeleccionadoPopup(null);
    }
    
    // Si estamos cerrando y hay cambios pendientes
    if (!isOpen && cambiosPendientes) {
      const guardarCambios = window.confirm('Hay cambios sin guardar. ¿Deseas guardar los cambios antes de cerrar?');
      
      if (guardarCambios) {
        // Guardar cambios y luego cerrar
        actualizarElementos(elementosPrevia)
          .then(() => {
            setOpen(false);
            setSidebarAbierto(false);
            setCambiosPendientes(false);
          })
          .catch(error => {
            console.error('Error al guardar cambios:', error);
          });
        return; // No cerrar hasta que se complete la operación
      } else {
        const confirmarCierre = window.confirm('¿Estás seguro de que deseas cerrar sin guardar los cambios?');
        if (!confirmarCierre) {
          setOpen(true); // Mantener abierto
          return;
        }
        // Si confirma el cierre sin guardar, continuar con el cierre
      }
    }
    
    // Actualizar ambos estados
    setOpen(isOpen);
    setSidebarAbierto(isOpen);
    
    // Si estamos cerrando, limpiar estados
    if (!isOpen) {
      setCambiosPendientes(false);
      setElementosPrevia([]);
      setMostrarVistaPrevia(false);
    }
  };
  
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => handleOpenChange(false)}
      sx={{
        '& .MuiDrawer-paper': {
          width: 600,
          boxSizing: 'border-box',
          borderLeft: 1,
          borderColor: 'divider',
          boxShadow: 3
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="600">
              Editor de Diapositiva
            </Typography>
            <IconButton 
              onClick={() => handleOpenChange(false)}
              size="small"
              edge="end"
              aria-label="cerrar"
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {filaSeleccionada 
              ? `Editando elementos para la fila: ${filaSeleccionada.id}` 
              : 'Selecciona una diapositiva para editar sus elementos'}
          </Typography>
        </Box>
        
        <Divider />
        
        {cargandoDiapositivas ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100vh - 80px)', 
            overflow: 'hidden' 
          }}>
            {/* Contenedor de diapositivas (60% del alto) */}
            <Box sx={{ height: '60%', overflow: 'hidden', p: 2, pb: 1 }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
                Diapositivas
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  height: 'calc(100% - 30px)', 
                  overflow: 'auto',
                  borderRadius: 1
                }}
              >
                <Box sx={{ p: 1.5 }}>
                  <Grid container spacing={1.5}>
                    {diapositivasConCache.map((diapositiva) => (
                      <Grid item xs={6} key={diapositiva.id}>
                        <Paper
                          elevation={0}
                          onClick={() => manejarSeleccionDiapositiva(diapositiva.id, null)}
                          sx={{
                            cursor: 'pointer',
                            overflow: 'hidden',
                            borderRadius: 1,
                            border: 1,
                            borderColor: diapositivaSeleccionada?.id === diapositiva.id 
                              ? 'primary.main' 
                              : 'divider',
                            bgcolor: diapositivaSeleccionada?.id === diapositiva.id 
                              ? `${theme.palette.primary.main}10` 
                              : 'background.paper',
                            '&:hover': {
                              boxShadow: 2,
                              borderColor: 'primary.main'
                            },
                            transition: 'all 0.2s'
                          }}
                        >
                          <Box sx={{ position: 'relative' }}>
                            <Box 
                              component="img"
                              src={diapositiva.urlImagenCached || '/placeholder-slide.png'}
                              alt={diapositiva.titulo}
                              sx={{
                                width: '100%',
                                aspectRatio: '16/9',
                                objectFit: 'contain',
                                bgcolor: 'white',
                                display: 'block'
                              }}
                              onLoad={(e) => {
                                console.log(`Imagen cargada para diapositiva ${diapositiva.id}:`, (e.target as HTMLImageElement).src);
                                handleImageLoad(diapositiva.id, diapositiva.urlImagen || '');
                              }}
                              onError={(e) => {
                                console.error(`Error al cargar imagen para diapositiva ${diapositiva.id}:`, (e.target as HTMLImageElement).src);
                                handleImageError(e, diapositiva.id);
                              }}
                            />
                            
                            {/* Indicador de elementos asociados */}
                            {diapositivasConAsociaciones.has(diapositiva.id) && (
                              <Tooltip 
                                title="Esta diapositiva contiene elementos asociados a celdas"
                                arrow
                              >
                                <Box 
                                  sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    borderRadius: '50%',
                                    p: 0.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 1
                                  }}
                                >
                                  <LinkIcon sx={{ fontSize: 14 }} />
                                </Box>
                              </Tooltip>
                            )}
                          </Box>
                          <Box sx={{ p: 1 }}>
                            <Typography 
                              variant="body2" 
                              fontWeight="500"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {diapositiva.titulo}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Paper>
            </Box>
            
            {/* Contenedor de elementos (40% del alto) */}
            <Box sx={{ height: '40%', overflow: 'hidden', p: 2, pt: 1 }}>
              <EditorElementos
                token={token}
                diapositivaSeleccionada={diapositivaSeleccionada}
                elementos={elementos}
                elementosSeleccionados={elementosSeleccionados}
                alSeleccionarDiapositiva={manejarSeleccionDiapositiva}
                alActualizarElementos={actualizarElementos}
                alActualizarElementosDiapositiva={previsualizarCambios}
                filaSeleccionada={filaSeleccionada}
                abierto={sidebarAbierto}
                alCambiarApertura={setSidebarAbierto}
                diapositivas={diapositivas}
                onEditarElemento={(elemento) => {
                  setElementoSeleccionadoPopup(elemento)
                }}
                idPresentacion={idPresentacion}
                idHoja={idHoja}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  )
} 