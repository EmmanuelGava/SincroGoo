import { 
  Dialog,
  DialogTitle,
  DialogContent,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Paper
} from '@mui/material';
import type { PreviewChange } from "@/types/preview"

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  changes: PreviewChange[]
  isLoading: boolean
}

export function PreviewModal({ isOpen, onClose, changes, isLoading }: PreviewModalProps) {
  const getRgbaColor = (color?: { opaqueColor?: { rgbColor?: { red?: number, green?: number, blue?: number } } }) => {
    if (!color?.opaqueColor?.rgbColor) return 'currentColor'
    const { red = 0, green = 0, blue = 0 } = color.opaqueColor.rgbColor
    return `rgb(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)})`
  }

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Vista Previa de Cambios</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box display="flex" alignItems="center" justifyContent="center" p={4}>
            <CircularProgress size={32} />
            <Typography sx={{ ml: 2 }}>Generando vista previa...</Typography>
          </Box>
        ) : changes.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {changes.map((change, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Diapositiva {change.slideIndex}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tipo: {change.elementData.type}
                    </Typography>
                  </Box>
                  
                  <Box 
                    position="relative" 
                    width="100%" 
                    sx={{ 
                      aspectRatio: '16/9',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: '#f0f0f0',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `
                          linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px'
                      }
                    }}
                  >
                    <Box
                      position="absolute"
                      sx={{
                        left: `${(change.position?.x || 0) / 720 * 100}%`,
                        top: `${(change.position?.y || 0) / 405 * 100}%`,
                        transform: `
                          translate(-50%, -50%) 
                          rotate(${change.elementData.rotation || 0}deg)
                          scale(${change.elementData.width || 1}, ${change.elementData.height || 1})
                        `,
                        fontSize: change.elementData.style.fontSize?.magnitude 
                          ? `${change.elementData.style.fontSize.magnitude}${change.elementData.style.fontSize.unit || 'pt'}`
                          : '16px',
                        fontFamily: change.elementData.style.fontFamily || 'Arial',
                        color: getRgbaColor(change.elementData.style.foregroundColor),
                        fontWeight: change.elementData.style.bold ? 'bold' : 'normal',
                        fontStyle: change.elementData.style.italic ? 'italic' : 'normal',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        minWidth: '80px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.75)',
                            textDecoration: 'line-through'
                          }}
                        >
                          {change.oldPrice}
                        </Typography>
                        <Typography 
                          variant="body2"
                          sx={{ 
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        >
                          {change.newPrice}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={6}>
                      <Box sx={{ '& > p': { mb: 1 } }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Posición:
                        </Typography>
                        <Typography variant="body2">
                          X: {Math.round(change.position?.x || 0)}<br/>
                          Y: {Math.round(change.position?.y || 0)}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                          Rotación:
                        </Typography>
                        <Typography variant="body2">
                          {Math.round(change.elementData.rotation || 0)}°
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ '& > p': { mb: 1 } }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Estilo:
                        </Typography>
                        <Typography variant="body2">
                          {change.elementData.style.fontFamily || 'Arial'}<br/>
                          {change.elementData.style.fontSize?.magnitude 
                            ? `${change.elementData.style.fontSize.magnitude}${change.elementData.style.fontSize.unit || 'pt'}`
                            : '16px'}
                        </Typography>
                        <Typography variant="body2">
                          {change.elementData.style.bold && 'Negrita '}
                          {change.elementData.style.italic && 'Cursiva'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Box py={4} textAlign="center">
            <Typography color="text.secondary">
              No hay elementos para previsualizar
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Agregar estos estilos en tu archivo globals.css
// .bg-grid-pattern {
//   background-image: linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px),
//                     linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px);
//   background-size: 20px 20px;
//   background-color: #f8f9fa;
// } 