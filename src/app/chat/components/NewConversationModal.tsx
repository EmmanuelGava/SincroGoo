import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Avatar,
  Chip,
  InputAdornment,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';

interface Lead {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  estado_lead: string;
}

interface Conversacion {
  id: string;
  remitente: string;
  servicio_origen: string;
  fecha_mensaje: string;
  lead_id?: string;
  ultimo_mensaje?: string;
  metadata?: any;
}

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
  onConversationCreated: (conversacion: Conversacion) => void;
}

type TabValue = 'leads' | 'nuevo';
type Platform = 'telegram' | 'whatsapp' | 'email';

const platformIcons = {
  telegram: TelegramIcon,
  whatsapp: WhatsAppIcon,
  email: EmailIcon
};

const platformColors = {
  telegram: '#229ED9',
  whatsapp: '#25D366',
  email: '#D44638'
};

const platformLabels = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  email: 'Email'
};

export default function NewConversationModal({ 
  open, 
  onClose, 
  onConversationCreated 
}: NewConversationModalProps) {
  const [tab, setTab] = useState<TabValue>('leads');
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [platform, setPlatform] = useState<Platform>('telegram');
  const [contactInfo, setContactInfo] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Cargar leads cuando se abre el modal
  useEffect(() => {
    if (open) {
      fetchLeads();
      // Reset form
      setSearchTerm('');
      setSelectedLead(null);
      setContactInfo('');
      setMessage('');
      setError(null);
    }
  }, [open]);

  // Filtrar leads basado en búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredLeads(leads);
    } else {
      const filtered = leads.filter(lead =>
        lead.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLeads(filtered);
    }
  }, [searchTerm, leads]);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/leads/buscar');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const getContactValue = (lead: Lead) => {
    switch (platform) {
      case 'telegram':
        return lead.telefono || '';
      case 'whatsapp':
        return lead.telefono || '';
      case 'email':
        return lead.email || '';
      default:
        return '';
    }
  };

  const validateContactInfo = () => {
    if (tab === 'leads' && selectedLead) {
      const contactValue = getContactValue(selectedLead);
      if (!contactValue) {
        setError(`El lead seleccionado no tiene ${platform === 'email' ? 'email' : 'teléfono'} registrado`);
        return false;
      }
    } else if (tab === 'nuevo' && !contactInfo.trim()) {
      setError('Debes ingresar la información de contacto');
      return false;
    }

    if (!message.trim()) {
      setError('Debes escribir un mensaje');
      return false;
    }

    return true;
  };

  const handleCreateConversation = async () => {
    if (!validateContactInfo()) return;

    setLoading(true);
    setError(null);

    try {
      const contactValue = tab === 'leads' && selectedLead 
        ? getContactValue(selectedLead)
        : contactInfo;

      const contactName = tab === 'leads' && selectedLead
        ? selectedLead.nombre
        : contactValue;

      const res = await fetch('/api/chat/nueva-conversacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plataforma: platform,
          contacto: contactValue,
          nombre: contactName,
          mensaje: message.trim(),
          leadId: tab === 'leads' && selectedLead ? selectedLead.id : undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        onConversationCreated(data.conversacion);
      } else {
        setError(data.error || 'Error creando conversación');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (platform) {
      case 'telegram':
        return 'Username de Telegram (ej: @usuario) o Chat ID';
      case 'whatsapp':
        return 'Número de WhatsApp (ej: +34612345678)';
      case 'email':
        return 'Dirección de email';
      default:
        return 'Información de contacto';
    }
  };

  const PlatformIcon = platformIcons[platform];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6">Nueva Conversación</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Selector de plataforma */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Seleccionar Plataforma
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(Object.keys(platformIcons) as Platform[]).map((p) => {
              const Icon = platformIcons[p];
              const isSelected = platform === p;
              return (
                <Button
                  key={p}
                  variant={isSelected ? "contained" : "outlined"}
                  startIcon={<Icon />}
                  onClick={() => setPlatform(p)}
                  sx={{
                    color: isSelected ? 'white' : platformColors[p],
                    bgcolor: isSelected ? platformColors[p] : 'transparent',
                    borderColor: platformColors[p],
                    '&:hover': {
                      bgcolor: isSelected ? platformColors[p] : `${platformColors[p]}20`
                    }
                  }}
                >
                  {platformLabels[p]}
                </Button>
              );
            })}
          </Box>
        </Box>

        {/* Tabs para seleccionar entre leads existentes o contacto nuevo */}
        <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 2 }}>
          <Tab label="Leads Existentes" value="leads" />
          <Tab label="Contacto Nuevo" value="nuevo" />
        </Tabs>

        {/* Tab: Leads existentes */}
        {tab === 'leads' && (
          <Box>
            <TextField
              fullWidth
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
              {loadingLeads ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : filteredLeads.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    {searchTerm ? 'No se encontraron leads' : 'No hay leads disponibles'}
                  </Typography>
                </Box>
              ) : (
                <List>
                  {filteredLeads.map((lead) => (
                    <ListItem key={lead.id} disablePadding>
                      <ListItemButton
                        selected={selectedLead?.id === lead.id}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <ListItemAvatar>
                          <Avatar>
                            {lead.nombre.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">
                                {lead.nombre}
                              </Typography>
                              <Chip 
                                label={lead.estado_lead} 
                                size="small" 
                                color="primary"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              {lead.empresa && (
                                <Typography variant="caption" display="block">
                                  {lead.empresa}
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {platform === 'email' ? lead.email : lead.telefono || 'Sin contacto'}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        )}

        {/* Tab: Contacto nuevo */}
        {tab === 'nuevo' && (
          <TextField
            fullWidth
            label={`Contacto de ${platformLabels[platform]}`}
            placeholder={getPlaceholder()}
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PlatformIcon sx={{ color: platformColors[platform] }} />
                </InputAdornment>
              )
            }}
          />
        )}

        {/* Campo de mensaje */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Mensaje inicial"
          placeholder="Escribe tu mensaje..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{ mt: 2 }}
        />

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateConversation}
          disabled={loading || (tab === 'leads' && !selectedLead) || !message.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <PlatformIcon />}
          sx={{
            bgcolor: platformColors[platform],
            '&:hover': {
              bgcolor: platformColors[platform]
            }
          }}
        >
          {loading ? 'Enviando...' : `Enviar por ${platformLabels[platform]}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}