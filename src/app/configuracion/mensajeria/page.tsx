'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip
} from '@mui/material';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppConnect from './components/WhatsAppConnect';
import TelegramConnect from './components/TelegramConnect';

interface ConfiguracionMensajeria {
  id: string;
  plataforma: 'telegram' | 'whatsapp' | 'email';
  activa: boolean;
  configuracion: any;
  nombre_configuracion: string;
  descripcion?: string;
  fecha_creacion: string;
}

type Plataforma = 'telegram' | 'whatsapp' | 'email';

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

export default function ConfiguracionMensajeriaPage() {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionMensajeria[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfiguracionMensajeria | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [plataforma, setPlataforma] = useState<Plataforma>('telegram');
  const [nombreConfig, setNombreConfig] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activa, setActiva] = useState(true);
  const [configData, setConfigData] = useState<any>({});

  useEffect(() => {
    fetchConfiguraciones();
  }, []);

  const fetchConfiguraciones = async () => {
    try {
      const res = await fetch('/api/configuracion/mensajeria');
      const data = await res.json();
      if (res.ok) {
        setConfiguraciones(data.configuraciones || []);
      }
    } catch (error) {
      console.error('Error fetching configuraciones:', error);
    }
  };

  const handleOpenModal = (config?: ConfiguracionMensajeria) => {
    if (config) {
      setEditingConfig(config);
      setPlataforma(config.plataforma);
      setNombreConfig(config.nombre_configuracion);
      setDescripcion(config.descripcion || '');
      setActiva(config.activa);
      setConfigData(config.configuracion);
    } else {
      setEditingConfig(null);
      setPlataforma('telegram');
      setNombreConfig('');
      setDescripcion('');
      setActiva(true);
      setConfigData({});
    }
    setModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingConfig(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!nombreConfig.trim()) {
      setError('El nombre de la configuración es requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = editingConfig 
        ? `/api/configuracion/mensajeria/${editingConfig.id}`
        : '/api/configuracion/mensajeria';
      
      const method = editingConfig ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plataforma,
          nombre_configuracion: nombreConfig,
          descripcion,
          activa,
          configuracion: configData
        })
      });

      const data = await res.json();

      if (res.ok) {
        await fetchConfiguraciones();
        handleCloseModal();
      } else {
        setError(data.error || 'Error guardando configuración');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta configuración?')) return;

    try {
      const res = await fetch(`/api/configuracion/mensajeria/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchConfiguraciones();
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
    }
  };

  const handlePlatformConnected = async (plataforma: Plataforma, config: any) => {
    try {
      const nombreConfig = `${platformLabels[plataforma]} - ${new Date().toLocaleDateString()}`;
      
      const res = await fetch('/api/configuracion/mensajeria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plataforma,
          nombre_configuracion: nombreConfig,
          descripcion: `Configuración automática de ${platformLabels[plataforma]}`,
          activa: true,
          configuracion: config
        })
      });

      if (res.ok) {
        await fetchConfiguraciones();
        // Mostrar mensaje de éxito
        alert(`¡${platformLabels[plataforma]} conectado exitosamente!`);
      } else {
        const data = await res.json();
        alert(`Error conectando ${platformLabels[plataforma]}: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving platform configuration:', error);
      alert(`Error conectando ${platformLabels[plataforma]}`);
    }
  };

  const renderConfigForm = () => {
    switch (plataforma) {
      case 'telegram':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Bot Token"
              value={configData.bot_token || ''}
              onChange={(e) => setConfigData({...configData, bot_token: e.target.value})}
              placeholder="7578036863:AAGf4raRGhbwSBk1QhCf..."
              helperText="Token del bot de Telegram obtenido de @BotFather"
            />
            <TextField
              label="Username del Bot"
              value={configData.bot_username || ''}
              onChange={(e) => setConfigData({...configData, bot_username: e.target.value})}
              placeholder="mi_bot"
              helperText="Username del bot sin @"
            />
          </Box>
        );

      case 'whatsapp':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Access Token"
              value={configData.access_token || ''}
              onChange={(e) => setConfigData({...configData, access_token: e.target.value})}
              placeholder="EAAJpUUihH6sBP..."
              helperText="Token de acceso de WhatsApp Business API"
            />
            <TextField
              label="Phone Number ID"
              value={configData.phone_number_id || ''}
              onChange={(e) => setConfigData({...configData, phone_number_id: e.target.value})}
              placeholder="15551953094"
              helperText="ID del número de teléfono en Meta Business"
            />
            <TextField
              label="Business Account ID"
              value={configData.business_account_id || ''}
              onChange={(e) => setConfigData({...configData, business_account_id: e.target.value})}
              placeholder="123456789"
              helperText="ID de la cuenta de negocio"
            />
            <TextField
              label="Webhook Verify Token"
              value={configData.webhook_verify_token || ''}
              onChange={(e) => setConfigData({...configData, webhook_verify_token: e.target.value})}
              placeholder="mi_token_verificacion"
              helperText="Token para verificar el webhook"
            />
          </Box>
        );

      case 'email':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl>
              <InputLabel>Proveedor</InputLabel>
              <Select
                value={configData.provider || 'sendgrid'}
                onChange={(e) => setConfigData({...configData, provider: e.target.value})}
              >
                <MenuItem value="sendgrid">SendGrid</MenuItem>
                <MenuItem value="smtp">SMTP</MenuItem>
              </Select>
            </FormControl>

            {configData.provider === 'sendgrid' ? (
              <>
                <TextField
                  label="API Key de SendGrid"
                  value={configData.api_key || ''}
                  onChange={(e) => setConfigData({...configData, api_key: e.target.value})}
                  placeholder="SG.xxxxx"
                />
                <TextField
                  label="Email Remitente"
                  value={configData.from_email || ''}
                  onChange={(e) => setConfigData({...configData, from_email: e.target.value})}
                  placeholder="noreply@miempresa.com"
                />
                <TextField
                  label="Nombre Remitente"
                  value={configData.from_name || ''}
                  onChange={(e) => setConfigData({...configData, from_name: e.target.value})}
                  placeholder="Mi Empresa"
                />
              </>
            ) : (
              <>
                <TextField
                  label="Servidor SMTP"
                  value={configData.smtp_host || ''}
                  onChange={(e) => setConfigData({...configData, smtp_host: e.target.value})}
                  placeholder="smtp.gmail.com"
                />
                <TextField
                  label="Puerto SMTP"
                  type="number"
                  value={configData.smtp_port || 587}
                  onChange={(e) => setConfigData({...configData, smtp_port: parseInt(e.target.value)})}
                />
                <TextField
                  label="Usuario SMTP"
                  value={configData.smtp_user || ''}
                  onChange={(e) => setConfigData({...configData, smtp_user: e.target.value})}
                  placeholder="usuario@gmail.com"
                />
                <TextField
                  label="Contraseña SMTP"
                  type="password"
                  value={configData.smtp_password || ''}
                  onChange={(e) => setConfigData({...configData, smtp_password: e.target.value})}
                />
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const PlatformIcon = platformIcons[plataforma];

  return (
    <>
      <EncabezadoSistema />
      <Box sx={{ p: 3, pt: '80px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Configuración de Mensajería
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal()}
          >
            Nueva Configuración
          </Button>
        </Box>

        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          Configura tus credenciales para enviar mensajes por diferentes plataformas.
        </Typography>

        {/* Componentes de conexión amigables */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Conectar Plataformas
          </Typography>
          
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
            <TelegramConnect 
              onConnected={(config) => handlePlatformConnected('telegram', config)}
            />
            <WhatsAppConnect 
              onConnected={(config) => handlePlatformConnected('whatsapp', config)}
            />
          </Box>
        </Box>

        {configuraciones.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Conecta al menos una plataforma para comenzar a enviar mensajes desde el chat unificado.
            </Typography>
          </Alert>
        ) : (
          <List>
            {configuraciones.map((config) => {
              const Icon = platformIcons[config.plataforma];
              return (
                <Card key={config.id} sx={{ mb: 2 }}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Icon sx={{ color: platformColors[config.plataforma] }} />
                          <Typography variant="h6">
                            {config.nombre_configuracion}
                          </Typography>
                          <Chip
                            label={config.activa ? 'Activa' : 'Inactiva'}
                            color={config.activa ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {platformLabels[config.plataforma]}
                          </Typography>
                          {config.descripcion && (
                            <Typography variant="body2" color="text.secondary">
                              {config.descripcion}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Creada: {new Date(config.fecha_creacion).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleOpenModal(config)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(config.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Card>
              );
            })}
          </List>
        )}

        {/* Modal de configuración */}
        <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl>
                <InputLabel>Plataforma</InputLabel>
                <Select
                  value={plataforma}
                  onChange={(e) => setPlataforma(e.target.value as Plataforma)}
                  disabled={!!editingConfig}
                >
                  <MenuItem value="telegram">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TelegramIcon sx={{ color: platformColors.telegram }} />
                      Telegram
                    </Box>
                  </MenuItem>
                  <MenuItem value="whatsapp">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WhatsAppIcon sx={{ color: platformColors.whatsapp }} />
                      WhatsApp
                    </Box>
                  </MenuItem>
                  <MenuItem value="email">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon sx={{ color: platformColors.email }} />
                      Email
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Nombre de la Configuración"
                value={nombreConfig}
                onChange={(e) => setNombreConfig(e.target.value)}
                placeholder="Mi WhatsApp Personal"
                required
              />

              <TextField
                label="Descripción (opcional)"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                multiline
                rows={2}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={activa}
                    onChange={(e) => setActiva(e.target.checked)}
                  />
                }
                label="Configuración activa"
              />

              {renderConfigForm()}

              {error && (
                <Alert severity="error">{error}</Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              startIcon={<PlatformIcon />}
              sx={{
                bgcolor: platformColors[plataforma],
                '&:hover': {
                  bgcolor: platformColors[plataforma]
                }
              }}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}