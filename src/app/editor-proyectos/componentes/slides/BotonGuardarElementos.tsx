"use client"

import { useState, useEffect } from "react"
import { 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText
} from "@mui/material"
import { Save as SaveIcon } from "@mui/icons-material"
import { useUI } from "../../contexts"
import { useSlides } from "../../contexts"
import { ElementoDiapositiva } from "../../types"
import { toast } from "sonner"

export function BotonGuardarElementos() {
  const { cargando, setCargando } = useUI()
  const [mostrarPrevia, setMostrarPrevia] = useState(false)
  const {
    elementosActuales,
    elementosPrevia,
    hayElementosModificados,
    actualizarElementos,
    filaSeleccionada,
    diapositivaSeleccionada
  } = useSlides()

  console.log('🔄 [BotonGuardarElementos] Estado actual:', {
    hayElementosModificados,
    tieneFilaSeleccionada: !!filaSeleccionada,
    tieneDiapositivaSeleccionada: !!diapositivaSeleccionada,
    elementosActuales: elementosActuales?.length,
    elementosPrevia: elementosPrevia?.length,
    cargando
  })

  const handleGuardar = async () => {
    console.log('🔄 [BotonGuardarElementos] Iniciando handleGuardar')
    
    if (!hayElementosModificados || !filaSeleccionada || !diapositivaSeleccionada) {
      console.log('❌ [BotonGuardarElementos] No se puede guardar:', {
        hayElementosModificados,
        tieneFilaSeleccionada: !!filaSeleccionada,
        tieneDiapositivaSeleccionada: !!diapositivaSeleccionada,
        filaId: filaSeleccionada?.id,
        diapositivaId: diapositivaSeleccionada?.id
      })
      return
    }

    try {
      setCargando(true)
      console.log('🔄 [BotonGuardarElementos] Iniciando guardado:', {
        elementosActuales: elementosActuales.length,
        totalModificados: elementosModificados.length,
        idDiapositiva: diapositivaSeleccionada.id,
        filaId: filaSeleccionada.id,
        detallesModificados: elementosModificados.map(e => ({
          id: e.id,
          tipo: e.tipo,
          contenido: e.contenido,
          columnaAsociada: e.columnaAsociada
        }))
      })

      // Emitir evento de inicio de guardado
      const eventoInicioGuardado = new CustomEvent('inicio-guardado-elementos', {
        detail: {
          elementos: elementosActuales,
          idDiapositiva: diapositivaSeleccionada.id,
          filaId: filaSeleccionada.id
        }
      })
      document.dispatchEvent(eventoInicioGuardado)
      
      // Guardar los cambios usando el contexto
      const resultado = await actualizarElementos(elementosModificados)
      console.log('✅ [BotonGuardarElementos] Resultado guardado:', { 
        resultado,
        elementosGuardados: elementosModificados.length
      })

      // Emitir evento de fin de guardado
      const eventoFinGuardado = new CustomEvent('fin-guardado-elementos', {
        detail: {
          exito: resultado,
          elementos: elementosModificados
        }
      })
      document.dispatchEvent(eventoFinGuardado)
      
      if (resultado) {
        setMostrarPrevia(false)
        toast.success('Cambios guardados correctamente', {
          description: 'Los elementos se han actualizado exitosamente'
        })
      }
    } catch (error) {
      console.error('❌ [BotonGuardarElementos] Error al guardar:', error)
      toast.error('Error al guardar los cambios', {
        description: 'Ocurrió un error al intentar guardar los elementos'
      })

      // Emitir evento de error en guardado
      const eventoErrorGuardado = new CustomEvent('error-guardado-elementos', {
        detail: { error }
      })
      document.dispatchEvent(eventoErrorGuardado)
    } finally {
      setCargando(false)
    }
  }

  // Obtener los elementos que han sido modificados para mostrar en la vista previa
  const elementosModificados = elementosActuales.filter(elemento => {
    const elementoOriginal = elementosPrevia.find(e => e.id === elemento.id)
    if (!elementoOriginal) {
      console.log('⚠️ [BotonGuardarElementos] Elemento sin original:', {
        id: elemento.id,
        tipo: elemento.tipo
      })
      return false
    }

    // Verificar si el contenido ha cambiado
    const contenidoCambiado = JSON.stringify(elemento.contenido) !== JSON.stringify(elementoOriginal.contenido)
    
    // Verificar si la asociación ha cambiado
    const asociacionCambiada = elemento.columnaAsociada !== elementoOriginal.columnaAsociada

    const modificado = contenidoCambiado || asociacionCambiada

    if (modificado) {
      console.log('✏️ [BotonGuardarElementos] Elemento modificado:', {
        id: elemento.id,
        tipo: elemento.tipo,
        contenidoCambiado,
        asociacionCambiada,
        contenidoAnterior: elementoOriginal.contenido,
        contenidoNuevo: elemento.contenido,
        asociacionAnterior: elementoOriginal.columnaAsociada,
        asociacionNueva: elemento.columnaAsociada
      })
    }

    return modificado
  })

  // Actualizar hayElementosModificados cuando cambian los elementos
  useEffect(() => {
    const tieneModificaciones = elementosModificados.length > 0
    console.log('🔄 [BotonGuardarElementos] Verificando modificaciones:', {
      elementosActuales: elementosActuales.length,
      elementosPrevia: elementosPrevia.length,
      elementosModificados: elementosModificados.length,
      tieneModificaciones
    })
  }, [elementosActuales, elementosPrevia, elementosModificados])

  // Función para obtener el contenido como texto
  const obtenerContenidoTexto = (contenido: any): string => {
    if (typeof contenido === 'string') return contenido
    if (typeof contenido === 'object' && contenido !== null) {
      if ('texto' in contenido) return contenido.texto
      return JSON.stringify(contenido)
    }
    return String(contenido || '')
  }

  return (
    <>
      <Button
        variant="contained"
        onClick={() => {
          console.log('🔄 [BotonGuardarElementos] Click en botón guardar:', {
            hayElementosModificados,
            cargando,
            botonDeshabilitado: !hayElementosModificados || cargando
          })
          setMostrarPrevia(true)
        }}
        disabled={!hayElementosModificados || cargando}
        startIcon={<SaveIcon />}
      >
        Guardar
      </Button>

      <Dialog 
        open={mostrarPrevia} 
        onClose={() => {
          console.log('🔄 [BotonGuardarElementos] Cerrando diálogo de previa')
          setMostrarPrevia(false)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Cambios</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Elementos Modificados
            </Typography>
            <List>
              {elementosModificados.map(elemento => {
                const elementoOriginal = elementosPrevia.find((e: ElementoDiapositiva) => e.id === elemento.id)
                return (
                  <ListItem key={elemento.id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={`Elemento ${elemento.tipo}`}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                          {elementoOriginal && obtenerContenidoTexto(elemento.contenido) !== obtenerContenidoTexto(elementoOriginal.contenido) && (
                            <>
                              <Typography variant="body2" component="span">
                                Valor anterior: {obtenerContenidoTexto(elementoOriginal.contenido)}
                              </Typography>
                              <Typography variant="body2" component="span" color="primary">
                                Nuevo valor: {obtenerContenidoTexto(elemento.contenido)}
                              </Typography>
                            </>
                          )}
                          {elementoOriginal && elemento.columnaAsociada !== elementoOriginal.columnaAsociada && (
                            <>
                              <Typography variant="body2" component="span">
                                Asociación anterior: {elementoOriginal.columnaAsociada || 'Sin asociación'}
                              </Typography>
                              <Typography variant="body2" component="span" color="primary">
                                Nueva asociación: {elemento.columnaAsociada || 'Sin asociación'}
                              </Typography>
                            </>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                )
              })}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMostrarPrevia(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              console.log('🔄 [BotonGuardarElementos] Click en botón confirmar:', {
                hayElementosModificados,
                tieneFilaSeleccionada: !!filaSeleccionada,
                tieneDiapositivaSeleccionada: !!diapositivaSeleccionada,
                elementosModificados: elementosModificados.length
              })
              handleGuardar()
            }} 
            variant="contained" 
            color="primary"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}