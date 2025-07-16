import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  Chip,
  IconButton,
  Collapse
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface MessagingQuickSetupProps {
  leadId?: string;
  compact?: boolean;
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

export default function MessagingQuickSetup({ leadId, compact = false }: MessagingQuickSetupProps) {
  const [configuraciones, setConfiguraciones] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(!compact);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfiguraciones();
  }, []);

  const fetchConfiguraciones = async () => {
    try {
      const res = await fetch('/api/configuracion/mensajeria?activa=true');
      if (res.ok) {
        const data = await res.json();
        setConfiguraciones(data.configuraciones || []);
      }
    } catch (error) {
      console.error('Error fetching configuraciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = (plataforma: string) => {
    const url = `/chat?nueva_conversacion=true&plataforma=${plataforma}${leadId ? `&lead_id=${leadId}` : ''}`;
    window.open(url, '_blank');
  };

  const configuredPlatforms = configuraciones.map(c => c.plataforma);
  const missingPlatforms = ['telegram', 'whatsapp', 'email'].filter(p => !configuredPlatforms.includes(p));

  if (compact && configuraciones.length > 0) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" fontSize="small" />
              Mensajería Configurada
            </Typography>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          
          <Collapse in={expanded}>
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {configuraciones.map((config) => {
                const Icon = platformIcons[config.plataforma as keyof typeof platformIcons];
                return (
                  <Chip
                    key={config.id}
                    icon={<Icon />}
                    label={platformLabels[config.plataforma as keyof typeof platformLabels]}
                    size="small"
                    onClick={() => handleStartConversation(config.plataforma)}
                    sx={{
                      bgcolor: platformColors[config.plataforma as keyof typeof platformColors] + '20',
                      color: platformColors[config.plataforma as keyof typeof platformColors],
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: platformColors[config.plataforma as keyof typeof platformColors] + '40'
                      }
                    }}
                  />
                );
              })}
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon color="primary" />
          Configuración de Mensajería
        </Typography>

        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Cargando configuraciones...
          </Typography>
        ) : configuraciones.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>No tienes plataformas de mensajería configuradas</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Configura al menos una plataforma para poder enviar mensajes a tus leads.
            </Typography>
          </Alert>
        ) : (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>¡Perfecto!</strong> Tienes {configuraciones.length} plataforma{configuraciones.length > 1 ? 's' : ''} configurada{configuraciones.length > 1 ? 's' : ''}.
            </Typography>
          </Alert>
        )}

        {/* Plataformas configuradas */}
        {configuraciones.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Plataformas Activas:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {configuraciones.map((config) => {
                const Icon = platformIcons[config.plataforma as keyof typeof platformIcons];
                return (
                  <Chip
                    key={config.id}
                    icon={<Icon />}
                    label={`${platformLabels[config.plataforma as keyof typeof platformLabels]} - ${config.nombre_configuracion}`}
                    size="small"
                    onClick={() => handleStartConversation(config.plataforma)}
                    sx={{
                      bgcolor: platformColors[config.plataforma as keyof typeof platformColors] + '20',
                      color: platformColors[config.plataforma as keyof typeof platformColors],
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: platformColors[config.plataforma as keyof typeof platformColors] + '40'
                      }
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {/* Plataformas faltantes */}
        {missingPlatforms.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Plataformas Disponibles:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {missingPlatforms.map((plataforma) => {
                const Icon = platformIcons[plataforma as keyof typeof platformIcons];
                return (
                  <Chip
                    key={plataforma}
                    icon={<Icon />}
                    label={platformLabels[plataforma as keyof typeof platformLabels]}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: platformColors[plataforma as keyof typeof platformColors],
                      color: platformColors[plataforma as keyof typeof platformColors],
                      opacity: 0.6
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {/* Botones de acción */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => window.open('/configuracion/mensajeria', '_blank')}
            size="small"
          >
            {configuraciones.length === 0 ? 'Configurar Mensajería' : 'Gestionar Configuración'}
          </Button>
          
          {configuraciones.length > 0 && (
            <Button
              variant="contained"
              onClick={() => window.open('/chat', '_blank')}
              size="small"
            >
              Abrir Chat Unificado
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}