import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Badge,
  InputBase,
  CircularProgress,
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import NewConversationModal from './NewConversationModal';
import MessagingStatusIndicator from './MessagingStatusIndicator';
import { conversationDisplayName, conversationRealPhone } from '@/lib/chat/conversationIdentity';
import {
  ensureChatNotificationPermission,
  isChatSoundEnabled,
  playChatIncomingSound,
  setChatSoundEnabled,
  unlockChatAudio,
} from '@/lib/chat/chatNotifications';
import { WA } from '@/app/chat/chatTheme';

interface Conversacion {
  id: string;
  remitente: string;
  display_name?: string;
  display_phone?: string | null;
  servicio_origen: string;
  fecha_mensaje: string;
  lead_id?: string;
  ultimo_mensaje?: string;
  metadata?: any;
  unread_count?: number;
  match_kind?: string;
}

interface ChatSidebarProps {
  conversaciones: Conversacion[];
  conversacionActiva: Conversacion | null;
  onSelectConversacion: (conversacion: Conversacion) => void;
  onRefreshConversaciones: () => void;
  loading: boolean;
}

const servicioIcons: Record<string, React.ElementType> = {
  telegram: TelegramIcon,
  whatsapp: WhatsAppIcon,
  email: EmailIcon,
  sms: SmsIcon,
};

const servicioColors: Record<string, string> = {
  telegram: '#229ED9',
  whatsapp: '#25D366',
  email: '#D44638',
  sms: '#FF9800',
};

