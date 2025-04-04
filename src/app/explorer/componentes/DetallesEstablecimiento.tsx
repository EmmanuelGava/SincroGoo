import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Rating,
  Chip
} from '@mui/material';
import {
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
  Language as WebsiteIcon,
  Close as CloseIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { Lugar } from '@/app/servicios/google/explorer/types';

interface DetallesEstablecimientoProps {
  establecimiento: Lugar;
  onClose: () => void;
}

export function DetallesEstablecimiento({ establecimiento, onClose }: DetallesEstablecimientoProps) {
  // Adaptamos los nombres de las propiedades que vienen de la API
  const establecimientoAdaptado = {
    ...establecimiento,
    puntuacion: establecimiento.rating || establecimiento.puntuacion,
    totalPuntuaciones: establecimiento.totalRatings || establecimiento.totalPuntuaciones,
    completitud: establecimiento.completitud || 0 // Valor por defecto si no existe
  };

  console.log('Datos del establecimiento:', {
    nombre: establecimientoAdaptado.nombre,
    direccion: establecimientoAdaptado.direccion,
    telefono: establecimientoAdaptado.telefono,
    sitioWeb: establecimientoAdaptado.sitioWeb,
    puntuacion: establecimientoAdaptado.puntuacion,
    totalPuntuaciones: establecimientoAdaptado.totalPuntuaciones,
    horarios: establecimientoAdaptado.horarios,
    completitud: establecimientoAdaptado.completitud
  });

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            {establecimientoAdaptado.nombre}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <List>
          {/* Rating y Total de Reseñas */}
          {establecimientoAdaptado.puntuacion && (
            <ListItem>
              <ListItemIcon>
                <StarIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Rating value={establecimientoAdaptado.puntuacion} precision={0.1} readOnly />
                    <Typography variant="body2" component="span">
                      ({establecimientoAdaptado.puntuacion.toFixed(1)})
                    </Typography>
                    {establecimientoAdaptado.totalPuntuaciones && (
                      <Typography variant="body2" component="span" color="text.secondary">
                        {establecimientoAdaptado.totalPuntuaciones} reseñas
                      </Typography>
                    )}
                  </Stack>
                }
              />
            </ListItem>
          )}

          {/* Nivel de Precio */}
          {establecimientoAdaptado.nivelPrecio !== undefined && (
            <ListItem>
              <ListItemIcon>
                <CategoryIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Nivel de Precio"
                secondary={'$'.repeat(establecimientoAdaptado.nivelPrecio)}
              />
            </ListItem>
          )}

          {/* Dirección */}
          <ListItem>
            <ListItemIcon>
              <LocationIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Dirección"
              secondary={establecimientoAdaptado.direccion}
            />
          </ListItem>

          {/* Teléfono */}
          {establecimientoAdaptado.telefono && establecimientoAdaptado.telefono !== 'No disponible' && (
            <ListItem>
              <ListItemIcon>
                <PhoneIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Teléfono"
                secondary={
                  <Link 
                    href={`tel:${establecimientoAdaptado.telefono}`}
                    sx={{ 
                      textDecoration: 'none',
                      color: 'primary.main',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {establecimientoAdaptado.telefono}
                  </Link>
                }
              />
            </ListItem>
          )}

          {/* Sitio Web */}
          {establecimientoAdaptado.sitioWeb && (
            <ListItem>
              <ListItemIcon>
                <WebsiteIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Sitio Web"
                secondary={
                  <Link 
                    href={establecimientoAdaptado.sitioWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      textDecoration: 'none',
                      color: 'primary.main',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {establecimientoAdaptado.sitioWeb}
                  </Link>
                }
              />
            </ListItem>
          )}

          {/* Horarios */}
          {establecimientoAdaptado.horarios && establecimientoAdaptado.horarios.length > 0 && (
            <ListItem>
              <ListItemIcon>
                <AccessTimeIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Horarios"
                secondary={
                  <Stack spacing={0.5}>
                    {establecimientoAdaptado.horarios.map((horario, index) => (
                      <Typography key={index} variant="body2" component="span">
                        {horario}
                      </Typography>
                    ))}
                  </Stack>
                }
              />
            </ListItem>
          )}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
} 