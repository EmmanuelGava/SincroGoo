import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Chip,
  Tooltip,
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
  connected?: boolean;
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

export default function MessagingStatusIndicator({ hasWhatsappChats = false }: { hasWhatsappChats?: boolean }) {
  const { status: authStatus } = useSession();
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionStatus[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfiguraciones = useCallback(async () => {
    try {
      const [configRes, waRes] = await Promise.all([
        fetch('/api/configuracion/mensajeria?activa=true', { credentials: 'include' }),
        fetch('/api/whatsapp/verify-status', { credentials: 'include' }),
      ]);

      const configs: ConfiguracionStatus[] = [];
      if (configRes.ok) {
        const data = await configRes.json();
        for (const config of data.configuraciones || []) {
          if (!config.activa) continue;
          configs.push({
            plataforma: config.plataforma,
            activa: true,
            nombre: config.nombre_configuracion || platformLabels[config.plataforma as keyof typeof platformLabels] || config.plataforma,
          });
        }
      }

      let whatsappConnected = false;
      if (waRes.ok) {
        const wa = await waRes.json();
        whatsappConnected = Boolean(wa?.realStatus?.isReallyConnected || wa?.reportedStatus?.connected);
      }

      const hasWhatsapp = configs.some((c) => c.plataforma === 'whatsapp');
      if (whatsappConnected && !hasWhatsapp) {
        configs.unshift({
          plataforma: 'whatsapp',
          activa: true,
          nombre: 'WhatsApp Personal',
          connected: true,
        });
      } else if (whatsappConnected) {
        configs.forEach((c) => {
          if (c.plataforma === 'whatsapp') c.connected = true;
        });
      }

      const unique = new Map<string, ConfiguracionStatus>();
      for (const config of configs) {
        unique.set(config.plataforma, config);
      }
      if (hasWhatsappChats && !unique.has('whatsapp')) {
        unique.set('whatsapp', {
          plataforma: 'whatsapp',
          activa: true,
          nombre: 'WhatsApp',
        });
      }
      setConfiguraciones([...unique.values()]);
    } catch (error) {
      console.error('Error fetching configuraciones:', error);
    } finally {
      setLoading(false);
    }
  }, [hasWhatsappChats]);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus !== 'authenticated') {
      setLoading(false);
      return;
    }
    fetchConfiguraciones();
  }, [authStatus, fetchConfiguraciones]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const whatsapp = configuraciones.find((c) => c.plataforma === 'whatsapp');

  const getStatusColor = () => {
    if (loading) return 'default';
    if (whatsapp?.connected) return 'success';
    if (whatsapp) return 'warning';
    if (configuraciones.length === 0) return 'error';
    return 'success';
  };

  const getStatusText = () => {
    if (loading) return 'Cargando...';
    if (whatsapp?.connected) return 'WhatsApp';
    if (whatsapp) return 'WhatsApp';
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
          color={getStatusColor() as 'default' | 'success' | 'warning' | 'error'}
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
                    secondary={
                      !isConfigured
                        ? 'No configurado'
                        : config.connected
                          ? `${config.nombre} · conectado`
                          : config.nombre
                    }
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
