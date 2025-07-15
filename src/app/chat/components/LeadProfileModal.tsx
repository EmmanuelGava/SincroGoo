import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Avatar,
  Chip,
  Divider,
  Button,
  IconButton,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';

interface Lead {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  ciudad?: string;
  pais?: string;
  estado_lead: string;
  fecha_creacion: string;
  ultima_interaccion?: string;
  valor_estimado?: number;
  origen?: string;
  notas?: string;
}

interface Interaccion {
  id: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  canal?: string;
}

interface LeadProfileModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

export default function LeadProfileModal({ open, onClose, leadId }: LeadProfileModalProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && leadId) {
      fetchLeadData();
    }
  }, [open, leadId]);

  const fetchLeadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch lead data
      const leadRes = await fetch(`/api/leads/${leadId}`);
      if (!leadRes.ok) {
        throw new Error('Error cargando datos del lead');
      }
      const leadData = await leadRes.json();
      setLead(leadData.lead);

      // Fetch interactions
      const interaccionesRes = await fetch(`/api/leads/${leadId}/interacciones`);
      if (interaccionesRes.ok) {
        const interaccionesData = await interaccionesRes.json();
        setInteracciones(interaccionesData.interacciones || []);
      }
    } catch (error) {
      console.error('Error fetching lead data:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'nuevo': return 'info';
      case 'contactado': return 'warning';
      case 'calificado': return 'primary';
      case 'propuesta': return 'secondary';
      case 'cerrado': return 'success';
      case 'perdido': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'No especificado';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInteractionIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'mensaje': return <ChatIcon />;
      case 'email': return <EmailIcon />;
      case 'llamada': return <PhoneIcon />;
      default: return <HistoryIcon />;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Alert severity="error">{error}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!lead) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            {lead.nombre.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6">{lead.nombre}</Typography>
            <Chip 
              label={lead.estado_lead}
              color={getEstadoColor(lead.estado_lead) as any}
              size="small"
            />
          </Box>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Información Personal */}
          <Grid item xs={12} md={6}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="primary" />
                  Información Personal
                </Typography>
                <List dense>
                  {lead.email && (
                    <ListItem>
                      <ListItemIcon><EmailIcon /></ListItemIcon>
                      <ListItemText primary="Email" secondary={lead.email} />
                    </ListItem>
                  )}
                  {lead.telefono && (
                    <ListItem>
                      <ListItemIcon><PhoneIcon /></ListItemIcon>
                      <ListItemText primary="Teléfono" secondary={lead.telefono} />
                    </ListItem>
                  )}
                  {lead.empresa && (
                    <ListItem>
                      <ListItemIcon><BusinessIcon /></ListItemIcon>
                      <ListItemText primary="Empresa" secondary={lead.empresa} />
                    </ListItem>
                  )}
                  {lead.cargo && (
                    <ListItem>
                      <ListItemText primary="Cargo" secondary={lead.cargo} />
                    </ListItem>
                  )}
                  {(lead.ciudad || lead.pais) && (
                    <ListItem>
                      <ListItemIcon><LocationOnIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Ubicación" 
                        secondary={[lead.ciudad, lead.pais].filter(Boolean).join(', ')} 
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Información de Ventas */}
          <Grid item xs={12} md={6}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="primary" />
                  Información de Ventas
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Valor Estimado" 
                      secondary={formatCurrency(lead.valor_estimado)} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Origen" secondary={lead.origen || 'No especificado'} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CalendarTodayIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Fecha de Creación" 
                      secondary={formatDate(lead.fecha_creacion)} 
                    />
                  </ListItem>
                  {lead.ultima_interaccion && (
                    <ListItem>
                      <ListItemText 
                        primary="Última Interacción" 
                        secondary={formatDate(lead.ultima_interaccion)} 
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Notas */}
          {lead.notas && (
            <Grid item xs={12}>
              <Card elevation={1}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Notas
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {lead.notas}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Historial de Interacciones */}
          <Grid item xs={12}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon color="primary" />
                  Historial de Interacciones ({interacciones.length})
                </Typography>
                {interacciones.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No hay interacciones registradas
                  </Typography>
                ) : (
                  <List>
                    {interacciones.slice(0, 5).map((interaccion, index) => (
                      <React.Fragment key={interaccion.id}>
                        <ListItem>
                          <ListItemIcon>
                            {getInteractionIcon(interaccion.tipo)}
                          </ListItemIcon>
                          <ListItemText
                            primary={interaccion.descripcion}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Typography variant="caption">
                                  {formatDate(interaccion.fecha)}
                                </Typography>
                                {interaccion.canal && (
                                  <Chip 
                                    label={interaccion.canal} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < interacciones.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                    {interacciones.length > 5 && (
                      <ListItem>
                        <ListItemText 
                          primary={
                            <Typography variant="body2" color="text.secondary" align="center">
                              ... y {interacciones.length - 5} interacciones más
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}