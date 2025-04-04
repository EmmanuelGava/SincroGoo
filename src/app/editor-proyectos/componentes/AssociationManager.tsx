"use client"

import React, { useState, useEffect } from 'react'
import { Box, Typography, Divider, Button, List, ListItem, ListItemText, Chip, IconButton, Tooltip, Card, CardContent, Alert, Badge } from '@mui/material'
import { useSlides } from '../contexts/SlidesContext'
import { useSheets } from '../contexts/SheetsContext'
import { recomendarAsociaciones, AsociacionRecomendada, aplicarRecomendacionesAutomaticas } from '../utils/association-helpers'

// Íconos
import LinkIcon from '@mui/icons-material/Link'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import InfoIcon from '@mui/icons-material/Info'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import RecommendIcon from '@mui/icons-material/Recommend'

export function AssociationManager() {
  const { 
    elementosActuales, 
    diapositivaSeleccionada, 
    filaSeleccionada,
    enlazarElemento,
    desenlazarElemento,
    setElementosActuales,
    setHayElementosModificados
  } = useSlides()
  
  const { columnas } = useSheets()
  
  const [elementosConAsociacion, setElementosConAsociacion] = useState<any[]>([])
  const [elementosSinAsociacion, setElementosSinAsociacion] = useState<any[]>([])
  const [recomendaciones, setRecomendaciones] = useState<AsociacionRecomendada[]>([])
  const [mostrarRecomendaciones, setMostrarRecomendaciones] = useState(false)
  
  // Actualizar la lista de elementos con y sin asociación
  useEffect(() => {
    if (elementosActuales.length > 0) {
      const conAsociacion = elementosActuales.filter(elemento => elemento.columnaAsociada)
      const sinAsociacion = elementosActuales.filter(elemento => !elemento.columnaAsociada)
      
      setElementosConAsociacion(conAsociacion)
      setElementosSinAsociacion(sinAsociacion)
    } else {
      setElementosConAsociacion([])
      setElementosSinAsociacion([])
    }
  }, [elementosActuales])
  
  // Generar recomendaciones cuando cambia la fila seleccionada
  useEffect(() => {
    if (filaSeleccionada && elementosActuales.length > 0 && columnas.length > 0) {
      const nuevasRecomendaciones = recomendarAsociaciones(elementosActuales, columnas, filaSeleccionada);
      setRecomendaciones(nuevasRecomendaciones);
      
      // Mostrar automáticamente recomendaciones solo si hay al menos una recomendación con alta confianza
      if (nuevasRecomendaciones.some(rec => rec.puntuacion >= 75)) {
        setMostrarRecomendaciones(true);
      }
    }
  }, [filaSeleccionada, elementosActuales, columnas]);
  
  // Obtener el valor de contenido para mostrar
  const obtenerValorMostrable = (contenido: any): string => {
    if (typeof contenido === 'string') return contenido
    if (typeof contenido === 'object' && contenido !== null) {
      if ('texto' in contenido) return contenido.texto
      return JSON.stringify(contenido)
    }
    return String(contenido || '')
  }
  
  // Obtener el nombre de la columna asociada
  const obtenerNombreColumna = (columnaId: string): string => {
    const columna = columnas.find(c => c.id === columnaId)
    return columna ? columna.titulo : 'Columna desconocida'
  }
  
  // Encontrar el valor de la celda para un elemento en la fila seleccionada
  const obtenerValorCelda = (columnaId: string): string => {
    if (!filaSeleccionada) return 'Sin fila seleccionada'
    
    const valorCelda = filaSeleccionada.valores.find(v => v.columnaId === columnaId)
    return valorCelda ? valorCelda.valor : 'Valor no encontrado'
  }
  
  // Aplicar recomendaciones automáticamente
  const aplicarRecomendacionesAuto = () => {
    if (!filaSeleccionada || !columnas.length) return;
    
    const elementosActualizados = aplicarRecomendacionesAutomaticas(
      elementosActuales,
      columnas,
      filaSeleccionada
    );
    
    // Solo actualizar si hay cambios
    if (elementosActualizados !== elementosActuales) {
      setElementosActuales(elementosActualizados);
      setHayElementosModificados(true);
    }
  }
  
  // Renderizar un indicador de confianza
  const renderizarIndicadorConfianza = (puntuacion: number) => {
    let color = 'error';
    let label = 'Baja';
    
    if (puntuacion >= 75) {
      color = 'success';
      label = 'Alta';
    } else if (puntuacion >= 50) {
      color = 'warning';
      label = 'Media';
    }
    
    return (
      <Chip 
        size="small"
        label={`${label} (${Math.round(puntuacion)}%)`}
        color={color as any}
      />
    );
  }
  
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Administrador de Asociaciones
      </Typography>
      
      {!diapositivaSeleccionada ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Selecciona una diapositiva para gestionar asociaciones
        </Alert>
      ) : elementosActuales.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta diapositiva no contiene elementos
        </Alert>
      ) : (
        <>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">
                Diapositiva: {typeof diapositivaSeleccionada.titulo === 'string' 
                  ? diapositivaSeleccionada.titulo 
                  : diapositivaSeleccionada.titulo?.texto || `Diapositiva ${diapositivaSeleccionada.indice}`}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip 
                  icon={<InfoIcon />} 
                  label={`${elementosActuales.length} elementos`} 
                  color="primary" 
                  variant="outlined" 
                  size="small" 
                />
                <Chip 
                  icon={<LinkIcon />} 
                  label={`${elementosConAsociacion.length} asociados`} 
                  color="success" 
                  variant="outlined" 
                  size="small" 
                />
                {recomendaciones.length > 0 && (
                  <Badge badgeContent={recomendaciones.length} color="warning">
                    <Chip 
                      icon={<RecommendIcon />} 
                      label="Recomendaciones" 
                      color="warning" 
                      variant="outlined" 
                      size="small"
                      onClick={() => setMostrarRecomendaciones(!mostrarRecomendaciones)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Badge>
                )}
              </Box>
            </CardContent>
          </Card>
          
          {filaSeleccionada ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Fila seleccionada: ID {filaSeleccionada.id}
              </Typography>
              
              {recomendaciones.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<AutoFixHighIcon />}
                    onClick={aplicarRecomendacionesAuto}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    Aplicar asociaciones automáticas
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setMostrarRecomendaciones(!mostrarRecomendaciones)}
                  >
                    {mostrarRecomendaciones ? 'Ocultar' : 'Ver'} recomendaciones
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Selecciona una fila en la tabla para ver los valores actuales
            </Alert>
          )}
          
          {/* Sección de recomendaciones */}
          {mostrarRecomendaciones && recomendaciones.length > 0 && (
            <Box sx={{ mb: 3, mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Recomendaciones ({recomendaciones.length})
              </Typography>
              <Card variant="outlined">
                <List dense>
                  {recomendaciones.map((rec) => {
                    const elemento = elementosActuales.find(e => e.id === rec.elementoId);
                    if (!elemento) return null;
                    
                    return (
                      <ListItem
                        key={`${rec.elementoId}-${rec.columnaId}`}
                        secondaryAction={
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => enlazarElemento(rec.elementoId, rec.columnaId)}
                          >
                            Aplicar
                          </Button>
                        }
                        divider
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                {obtenerValorMostrable(elemento.contenido).substring(0, 30)}
                                {obtenerValorMostrable(elemento.contenido).length > 30 ? '...' : ''}
                              </Typography>
                              <Typography variant="body2">
                                → 
                              </Typography>
                              <Chip 
                                label={obtenerNombreColumna(rec.columnaId)}
                                size="small"
                                color="primary"
                              />
                              {renderizarIndicadorConfianza(rec.puntuacion)}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {rec.razon} | Valor celda: {obtenerValorCelda(rec.columnaId)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Card>
            </Box>
          )}
          
          <Typography variant="subtitle1" gutterBottom>
            Elementos con asociación ({elementosConAsociacion.length})
          </Typography>
          
          {elementosConAsociacion.length > 0 ? (
            <List>
              {elementosConAsociacion.map((elemento) => (
                <ListItem 
                  key={elemento.id}
                  secondaryAction={
                    <Tooltip title="Eliminar asociación">
                      <IconButton 
                        edge="end" 
                        aria-label="desenlazar"
                        onClick={() => desenlazarElemento(elemento.id)}
                      >
                        <LinkOffIcon />
                      </IconButton>
                    </Tooltip>
                  }
                  sx={{ 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {obtenerValorMostrable(elemento.contenido).substring(0, 50)}
                          {obtenerValorMostrable(elemento.contenido).length > 50 ? '...' : ''}
                        </Typography>
                        <Chip 
                          label={obtenerNombreColumna(elemento.columnaAsociada)} 
                          color="primary"
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Tipo: {elemento.tipo} | ID: {elemento.id.substring(0, 8)}...
                        </Typography>
                        
                        {filaSeleccionada && (
                          <Box sx={{ 
                            mt: 1, 
                            p: 1, 
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Typography variant="caption" fontWeight="bold">
                              Valor actual:
                            </Typography>
                            <Typography variant="body2">
                              {obtenerValorCelda(elemento.columnaAsociada)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No hay elementos con asociaciones
            </Typography>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Elementos sin asociación ({elementosSinAsociacion.length})
          </Typography>
          
          {elementosSinAsociacion.length > 0 ? (
            <List>
              {elementosSinAsociacion.map((elemento) => (
                <ListItem 
                  key={elemento.id}
                  sx={{ 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'background.default'
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body1">
                        {obtenerValorMostrable(elemento.contenido).substring(0, 50)}
                        {obtenerValorMostrable(elemento.contenido).length > 50 ? '...' : ''}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Tipo: {elemento.tipo} | ID: {elemento.id.substring(0, 8)}...
                        </Typography>
                        
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" fontWeight="bold" gutterBottom>
                            Asociar con columna:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {columnas.map((columna) => (
                              <Chip 
                                key={columna.id}
                                label={columna.titulo}
                                size="small"
                                variant="outlined"
                                onClick={() => enlazarElemento(elemento.id, columna.id)}
                                icon={<LinkIcon fontSize="small" />}
                                sx={{ cursor: 'pointer' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Todos los elementos están asociados
            </Typography>
          )}
        </>
      )}
    </Box>
  )
} 