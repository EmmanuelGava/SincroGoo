import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Alert
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';

interface ConfiguracionStatus {
  plataforma: string;
  activa: boolean;
  nombre: string;
}

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

export default function MessagingStatusIndicator() {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionStatus[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfiguraciones();
  }, []);

  const fetchConfiguraciones = async () => {
    try {
      const res = await fetch('/api/configuracion/mensajeria?activa=true');
      if (res.ok) {
        const data = await res.json();
        const status = data.configuraciones?.map((config: any) => ({
          plataforma: config.plataforma,
          activa: config.activa,
          nombre: config.nombre_configuracion
        })) || [];
        setConfiguraciones(status);
      }
    } catch (error) {
      console.error('Error fetching configuraciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const getStatusColor = () => {
    if (loading) return 'default';
    if (configuraciones.length === 0) return 'error';
    if (configuraciones.length < 2) return 'warning';
    return 'success';
  };

  const getStatusText = () => {
    if (loading) return 'Cargando...';
    if (configuraciones.length === 0) return 'Sin configurar';
    if (configuraciones.length === 1) return '1 plataforma';
    return `${configuraciones.length} plataformas`;
  };

  return (
    <>
      <Tooltip title="Estado de configuraciones de mensajería">
        <Chip
          icon={<InfoIcon />}
          label={getStatusText()}
          color={getStatusColor() as any}
          size="small"
          onClick={handleClick}
          sx={{
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.8
            }
          }}
        />
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Box sx={{ p: 2, minWidth: 280 }}>
          <Typography variant="h6" gutterBottom>
            Estado de Mensajería
          </Typography>

          {configuraciones.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                No tienes plataformas configuradas
              </Typography>
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Plataformas configuradas y activas:
            </Typography>
          )}

          <List dense>
            {['telegram', 'whatsapp', 'email'].map((plataforma) => {
              const config = configuraciones.find(c => c.plataforma === plataforma);
              const Icon = platformIcons[plataforma as keyof typeof platformIcons];
              const isConfigured = !!config;

              return (
                <ListItem key={plataforma}>
                  <ListItemIcon>
                    <Icon sx={{ 
                      color: isConfigured 
                        ? platformColors[plataforma as keyof typeof platformColors]
                        : 'text.disabled'
                    }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={platformLabels[plataforma as keyof typeof platformLabels]}
                    secondary={isConfigured ? config.nombre : 'No configurado'}
                  />
                  {isConfigured ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <ErrorIcon color="disabled" fontSize="small" />
                  )}
                </ListItem>
              );
            })}
          </List>

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => {
                window.open('/configuracion/mensajeria', '_blank');
                handleClose();
              }}
              fullWidth
            >
              Configurar
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}