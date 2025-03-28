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
  Stack
} from '@mui/material';
import {
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
  Language as WebsiteIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Lugar } from '../servicios/google-places-service';

interface DetallesEstablecimientoProps {
  establecimiento: Lugar;
  onClose: () => void;
}

export function DetallesEstablecimiento({ establecimiento, onClose }: DetallesEstablecimientoProps) {
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
            {establecimiento.nombre}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <List>
          {/* Dirección */}
          <ListItem>
            <ListItemIcon>
              <LocationIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Dirección"
              secondary={establecimiento.direccion}
            />
          </ListItem>

          {/* Teléfono */}
          {establecimiento.telefono && (
            <ListItem>
              <ListItemIcon>
                <PhoneIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Teléfono"
                secondary={
                  <Link 
                    href={`tel:${establecimiento.telefono}`}
                    sx={{ 
                      textDecoration: 'none',
                      color: 'primary.main',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {establecimiento.telefono}
                  </Link>
                }
              />
            </ListItem>
          )}

          {/* Sitio Web */}
          {establecimiento.sitioWeb && (
            <ListItem>
              <ListItemIcon>
                <WebsiteIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Sitio Web"
                secondary={
                  <Link 
                    href={establecimiento.sitioWeb}
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
                    {establecimiento.sitioWeb}
                  </Link>
                }
              />
            </ListItem>
          )}

          {/* Horarios */}
          {establecimiento.horarios && establecimiento.horarios.length > 0 && (
            <ListItem>
              <ListItemIcon>
                <AccessTimeIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Horarios"
                secondary={
                  <Stack spacing={0.5}>
                    {establecimiento.horarios.map((horario, index) => (
                      <Typography key={index} variant="body2" component="div">
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