export default function ChatSidebar({ 
  conversaciones, 
  conversacionActiva, 
  onSelectConversacion, 
  onRefreshConversaciones,
  loading 
}: ChatSidebarProps) {
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Conversacion[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  useEffect(() => {
    setSoundOn(isChatSoundEnabled());
  }, []);

  useEffect(() => {
    const q = busqueda.trim();
    if (!q) {
      setResultadosBusqueda(null);
      setBuscando(false);
      setErrorBusqueda(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBuscando(true);
      setErrorBusqueda(null);
      try {
        const res = await fetch(`/api/chat/conversaciones?q=${encodeURIComponent(q)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo buscar en el historial');
        }
        setResultadosBusqueda(Array.isArray(data.conversaciones) ? data.conversaciones : []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Error buscando conversaciones:', err);
        setErrorBusqueda(err instanceof Error ? err.message : 'Error al buscar');
        setResultadosBusqueda([]);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [busqueda]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setChatSoundEnabled(next);
    unlockChatAudio();
    if (next) {
      playChatIncomingSound();
      void ensureChatNotificationPermission();
    }
  };
  
  const getServiceIcon = (servicio: string) => {
    const IconComponent = servicioIcons[servicio] || SmsIcon;
    return <IconComponent sx={{ color: servicioColors[servicio] || '#90caf9', fontSize: 12 }} />;
  };

  const formatTime = (fecha: string) => {
    const date = new Date(fecha);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const q = busqueda.trim();
  const visibles = q ? (resultadosBusqueda ?? []) : conversaciones;

  if (loading) {
    return (
      <Box sx={{ 
        width: 350, 
        borderRight: '1px solid #2a3942',
        borderColor: 'divider', 
        bgcolor: WA.panel,
        p: 2
      }}>
        <Typography sx={{ color: WA.muted }}>
          Cargando conversaciones...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: 350, 
      borderRight: '1px solid #2a3942',
      bgcolor: WA.panel,
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 1.5, 
        px: 2,
        bgcolor: WA.header
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ 
            color: WA.text, 
            fontWeight: 500,
            fontSize: '1.15rem',
          }}>
            Chat
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={soundOn ? 'Silenciar avisos' : 'Activar sonido de avisos'}>
              <IconButton size="small" onClick={toggleSound} aria-label="Sonido de notificaciones" sx={{ color: WA.icon }}>
                {soundOn ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Nueva conversación">
              <IconButton
                size="small"
                onClick={() => setNewConversationOpen(true)}
                sx={{ color: WA.icon }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ 
            color: WA.muted
          }}>
            {conversaciones.length} conversaciones activas
          </Typography>
          <MessagingStatusIndicator
            hasWhatsappChats={conversaciones.some((c) => String(c.servicio_origen || '').startsWith('whatsapp'))}
          />
        </Box>
      </Box>

      <Box sx={{ px: 1.5, py: 1, bgcolor: WA.panel }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: WA.inputField,
          borderRadius: 2,
          px: 1.5,
          py: 0.6,
        }}>
          <SearchIcon sx={{ color: WA.icon, fontSize: 20 }} />
          <InputBase
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar chats o mensajes"
            fullWidth
            inputProps={{ 'aria-label': 'Buscar en el historial de conversaciones' }}
            sx={{ color: WA.text, fontSize: '0.9rem', '& input::placeholder': { color: WA.muted, opacity: 1 } }}
          />
          {buscando ? <CircularProgress size={16} sx={{ color: WA.icon }} /> : null}
        </Box>
      </Box>

      {/* Lista de conversaciones */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {conversaciones.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: WA.muted, mb: 2 }}>
              Todavía no hay conversaciones
            </Typography>
            <Typography variant="body2" sx={{ color: WA.muted, mb: 2 }}>
              Conectá tu WhatsApp personal para que los mensajes de leads aparezcan acá.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => window.location.assign('/onboarding')}
              sx={{ fontSize: '0.8rem' }}
            >
              Conectar WhatsApp
            </Button>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {q && buscando && resultadosBusqueda === null ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ color: WA.muted }}>Buscando…</Typography>
              </Box>
            ) : q && errorBusqueda ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ color: WA.muted }}>{errorBusqueda}</Typography>
              </Box>
            ) : visibles.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ color: WA.muted }}>
                  {q ? `No hay resultados para “${q}”` : 'No hay chats'}
                </Typography>
              </Box>
            ) : visibles.map((conversacion) => {
              const displayName = conversationDisplayName(conversacion);
              const displayPhone = conversacion.display_phone || conversationRealPhone(conversacion);
              const isActive = conversacionActiva?.id === conversacion.id;
              const unread = !isActive && (conversacion.unread_count || 0) > 0;
              return (
              <ListItem key={conversacion.id} disablePadding>
                <ListItemButton
                  selected={isActive}
                  onClick={() => onSelectConversacion(conversacion)}
                  sx={{
                    py: 1.1,
                    px: 1.5,
                    bgcolor: isActive ? WA.selected : 'transparent',
                    '&:hover': {
                      bgcolor: isActive ? WA.selected : '#202c33',
                    },
                    '&.Mui-selected': {
                      bgcolor: WA.selected,
                      '&:hover': {
                        bgcolor: WA.selected,
                      }
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Box sx={{ position: 'relative', mr: 1 }}>
                      <Badge
                        badgeContent={unread ? conversacion.unread_count : 0}
                        sx={{ '& .MuiBadge-badge': { bgcolor: '#00a884', color: '#111b21' } }}
                        overlap="circular"
                      >
                        <Avatar sx={{ 
                          bgcolor: servicioColors[conversacion.servicio_origen] || '#90caf9',
                          width: 40,
                          height: 40
                        }}>
                          {displayName.charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                      <Box sx={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        bgcolor: WA.panel,
                        borderRadius: '50%',
                        width: 18,
                        height: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                      }}>
                        {getServiceIcon(conversacion.servicio_origen)}
                      </Box>
                    </Box>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" sx={{ 
                          display: 'block',
                          color: WA.text,
                          fontWeight: unread ? 800 : 600,
                          flex: 1,
                          overflow: 'hidden',
                          minWidth: 0,
                          fontSize: '0.875rem'
                        }}>
                          <Box component="span" sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {displayName}
                          </Box>
                          {displayPhone && displayPhone !== displayName ? (
                            <Box component="span" sx={{
                              display: 'block',
                              fontWeight: 400,
                              fontSize: '0.72rem',
                              opacity: isActive ? 0.8 : 0.7,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {displayPhone}
                            </Box>
                          ) : null}
                        </Box>
                        {conversacion.lead_id && (
                          <Chip 
                            label="Lead" 
                            size="small" 
                            color="success"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Box component="span" sx={{ 
                          color: unread ? WA.text : WA.muted,
                          fontWeight: unread ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '180px',
                          fontSize: '0.875rem'
                        }}>
                          {conversacion.ultimo_mensaje || 'Sin mensajes'}
                        </Box>
                        <Box component="span" sx={{ 
                          color: unread ? '#00a884' : WA.muted,
                          fontSize: '0.7rem',
                          fontWeight: unread ? 700 : 400,
                        }}>
                          {formatTime(conversacion.fecha_mensaje)}
                        </Box>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {/* Modal para nueva conversación */}
      <NewConversationModal
        open={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
        onConversationCreated={(conversacion) => {
          setNewConversationOpen(false);
          onRefreshConversaciones(); // Refrescar lista de conversaciones
          onSelectConversacion(conversacion); // Seleccionar la nueva conversación
        }}
      />
    </Box>
  );
}