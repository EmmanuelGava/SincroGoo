"use client"

import React, { useState } from "react"
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  IconButton,
  CircularProgress,
  styled,
  Divider
} from '@mui/material'
import type { Theme } from '@mui/material'
import { 
  RemoveRedEye as EyeIcon, 
  Link as LinkIcon, 
  Edit as EditIcon, 
  Warning as WarningIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material'
import { ElementoDiapositiva, CambioPrevio } from "../../types/slides"
import { FilaSeleccionada } from "../../types"
import { toast } from "sonner"
import { VistaPreviaCambios } from "./VistaPreviaCambios"
import { useSlides, useSheets } from "../../contexts"
import { BotonEnlazarElemento } from './BotonEnlazarElemento'
import { EditorElementoPopup } from './EditorElementoPopup'
import { BotonGuardarElementos } from './BotonGuardarElementos'
import { BotonCancelarElementos } from './BotonCancelarElementos'

// Definición de interfaces
interface EditorElementosProps {
  className?: string
}

// Componentes estilizados
const ElementCard = styled(Paper)<{ theme?: Theme }>(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme?.spacing(1),
  padding: theme?.spacing(1.5),
  marginBottom: theme?.spacing(1.5),
  borderRadius: theme?.shape.borderRadius,
  border: `1px solid ${theme?.palette.divider}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme?.palette.primary.main,
    boxShadow: theme?.shadows[2],
    background: theme?.palette.mode === 'dark' 
      ? `rgba(255, 255, 255, 0.05)` 
      : `rgba(0, 0, 0, 0.02)`
  }
}))

const ElementContent = styled(Box)<{ theme?: Theme }>(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  cursor: 'pointer',
  padding: theme?.spacing(1.5),
  borderRadius: theme?.shape.borderRadius,
  '&:hover': {
    backgroundColor: theme?.palette.mode === 'dark' 
      ? `rgba(255, 255, 255, 0.05)` 
      : `rgba(0, 0, 0, 0.04)`
  }
}))

const ScrollContainer = styled(Box)<{ theme?: Theme }>(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme?.spacing(0, 2),
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px'
  },
  '&::-webkit-scrollbar-track': {
    background: theme?.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.05)',
    borderRadius: '4px',
    margin: theme?.spacing(1, 0)
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme?.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    '&:hover': {
      background: theme?.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.3)' 
        : 'rgba(0, 0, 0, 0.3)'
    }
  }
}))

export function EditorElementos({ className = "" }: EditorElementosProps) {
  // Estados locales
  const [elementoPopup, setElementoPopup] = useState<ElementoDiapositiva | null>(null)
  const [mostrandoVistaPreviaCambios, setMostrandoVistaPreviaCambios] = useState(false)
  const [guardandoCambios, setGuardandoCambios] = useState(false)

  // Contexto de diapositivas
  const {
    diapositivaSeleccionada,
    elementosActuales,
    elementosModificados,
    hayElementosModificados,
    setElementosModificados,
    setHayElementosModificados,
    previsualizarCambios,
    actualizarElementos,
    idProyecto,
    idPresentacion
  } = useSlides()

  // Contexto de hojas
  const { filaSeleccionada } = useSheets()

  // Escuchar eventos de guardado
  React.useEffect(() => {
    const handleInicioGuardado = () => {
      console.log('🔄 [EditorElementos] Inicio de guardado detectado')
      setGuardandoCambios(true)
    }

    const handleFinGuardado = (event: CustomEvent) => {
      console.log('✅ [EditorElementos] Fin de guardado detectado:', event.detail)
      setGuardandoCambios(false)
    }

    const handleErrorGuardado = (event: CustomEvent) => {
      console.error('❌ [EditorElementos] Error en guardado detectado:', event.detail)
      setGuardandoCambios(false)
    }

    document.addEventListener('inicio-guardado-elementos', handleInicioGuardado as EventListener)
    document.addEventListener('fin-guardado-elementos', handleFinGuardado as EventListener)
    document.addEventListener('error-guardado-elementos', handleErrorGuardado as EventListener)

    return () => {
      document.removeEventListener('inicio-guardado-elementos', handleInicioGuardado as EventListener)
      document.removeEventListener('fin-guardado-elementos', handleFinGuardado as EventListener)
      document.removeEventListener('error-guardado-elementos', handleErrorGuardado as EventListener)
    }
  }, [])

  // Función para formatear el contenido del elemento
  const formatearContenido = (contenido: unknown): string => {
    if (!contenido) return ''
    if (typeof contenido === 'string') return contenido
    if (typeof contenido === 'object' && 'texto' in contenido) {
      const contenidoTexto = contenido as { texto: string }
      return contenidoTexto.texto
    }
    if (typeof contenido === 'object') return JSON.stringify(contenido)
    return String(contenido)
  }

  // Función para convertir índice de columna a letra (estilo Excel)
  const obtenerLetraColumna = (indice: number): string => {
    let letra = '';
    while (indice >= 0) {
      letra = String.fromCharCode(65 + (indice % 26)) + letra;
      indice = Math.floor(indice / 26) - 1;
    }
    return letra;
  }

  // Función para obtener la referencia de celda (estilo Excel)
  const obtenerReferenciaCelda = (columnaId: string, numeroFila?: number): string => {
    // Extraer el número de la columna del ID (asumiendo formato 'col-X')
    const indiceColumna = parseInt(columnaId.replace('col-', '')) - 1;
    if (isNaN(indiceColumna) || indiceColumna < 0) return columnaId;
    
    const letraColumna = obtenerLetraColumna(indiceColumna);
    return `${letraColumna}${numeroFila || '?'}`;
  }

  // Función para obtener el título del tipo de elemento
  const obtenerTituloTipo = (tipo: string): string => {
    const tipos: Record<string, string> = {
      'texto': 'Texto',
      'TEXTO': 'Texto',
      'forma': 'Forma',
      'FORMA': 'Forma',
      'tabla': 'Tabla',
      'TABLA': 'Tabla',
      'imagen': 'Imagen',
      'IMAGEN': 'Imagen',
      'titulo': 'Título',
      'TITULO': 'Título',
      'subtitulo': 'Subtítulo',
      'SUBTITULO': 'Subtítulo',
      'lista': 'Lista',
      'LISTA': 'Lista'
    };
    
    return tipos[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
  }

  // Función para manejar la actualización de un elemento
  const handleElementoModificado = (elementoId: string, columna: string | undefined) => {
    if (guardandoCambios) {
      console.log('⚠️ [EditorElementos] No se puede modificar elementos durante el guardado')
      return
    }

    console.log('🔄 [EditorElementos] Modificando elemento:', {
      elementoId,
      columna,
      guardandoCambios
    })

    // Usar elementosActuales como base
    const elementoOriginal = elementosActuales.find((e: ElementoDiapositiva) => e.id === elementoId)
    if (!elementoOriginal) {
      console.log('❌ [EditorElementos] No se encontró el elemento original:', elementoId)
      return
    }
    
    const nuevosElementos = elementosActuales.map((e: ElementoDiapositiva) => 
      e.id === elementoId 
        ? { ...e, columnaAsociada: columna, modificado: true }
        : e
    )
    
    console.log('✅ [EditorElementos] Elementos actualizados:', {
      total: nuevosElementos.length,
      modificados: nuevosElementos.filter(e => e.modificado).length,
      elementoModificado: {
        id: elementoId,
        columnaAnterior: elementoOriginal.columnaAsociada,
        columnaNueva: columna
      }
    })
    
    setElementosModificados(nuevosElementos)
    setHayElementosModificados(true)
  }

  // Si no hay diapositiva seleccionada, mostrar mensaje
  if (!diapositivaSeleccionada) {
    return (
      <Box className={className} sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        p: 4,
        gap: 2,
        color: 'text.secondary'
      }}>
        <WarningIcon sx={{ fontSize: 40 }} />
        <Typography variant="h6">No hay diapositiva seleccionada</Typography>
        <Typography variant="body2" align="center">
          Selecciona una diapositiva para ver y editar sus elementos
        </Typography>
      </Box>
    )
  }

  // Función para renderizar el elemento
  const renderElemento = (elemento: ElementoDiapositiva) => {
    const contenido = formatearContenido(elemento.contenido)
    const referenciaCelda = elemento.columnaAsociada && filaSeleccionada?.indice 
      ? obtenerReferenciaCelda(elemento.columnaAsociada, filaSeleccionada.indice)
      : null
    const tipoElemento = obtenerTituloTipo(elemento.tipo)

    return (
      <ElementCard key={elemento.id}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1,
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            mb: 1 
          }}>
            <Typography 
              variant="subtitle2" 
              color="primary"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexShrink: 0
              }}
            >
              {tipoElemento}
              {elemento.modificado && (
                <Box 
                  component="span" 
                  sx={{ 
                    fontSize: '0.75rem',
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    px: 1,
                    py: 0.25,
                    borderRadius: '4px',
                    fontWeight: 'medium'
                  }}
                >
                  Modificado
                </Box>
              )}
            </Typography>
          </Box>
          
          <ElementContent onClick={() => setElementoPopup(elemento)}>
            <Typography 
              variant="body1" 
              sx={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.4,
                minHeight: '2.8em'
              }}
            >
              {contenido}
            </Typography>
          </ElementContent>

          {elemento.columnaAsociada && (
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                mt: 0.5, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                flexShrink: 0
              }}
            >
              <LinkIcon sx={{ fontSize: 14 }} />
              Celda: {referenciaCelda}
            </Typography>
          )}
        </Box>

        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          flexShrink: 0,
          alignSelf: 'flex-start'
        }}>
          <BotonEnlazarElemento elemento={elemento} />
          <IconButton
            size="small"
            onClick={() => setElementoPopup(elemento)}
          >
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </ElementCard>
    )
  }

  return (
    <Box className={className} sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      borderRadius: 1,
      overflow: 'hidden'
    }}>
      {/* Panel de editor de elementos */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1
      }}>
        {/* Cabecera */}
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6">
            Editor de Diapositiva
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {typeof diapositivaSeleccionada?.titulo === 'string' 
              ? diapositivaSeleccionada.titulo 
              : diapositivaSeleccionada?.titulo?.texto || 
                `Diapositiva ${diapositivaSeleccionada?.indice ? diapositivaSeleccionada.indice + 1 : ''}`}
          </Typography>
        </Box>

        {/* Panel de elementos */}
        <ScrollContainer sx={{ flex: 1 }}>
          <Box sx={{ p: 2 }}>
            {elementosActuales.length > 0 ? (
              elementosActuales.map((elemento: ElementoDiapositiva) => renderElemento(elemento))
            ) : (
              <Box sx={{ 
                textAlign: 'center', 
                p: 4, 
                color: 'text.secondary',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                my: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1
              }}>
                <WarningIcon sx={{ fontSize: 32, color: 'text.secondary', opacity: 0.7 }} />
                <Typography variant="body1">
                  No hay elementos en esta diapositiva
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecciona una diapositiva con elementos para editar
                </Typography>
              </Box>
            )}
          </Box>
        </ScrollContainer>

        {/* Botones de acción */}
        <Box sx={{ 
          p: 1.5, 
          borderTop: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EyeIcon />}
              onClick={() => {
                previsualizarCambios(elementosModificados, true)
                setMostrandoVistaPreviaCambios(true)
              }}
              disabled={!hayElementosModificados}
            >
              Vista Previa
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BotonCancelarElementos
              onCancelar={() => {
                setElementosModificados(elementosActuales)
                setHayElementosModificados(false)
              }}
            />
            <BotonGuardarElementos />
          </Box>
        </Box>
      </Box>

      {/* Diálogo de vista previa de cambios */}
      {mostrandoVistaPreviaCambios && (
        <VistaPreviaCambios
          cambios={elementosModificados
            .filter(elemento => elemento.modificado)
            .map(elemento => {
              const elementoActual = elementosActuales.find(e => e.id === elemento.id);
              const contenidoAnterior = elementoActual?.contenido;
              const contenidoNuevo = elemento.contenido;
              
              return {
                idDiapositiva: diapositivaSeleccionada?.id || '',
                idElemento: elemento.id,
                contenidoAnterior: typeof contenidoAnterior === 'string' 
                  ? contenidoAnterior 
                  : JSON.stringify(contenidoAnterior || ''),
                contenidoNuevo: typeof contenidoNuevo === 'string' 
                  ? contenidoNuevo 
                  : JSON.stringify(contenidoNuevo)
              } as CambioPrevio;
            })}
          abierto={mostrandoVistaPreviaCambios}
          onCerrar={() => setMostrandoVistaPreviaCambios(false)}
          onAplicar={() => {
            setMostrandoVistaPreviaCambios(false)
            actualizarElementos(elementosModificados)
          }}
        />
      )}

      {/* Popup de edición de elemento */}
      {elementoPopup && (
        <EditorElementoPopup 
          elemento={elementoPopup}
          onClose={() => setElementoPopup(null)}
          onGuardar={(elementoEditado: ElementoDiapositiva) => {
            // Solo necesitamos cerrar el popup ya que los cambios se hacen directamente en el contexto
            setElementoPopup(null)
          }}
        />
      )}
    </Box>
  )
}