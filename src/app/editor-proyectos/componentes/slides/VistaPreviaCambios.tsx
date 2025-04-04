"use client"

import { Dialog, DialogContent, DialogTitle } from "@mui/material"
import { Button } from "@/componentes/ui"
import { ScrollArea } from "@/componentes/ui/scroll-area"
import { Check, X, Eye } from "lucide-react"
import { Box, Typography, Divider, Chip } from "@mui/material"

interface CambioPrevio {
  idDiapositiva: string
  idElemento: string
  contenidoAnterior: string
  contenidoNuevo: string
  variables?: string[]
}

interface VistaPreviaCambiosProps {
  cambios: CambioPrevio[]
  onCerrar: () => void
  onAplicar: () => void
  abierto: boolean
  cargando?: boolean
}

export function VistaPreviaCambios({
  cambios,
  onCerrar,
  onAplicar,
  abierto,
  cargando = false
}: VistaPreviaCambiosProps) {
  // Función para dar formato al contenido y destacar los cambios
  const formatearContenido = (contenido: string) => {
    try {
      // Si es JSON, intentar parsearlo para mostrarlo formateado
      const obj = JSON.parse(contenido);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      // Si no es JSON, devolver como texto normal
      return contenido;
    }
  };

  return (
    <Dialog 
      open={abierto} 
      onClose={onCerrar}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }
      }}
    >
      <DialogContent sx={{ 
        height: '80vh', 
        display: 'flex', 
        flexDirection: 'column', 
        p: 3,
        bgcolor: 'background.paper' 
      }}>
        <Box sx={{ mb: 3 }}>
          <DialogTitle sx={{ px: 0, fontWeight: 600 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Eye size={20} />
              Vista Previa de Cambios
            </Box>
          </DialogTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Revisa los cambios antes de aplicarlos a la presentación. 
            Se mostrarán {cambios.length} elementos que serán modificados.
          </Typography>
          <Divider sx={{ mt: 2 }} />
        </Box>

        {cambios.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            flex: 1,
            py: 6
          }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No hay cambios para previsualizar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Realiza cambios en los elementos para ver una comparación
            </Typography>
          </Box>
        ) : (
          <ScrollArea className="flex-1 px-1">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
              {cambios.map((cambio, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden' 
                  }}
                >
                  <Box sx={{ 
                    bgcolor: 'background.default', 
                    p: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Typography variant="subtitle2">
                      Elemento ID: {cambio.idElemento.substring(0, 8)}...
                    </Typography>
                    <Chip 
                      label="Modificado" 
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr',
                    gap: 0,
                  }}>
                    <Box sx={{ 
                      p: 2, 
                      borderRight: '1px solid', 
                      borderColor: 'divider'
                    }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                        Contenido Original
                      </Typography>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'action.hover', 
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        {formatearContenido(cambio.contenidoAnterior)}
                      </Box>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                        Contenido Nuevo
                      </Typography>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'success.lightest', 
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        maxHeight: '200px',
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'success.light',
                      }}>
                        {formatearContenido(cambio.contenidoNuevo)}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </ScrollArea>
        )}

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          pt: 2, 
          mt: 2,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            {cambios.length} {cambios.length === 1 ? 'elemento' : 'elementos'} a modificar
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button 
              variant="outlined" 
              onClick={onCerrar}
              startIcon={<X size={18} />}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={onAplicar}
              disabled={cargando || cambios.length === 0}
              startIcon={<Check size={18} />}
            >
              {cargando ? 'Aplicando...' : 'Aplicar Cambios'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
} 