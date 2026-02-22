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
      // Usar la nueva arquitectura unificada
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: conversacion.servicio_origen, // whatsapp, telegram, email
          to: conversacion.remitente,
          message: contenido,
          messageType: 'text',
          metadata: {
            conversacion_id: conversacion.id,
            original_canal: conversacion.servicio_origen
          }
        })
      });

      const data = await res.json();
      console.log('📤 Respuesta del servidor:', { status: res.status, data });

      if (res.ok && data.success) {
        // Mensaje enviado exitosamente
        console.log('✅ Mensaje enviado via nueva arquitectura:', data);
        
        // Refrescar mensajes y conversaciones
        fetchMensajes();
        onRefreshConversaciones();
      } else {
        // Manejar errores específicos
        const errorMessage = data.error || 'Error enviando mensaje';
        console.log('❌ Error en envío:', errorMessage);
        setErrorEnvio(errorMessage);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setErrorEnvio(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setEnviando(false);
    }
  };

  const handleSendFile = async (url: string, fileName: string, fileType: string) => {
    if (!conversacion || enviando) return;

    console.log('🔧 Enviando archivo:', { url, fileName, fileType, conversacion: conversacion.id });

    setEnviando(true);
    setErrorEnvio(null);

    try {
      // Usar la nueva arquitectura unificada para archivos
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: conversacion.servicio_origen,
          to: conversacion.remitente,
          message: `📎 ${fileName}`,
          messageType: 'file',
          filePath: url,
          metadata: {
            conversacion_id: conversacion.id,
            original_canal: conversacion.servicio_origen,
            file_name: fileName,
            file_type: fileType,
            file_url: url
          }
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log('✅ Archivo enviado via nueva arquitectura:', data);
        
        // Refrescar mensajes y conversaciones
        fetchMensajes();
        onRefreshConversaciones();
      } else {
        setErrorEnvio(data.error || 'Error enviando archivo');
      }
    } catch (error) {
      console.error('Error enviando archivo:', error);
      setErrorEnvio(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setEnviando(false);
    }
  };

  const handleSendAudio = async (audioBlob: Blob, duration: number) => {
    if (!conversacion || enviando) return;

    setEnviando(true);
    setErrorEnvio(null);

    try {
      // Primero subir el audio a Supabase Storage
      const timestamp = Date.now();
      const fileName = `audio_${timestamp}.webm`;
      
      // Crear FormData para la subida
      const formData = new FormData();
      formData.append('file', audioBlob, fileName);
      
      // Subir usando el FileUploadService (necesitamos adaptarlo para Blob)
      const { FileUploadService } = await import('@/app/servicios/storage/FileUploadService');
      
      // Convertir Blob a File
      const audioFile = new File([audioBlob], fileName, { type: 'audio/webm' });
      const uploadResult = await FileUploadService.uploadFile(audioFile, conversacion.id);
      
      if (!uploadResult.success || !uploadResult.url) {
        setErrorEnvio('Error subiendo audio');
        return;
      }

      // Enviar mensaje con el audio usando la nueva arquitectura
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: conversacion.servicio_origen,
          to: conversacion.remitente,
          message: `🎤 Audio (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
          messageType: 'audio',
          filePath: uploadResult.url,
          metadata: {
            conversacion_id: conversacion.id,
            original_canal: conversacion.servicio_origen,
            file_name: fileName,
            file_type: 'audio',
            file_url: uploadResult.url,
            duration: duration
          }
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log('✅ Audio enviado via nueva arquitectura:', data);
        
        // Refrescar mensajes y conversaciones
        fetchMensajes();
        onRefreshConversaciones();
      } else {
        setErrorEnvio(data.error || 'Error enviando audio');
      }
    } catch (error) {
      console.error('Error enviando audio:', error);
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
        onSendFile={handleSendFile}
        onSendAudio={handleSendAudio}
        conversationId={conversacion.id}
        disabled={loading || enviando}
        placeholder={`Responder por ${conversacion.servicio_origen}...`}
        enviando={enviando}
        onTyping={setIsTyping}
      />
    </Box>
  );
}