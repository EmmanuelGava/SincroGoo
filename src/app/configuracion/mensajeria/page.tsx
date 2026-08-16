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
import WhatsAppBusinessConnect from './components/WhatsAppBusinessConnect';
import TelegramConnect from './components/TelegramConnect';

interface ConfiguracionMensajeria {
  id: string;
  plataforma: 'telegram' | 'whatsapp-lite' | 'whatsapp-business' | 'whatsapp' | 'email';
  activa: boolean;
  configuracion: any;
  nombre_configuracion: string;
  descripcion?: string;
  fecha_creacion: string;
}

type Plataforma = 'telegram' | 'whatsapp-lite' | 'whatsapp-business' | 'whatsapp' | 'email';

const platformIcons = {
  telegram: TelegramIcon,
  'whatsapp-lite': WhatsAppIcon,
  'whatsapp-business': WhatsAppIcon,
  'whatsapp': WhatsAppIcon,
  email: EmailIcon
};

const platformColors = {
  telegram: '#229ED9',
  'whatsapp-lite': '#25D366',
  'whatsapp-business': '#128C7E',
  'whatsapp': '#25D366',
  email: '#D44638'
};

const platformLabels = {
  telegram: 'Telegram',
  'whatsapp-lite': 'WhatsApp Lite (Personal)',
  'whatsapp-business': 'WhatsApp Business API',
  'whatsapp': 'WhatsApp',
  email: 'Email'
};

// Función para mapear plataformas de BD a frontend
const mapPlatform = (platform: string, configuracion?: any): Plataforma => {
  if (platform === 'whatsapp') {
    // Determinar el tipo específico basado en la configuración
    const tipoConexion = configuracion?.tipo_conexion || configuracion?.plataforma_original;
    if (tipoConexion === 'business' || tipoConexion === 'whatsapp-business') {
      return 'whatsapp-business';
    }
    return 'whatsapp-lite'; // Por defecto, mapear a lite
  }
  return platform as Plataforma;
};

// Función para obtener el icono de una plataforma
const getPlatformIcon = (platform: string, configuracion?: any) => {
  const mappedPlatform = mapPlatform(platform, configuracion);
  return platformIcons[mappedPlatform] || WhatsAppIcon; // Fallback a WhatsAppIcon
};

// Función para obtener el color de una plataforma
const getPlatformColor = (platform: string, configuracion?: any) => {
  const mappedPlatform = mapPlatform(platform, configuracion);
  return platformColors[mappedPlatform] || '#25D366'; // Fallback a color WhatsApp
};

