"use client"

import { useState } from "react"
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  ListItemIcon
} from "@mui/material"
import { ElementoDiapositiva } from "../../types"
import { useSlides } from "../../contexts/SlidesContext"
import { useSheets } from "../../contexts/SheetsContext"
import { Link, Unlink } from "lucide-react"

interface EditorElementoPopupProps {
  elemento: ElementoDiapositiva
  onClose: () => void
  onGuardar: (elementoActualizado: ElementoDiapositiva) => void
}

export function EditorElementoPopup({
  elemento,
  onClose,
  onGuardar
}: EditorElementoPopupProps) {
  const [elementoEditado, setElementoEditado] = useState<ElementoDiapositiva>({...elemento})
  const { 
    filaSeleccionada,
    elementosActuales,
    elementosModificados,
    setElementosActuales,
    setElementosModificados,
    setHayElementosModificados,
    enlazarElemento,
    desenlazarElemento
  } = useSlides()
  
  const { columnas } = useSheets()

  // Función para obtener el contenido como texto
  const obtenerContenidoTexto = (contenido: any): string => {
    if (contenido === null || contenido === undefined) return ''
    
    // Si es una cadena, devolverla directamente
    if (typeof contenido === 'string') return contenido
    
    // Si es una fecha, formatearla
    if (contenido instanceof Date) {
      return contenido.toLocaleDateString()
    }
    
    // Si es un objeto con propiedad texto
    if (typeof contenido === 'object' && 'texto' in contenido) {
      return contenido.texto
    }
    
    // Si es un objeto con valor específico
    if (typeof contenido === 'object' && 'valor' in contenido) {
      return String(contenido.valor)
    }
    
    // Para otros objetos, intentar convertir a string de forma segura
    try {
      if (typeof contenido === 'object') {
        return JSON.stringify(contenido, null, 2)
      }
      return String(contenido)
    } catch (error) {
      console.error('Error al convertir contenido a texto:', error)
      return '[Error: Contenido no válido]'
    }
  }

  // Función para actualizar el contenido
  const actualizarContenido = (nuevoContenido: string) => {
    if (typeof elemento.contenido === 'object' && elemento.contenido !== null && 'texto' in elemento.contenido) {
      setElementoEditado({
        ...elementoEditado,
        contenido: {
          ...elemento.contenido,
          texto: nuevoContenido
        }
      })
    } else {
      setElementoEditado({
        ...elementoEditado,
        contenido: nuevoContenido
      })
    }
  }
  
  // Función para asociar con una columna específica al seleccionar un valor
  const asociarConColumna = (columnaId: string, valor: string) => {
    const nuevoContenido = typeof elementoEditado.contenido === 'object' && 
      elementoEditado.contenido !== null && 
      'texto' in elementoEditado.contenido
        ? { ...elementoEditado.contenido, texto: valor }
        : valor;
    
    setElementoEditado({
      ...elementoEditado,
      columnaAsociada: columnaId,
      contenido: nuevoContenido,
      modificado: true
    });
  };
  
  // Función para desasociar el elemento
  const desasociarElemento = () => {
    setElementoEditado({
      ...elementoEditado,
      columnaAsociada: undefined,
      modificado: true
    });
  };
  
  // Función para obtener nombre de columna asociada
  const obtenerNombreColumna = (columnaId: string): string => {
    const columna = columnas.find(c => c.id === columnaId);
    return columna ? columna.titulo : "Columna desconocida";
  };

  const handleGuardar = () => {
    console.log('✏️ [EditorElementoPopup] Guardando cambios:', {
      elementoId: elementoEditado.id,
      contenidoAnterior: elemento.contenido,
      contenidoNuevo: elementoEditado.contenido,
      columnaAsociadaAnterior: elemento.columnaAsociada,
      columnaAsociadaNueva: elementoEditado.columnaAsociada
    })

    // Verificar si realmente hubo cambios
    const contenidoAnterior = obtenerContenidoTexto(elemento.contenido)
    const contenidoNuevo = obtenerContenidoTexto(elementoEditado.contenido)
    const columnaAnterior = elemento.columnaAsociada
    const columnaNueva = elementoEditado.columnaAsociada
    
    if (contenidoAnterior === contenidoNuevo && columnaAnterior === columnaNueva) {
      console.log('ℹ️ [EditorElementoPopup] No hay cambios en el contenido ni en la asociación')
      onClose()
      return
    }

    // Crear el elemento con la marca de modificado
    const elementoConMarca = {
      ...elementoEditado,
      modificado: true
    }

    // Actualizar elementos actuales manteniendo los demás elementos
    const nuevosElementosActuales = elementosActuales.map((e: ElementoDiapositiva) => 
      e.id === elementoEditado.id ? elementoConMarca : e
    )

    // Actualizar elementos modificados
    const elementoYaModificado = elementosModificados.some((e: ElementoDiapositiva) => e.id === elementoEditado.id)
    let nuevosElementosModificados = elementosModificados

    if (!elementoYaModificado) {
      nuevosElementosModificados = [...elementosModificados, elementoConMarca]
    } else {
      nuevosElementosModificados = elementosModificados.map((e: ElementoDiapositiva) =>
        e.id === elementoEditado.id ? elementoConMarca : e
      )
    }

    console.log('✅ [EditorElementoPopup] Elementos actualizados:', {
      elementoId: elementoEditado.id,
      totalActuales: nuevosElementosActuales.length,
      totalModificados: nuevosElementosModificados.length,
      elementosModificados: nuevosElementosModificados.map((e: ElementoDiapositiva) => ({
        id: e.id,
        tipo: e.tipo,
        contenido: obtenerContenidoTexto(e.contenido),
        modificado: e.modificado,
        columnaAsociada: e.columnaAsociada
      }))
    })

    // Actualizar el contexto
    setElementosActuales(nuevosElementosActuales)
    setElementosModificados(nuevosElementosModificados)
    setHayElementosModificados(true)

    // Notificar al padre
    onGuardar(elementoConMarca)
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar Elemento</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {/* Campo para edición manual */}
          <TextField
            fullWidth
            label="Editar contenido manualmente"
            value={obtenerContenidoTexto(elementoEditado.contenido)}
            onChange={(e) => actualizarContenido(e.target.value)}
            multiline
            rows={2}
          />
          
          {/* Estado de asociación */}
          {elementoEditado.columnaAsociada && (
            <Box sx={{ mt: 1 }}>
              <Chip 
                icon={<Link size={14} />}
                label={`Asociado a: ${obtenerNombreColumna(elementoEditado.columnaAsociada)}`}
                color="primary"
                variant="outlined"
                size="small"
                onDelete={desasociarElemento}
                deleteIcon={<Unlink size={14} />}
              />
            </Box>
          )}

          <Divider />

          {/* Valores de la fila seleccionada */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Valores Disponibles
            </Typography>
            {filaSeleccionada ? (
              <List sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                {filaSeleccionada.valores
                  .filter(({valor}) => valor !== null && valor !== undefined && valor !== '')
                  .map(({columnaId, valor}) => {
                    const columna = columnas.find(c => c.id === columnaId);
                    const esValorSeleccionado = obtenerContenidoTexto(elementoEditado.contenido) === valor;
                    const esColumnaAsociada = elementoEditado.columnaAsociada === columnaId;
                    
                    return (
                      <ListItemButton 
                        key={columnaId}
                        onClick={() => actualizarContenido(valor)}
                        selected={esValorSeleccionado}
                        sx={{
                          borderLeft: esColumnaAsociada ? 3 : 0,
                          borderColor: 'primary.main',
                          bgcolor: esValorSeleccionado ? 'action.selected' : 'inherit'
                        }}
                      >
                        <ListItemText 
                          primary={valor}
                          secondary={columna ? columna.titulo : ""}
                          primaryTypographyProps={{
                            fontWeight: esValorSeleccionado ? 'bold' : 'regular'
                          }}
                        />
                        <Button
                          variant="text"
                          size="small"
                          color={esColumnaAsociada ? "primary" : "inherit"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (esColumnaAsociada) {
                              desasociarElemento();
                            } else {
                              asociarConColumna(columnaId, valor);
                              // Actualizamos automáticamente el contenido cuando se enlaza
                              actualizarContenido(valor);
                            }
                          }}
                          sx={{ minWidth: 40, ml: 1 }}
                        >
                          {esColumnaAsociada ? 
                            <Unlink size={16} /> : 
                            <Link size={16} />
                          }
                        </Button>
                      </ListItemButton>
                    );
                  })
                }
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No hay fila seleccionada
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleGuardar} variant="contained" color="primary">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}