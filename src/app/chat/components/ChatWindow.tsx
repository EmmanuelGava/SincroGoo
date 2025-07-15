import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  IconButton,
  Divider
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ConversationHeader from './ConversationHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import ErrorMessage from './ErrorMessage';

interface Conversacion {
  id: string;
  remitente: string;
  servicio_origen: string;
  fecha_mensaje: string;
  lead_id?: string;
  ultimo_mensaje?: string;
  metadata?: any;
}

interface Mensaje {
  id: string;
  contenido: string;
  tipo: string;
  remitente: string;
  fecha_mensaje: string;
  canal: string;
  usuario_id?: string;
  metadata?: any;
}

interface ChatWindowProps {
  conversacion: Conversacion | null;
  onRefreshConversaciones: () => void;
}

const servicioColors: Record<string, string> = {
  telegram: '#229ED9',
  whatsapp: '#25D366',
  email: '#D44638',
  sms: '#FF9800',
};

export default function ChatWindow({ conversacion, onRefreshConversaciones }: ChatWindowProps) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getServicioColor = (servicio: string) => {
    return servicioColors[servicio] || '#90caf9';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMensajes = async () => {
    if (!conversacion) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/mensajes?conversacionId=${conversacion.id}`);
      const data = await res.json();
      setMensajes(data.mensajes || []);
    } catch (error) {
      console.error('Error fetching mensajes:', error);
      setMensajes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conversacion) {
      fetchMensajes();
    } else {
      setMensajes([]);
    }
  }, [conversacion]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  const handleSendMessage = async (contenido: string) => {
    if (!conversacion || !contenido.trim() || enviando) return;

    setEnviando(true);
    setErrorEnvio(null);

    try {
      const res = await fetch('/api/chat/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversacionId: conversacion.id,
          contenido,
          canal: conversacion.servicio_origen,
          remitente: conversacion.remitente
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Verificar si hubo error en el envío externo
        if (data.envio && !data.envio.exito) {
          setErrorEnvio(data.envio.error || 'Error enviando mensaje');
        }
        
        // Refrescar mensajes y conversaciones
        fetchMensajes();
        onRefreshConversaciones();
      } else {
        setErrorEnvio(data.error || 'Error enviando mensaje');
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setErrorEnvio(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setEnviando(false);
    }
  };

  const handleRetryMessage = () => {
    // Para implementar reintento, necesitaríamos guardar el último mensaje fallido
    // Por ahora, simplemente limpiamos el error
    setErrorEnvio(null);
  };

  if (!conversacion) {
    return (
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}>
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <InfoIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6">
            Selecciona una conversación para comenzar
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Elige una conversación del panel izquierdo para ver los mensajes
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      flexGrow: 1, 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Header de la conversación */}
      <ConversationHeader conversacion={conversacion} />
      
      <Divider />

      {/* Área de mensajes */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        p: 2,
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Mostrar error de envío si existe */}
        {errorEnvio && (
          <ErrorMessage 
            error={errorEnvio}
            onRetry={handleRetryMessage}
            retrying={enviando}
          />
        )}

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ color: 'text.secondary' }}>
              Cargando mensajes...
            </Typography>
          </Box>
        ) : mensajes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ color: 'text.secondary' }}>
              No hay mensajes en esta conversación
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {mensajes.map((mensaje) => (
              <MessageBubble 
                key={mensaje.id} 
                mensaje={mensaje}
                isOwn={!!mensaje.usuario_id} // Si tiene usuario_id, es nuestro
              />
            ))}
            
            {/* Indicador de escritura */}
            {isTyping && (
              <TypingIndicator
                remitente={conversacion.remitente}
                servicioColor={getServicioColor(conversacion.servicio_origen)}
                show={isTyping}
              />
            )}
            
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      <Divider />

      {/* Input para enviar mensajes */}
      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={loading || enviando}
        placeholder={`Responder por ${conversacion.servicio_origen}...`}
        enviando={enviando}
        onTyping={setIsTyping}
      />
    </Box>
  );
}