// Función para obtener el label de una plataforma
const getPlatformLabel = (platform: string, configuracion?: any) => {
  const mappedPlatform = mapPlatform(platform, configuracion);
  return platformLabels[mappedPlatform] || 'WhatsApp';
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
      setPlataforma(mapPlatform(config.plataforma, config.configuracion));
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

  // Debounce para evitar llamadas múltiples
  const [isProcessingConnection, setIsProcessingConnection] = useState(false);

  const handlePlatformDisconnected = async (plataforma: Plataforma) => {
    const toDelete = configuraciones.filter((c) => {
      if ((plataforma === 'whatsapp-lite' || plataforma === 'whatsapp-business') && c.plataforma === 'whatsapp') {
        return true;
      }
      return c.plataforma === plataforma;
    });
    for (const config of toDelete) {
      await fetch(`/api/configuracion/mensajeria/${config.id}`, { method: 'DELETE' });
    }
    await fetchConfiguraciones();
  };

  const handlePlatformConnected = async (plataforma: Plataforma, config: any) => {
    console.log('🔄 handlePlatformConnected llamado:', { plataforma, config });

    if (config?.status === 'disconnected' || config?.estado_conexion === 'disconnected') {
      await handlePlatformDisconnected(plataforma);
      return;
    }
    
    // Evitar procesamiento múltiple con debounce más agresivo
    if (isProcessingConnection) {
      console.log('⚠️ Ya se está procesando una conexión, saltando...');
      return;
    }
    
    setIsProcessingConnection(true);
    
    try {
      // Buscar si ya existe una configuración activa para esta plataforma
      // Considerar tanto la plataforma exacta como el mapeo (whatsapp-lite -> whatsapp)
      const configuracionesWhatsApp = configuraciones.filter(c => {
        if (!c.activa) return false;
        
        // Para WhatsApp, buscar todas las configuraciones de whatsapp
        if ((plataforma === 'whatsapp-lite' || plataforma === 'whatsapp-business') && c.plataforma === 'whatsapp') {
          return true;
        }
        
        // Comparación directa para otras plataformas
        return c.plataforma === plataforma;
      });

      console.log('🔍 Configuraciones WhatsApp encontradas:', configuracionesWhatsApp.length);
      configuracionesWhatsApp.forEach(c => {
        console.log(`   - ${c.nombre_configuracion} (${c.id})`);
        console.log(`     Tipo: ${c.configuracion?.tipo_conexion || c.configuracion?.plataforma_original}`);
        console.log(`     Teléfono: ${c.configuracion?.phone_number || 'Sin número'}`);
        console.log(`     Auto: ${c.configuracion?.auto_created || false}`);
      });

      // Buscar la configuración más apropiada para actualizar
      let configuracionExistente = null;
      
      // PRIORIDAD 1: Buscar por número de teléfono exacto
      const phoneNumber = config.phone_number;
      if (phoneNumber) {
        const existingWithSamePhone = configuracionesWhatsApp.find(c => 
          c.configuracion?.phone_number === phoneNumber
        );
        
        if (existingWithSamePhone) {
          console.log('📱 Configuración encontrada por número de teléfono exacto');
          configuracionExistente = existingWithSamePhone;
        }
      }
      
      // PRIORIDAD 2: Si no hay por número, buscar por tipo de conexión
      if (!configuracionExistente && configuracionesWhatsApp.length > 0) {
        configuracionExistente = configuracionesWhatsApp.find(c => {
          const tipoConexion = c.configuracion?.tipo_conexion || c.configuracion?.plataforma_original;
          return (plataforma === 'whatsapp-lite' && (tipoConexion === 'lite' || tipoConexion === 'whatsapp-lite')) ||
                 (plataforma === 'whatsapp-business' && (tipoConexion === 'business' || tipoConexion === 'whatsapp-business'));
        });
        
        if (configuracionExistente) {
          console.log('📱 Configuración encontrada por tipo de conexión');
        }
      }

      // PRIORIDAD 3: Si no hay por tipo, tomar la que tenga phone_number
      if (!configuracionExistente && configuracionesWhatsApp.length > 0) {
        configuracionExistente = configuracionesWhatsApp.find(c => c.configuracion?.phone_number);
        if (configuracionExistente) {
          console.log('📱 Configuración encontrada por tener phone_number');
        }
      }

      // PRIORIDAD 4: Si aún no hay, tomar la más reciente
      if (!configuracionExistente && configuracionesWhatsApp.length > 0) {
        configuracionExistente = configuracionesWhatsApp.sort((a, b) => 
          new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
        )[0];
        console.log('📱 Configuración encontrada por ser la más reciente');
      }
      
      if (configuracionesWhatsApp.length > 0) {
        // Si hay múltiples, priorizar:
        // 1. La que tenga el mismo tipo de conexión
        // 2. La que tenga phone_number
        // 3. La más reciente
        configuracionExistente = configuracionesWhatsApp.find(c => {
          const tipoConexion = c.configuracion?.tipo_conexion || c.configuracion?.plataforma_original;
          return (plataforma === 'whatsapp-lite' && (tipoConexion === 'lite' || tipoConexion === 'whatsapp-lite')) ||
                 (plataforma === 'whatsapp-business' && (tipoConexion === 'business' || tipoConexion === 'whatsapp-business'));
        });

        // Si no encontramos por tipo, tomar la que tenga phone_number
        if (!configuracionExistente) {
          configuracionExistente = configuracionesWhatsApp.find(c => c.configuracion?.phone_number);
        }

        // Si aún no hay, tomar la más reciente
        if (!configuracionExistente) {
          configuracionExistente = configuracionesWhatsApp.sort((a, b) => 
            new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
          )[0];
        }
      }
      
      console.log('🔍 Configuración existente encontrada:', configuracionExistente);

      if (configuracionExistente) {
        // Actualizar la configuración existente
        console.log('📝 Actualizando configuración existente...');
        const res = await fetch(`/api/configuracion/mensajeria/${configuracionExistente.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configuracion: {
              ...configuracionExistente.configuracion,
              ...config,
              ultima_conexion: new Date().toISOString(),
              estado_conexion: 'connected'
            },
            activa: true,
            fecha_actualizacion: new Date().toISOString()
          })
        });

        if (res.ok) {
          console.log('✅ Configuración actualizada exitosamente');
          
          // Limpiar duplicados si hay múltiples configuraciones WhatsApp
          if (configuracionesWhatsApp.length > 1) {
            console.log('🧹 Limpiando configuraciones duplicadas...');
            const configsToDelete = configuracionesWhatsApp.filter(c => c.id !== configuracionExistente!.id);
            
            for (const configToDelete of configsToDelete) {
              console.log(`🗑️ Eliminando duplicado: ${configToDelete.nombre_configuracion}`);
              try {
                await fetch(`/api/configuracion/mensajeria/${configToDelete.id}`, {
                  method: 'DELETE'
                });
                console.log(`✅ Duplicado eliminado: ${configToDelete.id}`);
              } catch (error) {
                console.error(`❌ Error eliminando duplicado ${configToDelete.id}:`, error);
              }
            }
          }
          
          await fetchConfiguraciones();
          alert(`¡${platformLabels[plataforma]} reconectado exitosamente!`);
        } else {
          const data = await res.json();
          console.error('❌ Error actualizando configuración:', data);
          alert(`Error reconectando ${platformLabels[plataforma]}: ${data.error}`);
        }
      } else {
        // Verificar si hay configuraciones inactivas que podamos reactivar
        const configuracionInactiva = configuraciones.find(c => {
          if (c.activa) return false;
          
          if ((plataforma === 'whatsapp-lite' || plataforma === 'whatsapp-business') && c.plataforma === 'whatsapp') {
            return true;
          }
          
          return c.plataforma === plataforma;
        });

        if (configuracionInactiva) {
          console.log('🔄 Reactivando configuración existente...');
          const res = await fetch(`/api/configuracion/mensajeria/${configuracionInactiva.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              configuracion: {
                ...configuracionInactiva.configuracion,
                ...config,
                ultima_conexion: new Date().toISOString(),
                estado_conexion: 'connected',
                reactivated: true
              },
              activa: true,
              fecha_actualizacion: new Date().toISOString()
            })
          });

          if (res.ok) {
            console.log('✅ Configuración reactivada exitosamente');
            await fetchConfiguraciones();
            alert(`¡${platformLabels[plataforma]} reconectado exitosamente!`);
          } else {
            const data = await res.json();
            console.error('❌ Error reactivando configuración:', data);
            alert(`Error reconectando ${platformLabels[plataforma]}: ${data.error}`);
          }
        } else {
          // Verificar si hay configuraciones inactivas que podamos reactivar
          const configuracionInactiva = configuraciones.find(c => {
            if (c.activa) return false;
            
            if ((plataforma === 'whatsapp-lite' || plataforma === 'whatsapp-business') && c.plataforma === 'whatsapp') {
              return true;
            }
            
            return c.plataforma === plataforma;
          });

          if (configuracionInactiva) {
            console.log('🔄 Reactivando configuración existente...');
            const res = await fetch(`/api/configuracion/mensajeria/${configuracionInactiva.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                configuracion: {
                  ...configuracionInactiva.configuracion,
                  ...config,
                  ultima_conexion: new Date().toISOString(),
                  estado_conexion: 'connected',
                  reactivated: true
                },
                activa: true,
                fecha_actualizacion: new Date().toISOString()
              })
            });

            if (res.ok) {
              console.log('✅ Configuración reactivada exitosamente');
              await fetchConfiguraciones();
              alert(`¡${platformLabels[plataforma]} reconectado exitosamente!`);
            } else {
              const data = await res.json();
              console.error('❌ Error reactivando configuración:', data);
              alert(`Error reconectando ${platformLabels[plataforma]}: ${data.error}`);
            }
          } else {
            // Crear nueva configuración solo si no existe ninguna
            console.log('🆕 Creando nueva configuración...');
            const nombreConfig = `${platformLabels[plataforma]} - ${new Date().toLocaleDateString()}`;
            
            const nuevaConfiguracion = {
              plataforma,
              nombre_configuracion: nombreConfig,
              descripcion: `Configuración automática de ${platformLabels[plataforma]}`,
              activa: true,
              configuracion: {
                ...config,
                fecha_creacion: new Date().toISOString(),
                estado_conexion: 'connected',
                auto_created: true // Marcar como creada automáticamente
              }
            };

            console.log('📤 Enviando nueva configuración:', nuevaConfiguracion);
            
            const res = await fetch('/api/configuracion/mensajeria', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(nuevaConfiguracion)
            });

            if (res.ok) {
              const data = await res.json();
              console.log('✅ Nueva configuración creada exitosamente:', data);
              await fetchConfiguraciones();
              alert(`¡${platformLabels[plataforma]} conectado exitosamente!`);
            } else {
              const data = await res.json();
              console.error('❌ Error creando configuración:', data);
              alert(`Error conectando ${platformLabels[plataforma]}: ${data.error || 'Error desconocido'}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error en handlePlatformConnected:', error);
      alert(`Error conectando ${platformLabels[plataforma]}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      // Liberar el lock después de un delay más largo para evitar múltiples llamadas
      setTimeout(() => {
        setIsProcessingConnection(false);
        console.log('🔓 Lock de procesamiento liberado');
      }, 3000); // 3 segundos para evitar duplicaciones
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

      case 'whatsapp-business':
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

  const PlatformIcon = getPlatformIcon(plataforma);

  return (
    <>
      <EncabezadoSistema />
      <Box sx={{ p: 3, pt: '80px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Configuración de Mensajería
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  const res = await fetch('/api/configuracion/mensajeria/clean-duplicates', {
                    method: 'POST'
                  });
                  const data = await res.json();
                  if (res.ok) {
                    alert(`Limpieza completada: ${data.eliminadas} eliminadas, ${data.desactivadas} desactivadas`);
                    await fetchConfiguraciones();
                  } else {
                    alert('Error en la limpieza: ' + data.error);
                  }
                } catch (error) {
                  alert('Error ejecutando limpieza');
                }
              }}
            >
              Limpiar Duplicados
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenModal()}
            >
              Nueva Configuración
            </Button>
          </Box>
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
              onConnected={(config) => handlePlatformConnected('whatsapp-lite', config)}
            />
            <WhatsAppBusinessConnect
              onConnected={(config) => handlePlatformConnected('whatsapp-business', config)}
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
              const Icon = getPlatformIcon(config.plataforma, config.configuracion);
              return (
                <Card key={config.id} sx={{ mb: 2 }}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Icon sx={{ color: getPlatformColor(config.plataforma, config.configuracion) }} />
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
                          <Box component="span" sx={{ display: 'block' }}>
                            {getPlatformLabel(config.plataforma, config.configuracion)}
                          </Box>
                          {config.descripcion && (
                            <Box component="span" sx={{ display: 'block' }}>
                              {config.descripcion}
                            </Box>
                          )}
                          <Box component="span" sx={{ display: 'block', fontSize: '0.75rem' }}>
                            Creada: {new Date(config.fecha_creacion).toLocaleDateString()}
                          </Box>
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
                  <MenuItem value="whatsapp-lite">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WhatsAppIcon sx={{ color: platformColors['whatsapp-lite'] }} />
                      WhatsApp Lite (Personal)
                    </Box>
                  </MenuItem>
                  <MenuItem value="whatsapp-business">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WhatsAppIcon sx={{ color: platformColors['whatsapp-business'] }} />
                      WhatsApp Business API
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
                bgcolor: getPlatformColor(plataforma),
                '&:hover': {
                  bgcolor: getPlatformColor(plataforma)
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