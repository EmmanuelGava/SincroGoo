'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ConversationHeader from './ConversationHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ErrorMessage from './ErrorMessage';
import { validateOutgoingMedia } from '@/lib/chat/mediaLimits';
import { conversationGreetingName, conversationRealPhone } from '@/lib/chat/conversationIdentity';
import { buildQuotedMeta, type ReplyToMessage } from '@/lib/chat/quotedMessage';
import { useWaChatBgSx, useWaTheme } from '@/app/chat/chatTheme';

interface Conversacion {
  id: string;
  remitente: string;
  display_name?: string;
  display_phone?: string | null;
  servicio_origen: string;
  fecha_mensaje: string;
  lead_id?: string;
  contacto_id?: string;
  ultimo_mensaje?: string;
  metadata?: any;
  archived_at?: string | null;
}

interface Mensaje {
  id: string;
  contenido: string;
  tipo: string;
  remitente: string;
  fecha_mensaje: string;
  canal: string;
  usuario_id?: string;
  wa_message_id?: string | null;
  metadata?: any;
  estado_envio?: string | null;
}

interface ChatWindowProps {
  conversacion: Conversacion | null;
  mensajes?: Mensaje[];
  onRefreshConversaciones: () => void;
  onRefreshMensajes?: () => void;
  onDeleteConversacion?: (conversacionId: string) => Promise<boolean>;
  onArchiveConversacion?: (conversacionId: string, archived: boolean) => Promise<boolean>;
  archivedView?: boolean;
  drawerOpen?: boolean;
  onToggleDrawer?: () => void;
}

export default function ChatWindow({
  conversacion,
  mensajes: mensajesLive,
  onRefreshConversaciones,
  onRefreshMensajes,
  onDeleteConversacion,
  onArchiveConversacion,
  archivedView = false,
  drawerOpen,
  onToggleDrawer,
}: ChatWindowProps) {
  const WA = useWaTheme();
  const chatBg = useWaChatBgSx();
  const [mensajesLocal, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Mensaje[]>([]);
  const [manageReplies, setManageReplies] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyToMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMensajes = async () => {
    if (!conversacion) return;
    if (onRefreshMensajes) {
      onRefreshMensajes();
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/mensajes?conversacionId=${conversacion.id}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      setMensajes(data.mensajes || []);
    } catch (error) {
      console.error('Error fetching mensajes:', error);
      setMensajes([]);
    } finally {
      setLoading(false);
    }
  };

  const mensajesBase = mensajesLive ?? mensajesLocal;
  const mensajes = [
    ...mensajesBase,
    ...optimistic.filter(
      (pending) => !mensajesBase.some((m) => m.contenido === pending.contenido && m.usuario_id)
    ),
  ];

  useEffect(() => {
    setOptimistic([]);
    setReplyTo(null);
  }, [conversacion?.id]);

  useEffect(() => {
    if (mensajesLive) return;
    if (conversacion) {
      fetchMensajes();
    } else {
      setMensajes([]);
    }
  }, [conversacion?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  const handleSendMessage = async (contenido: string, options?: { scheduledFor?: string }) => {
    if (!conversacion || !contenido.trim()) return;

    const texto = contenido.trim();
    const isScheduled = Boolean(options?.scheduledFor);
    const tempId = `temp-${Date.now()}`;
    if (!isScheduled) {
      const pending: Mensaje = {
        id: tempId,
        contenido: texto,
        tipo: 'text',
        remitente: 'yo',
        fecha_mensaje: new Date().toISOString(),
        canal: conversacion.servicio_origen,
        usuario_id: 'local',
        estado_envio: 'enviando',
        metadata: { estado_envio: 'enviando', direction: 'outgoing' },
      };
      setOptimistic((prev) => [...prev, pending]);
    }
    setErrorEnvio(null);

    const remoteJid = conversacion.metadata?.remote_jid
      || conversacion.metadata?.phone_number
      || conversacion.remitente;
    const quotedMessage = replyTo
      ? buildQuotedMeta(replyTo, String(remoteJid || ''))
      : null;

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: conversacion.servicio_origen === 'whatsapp-lite' ? 'whatsapp' : conversacion.servicio_origen,
          to: remoteJid,
          message: texto,
          messageType: 'text',
          scheduled_for: options?.scheduledFor || undefined,
          metadata: {
            conversacion_id: conversacion.id,
            original_canal: conversacion.servicio_origen,
            ...(quotedMessage ? { quoted_message: quotedMessage } : {}),
          }
        })
      });

      const data = await res.json();
      console.log('📤 Respuesta del servidor:', { status: res.status, data });

      if (res.ok && data.success) {
        if (!isScheduled) {
          fetchMensajes();
        }
        onRefreshConversaciones();
        setReplyTo(null);
        if (!isScheduled) {
          setTimeout(() => {
            setOptimistic((prev) => prev.filter((m) => m.id !== tempId));
          }, 1500);
        }
      } else {
        const errorMessage = data.error || 'Error enviando mensaje';
        if (!isScheduled) {
          setOptimistic((prev) => prev.filter((m) => m.id !== tempId));
        }
        setErrorEnvio(errorMessage);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      if (!isScheduled) {
        setOptimistic((prev) => prev.filter((m) => m.id !== tempId));
      }
      setErrorEnvio(error instanceof Error ? error.message : 'Error de conexión');
    }
  };

  const handleSendFile = async (
    url: string,
    fileName: string,
    fileType: string,
    mimeType?: string,
    caption?: string,
  ) => {
    if (!conversacion || enviando) return;

    console.log('🔧 Enviando archivo:', { url, fileName, fileType, conversacion: conversacion.id });

    setEnviando(true);
    setErrorEnvio(null);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: conversacion.servicio_origen === 'whatsapp-lite' ? 'whatsapp' : conversacion.servicio_origen,
          to: conversacion.metadata?.remote_jid
            || conversacion.metadata?.phone_number
            || conversacion.remitente,
          message: caption?.trim() || fileName,
          messageType: fileType === 'image'
            ? 'image'
            : fileType === 'audio'
              ? 'audio'
              : fileType === 'video'
                ? 'video'
                : 'file',
          filePath: url,
          metadata: {
            conversacion_id: conversacion.id,
            original_canal: conversacion.servicio_origen,
            file_name: fileName,
            file_type: fileType === 'image' || fileType === 'audio' || fileType === 'video' ? fileType : 'file',
            file_url: url,
            mime_type: mimeType || undefined,
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

    const mime = (audioBlob.type || 'audio/webm').split(';')[0];
    const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm';
    const fileName = `audio_${Date.now()}.${ext}`;
    const check = validateOutgoingMedia({ type: mime, size: audioBlob.size, name: fileName });
    if (!check.ok) {
      setErrorEnvio(check.error);
      return;
    }

    setEnviando(true);
    setErrorEnvio(null);

    try {
      const { FileUploadService } = await import('@/app/servicios/storage/FileUploadService');
      const audioFile = new File([audioBlob], fileName, { type: mime });
      const uploadResult = await FileUploadService.uploadFile(audioFile, conversacion.id);
      
      if (!uploadResult.success || !uploadResult.url) {
        setErrorEnvio(uploadResult.error || 'Error subiendo audio');
        return;
      }

      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: conversacion.servicio_origen === 'whatsapp-lite' ? 'whatsapp' : conversacion.servicio_origen,
          to: conversacion.metadata?.remote_jid
            || conversacion.metadata?.phone_number
            || conversacion.remitente,
          message: `Audio (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
          messageType: 'audio',
          filePath: uploadResult.url,
          metadata: {
            conversacion_id: conversacion.id,
            original_canal: conversacion.servicio_origen,
            file_name: fileName,
            file_type: 'audio',
            file_url: uploadResult.url,
            mime_type: mime.includes('ogg') ? 'audio/ogg; codecs=opus' : mime,
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
        ...chatBg
      }}>
        <Box sx={{ textAlign: 'center', color: WA.muted }}>
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
      <ConversationHeader
        conversacion={conversacion}
        onDelete={onDeleteConversacion}
        onArchive={onArchiveConversacion}
        archivedView={archivedView}
        onManageReplies={() => setManageReplies(true)}
        drawerOpen={drawerOpen}
        onToggleDrawer={onToggleDrawer}
      />

      {/* Área de mensajes */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        p: 2,
        ...chatBg,
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
                isOwn={
                  !!mensaje.usuario_id
                  || mensaje.metadata?.direction === 'outgoing'
                  || String(mensaje.id).startsWith('temp-')
                }
                onReply={
                  !mensaje.usuario_id
                  && mensaje.metadata?.direction !== 'outgoing'
                  && (mensaje.wa_message_id || mensaje.metadata?.wa_message_id)
                    ? () => setReplyTo({
                        id: mensaje.id,
                        wa_message_id: mensaje.wa_message_id || mensaje.metadata?.wa_message_id,
                        contenido: mensaje.contenido,
                        remitente: mensaje.remitente,
                        metadata: mensaje.metadata,
                      })
                    : undefined
                }
              />
            ))}
            
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      <MessageInput 
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        onSendAudio={handleSendAudio}
        conversationId={conversacion.id}
        disabled={loading}
        placeholder="Escribe un mensaje o / para respuestas"
        enviando={enviando}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        respuestaVars={{
          nombre: conversationGreetingName(conversacion),
          telefono: conversacion.display_phone || conversationRealPhone(conversacion),
        }}
        manageOpen={manageReplies}
        onManageOpenChange={setManageReplies}
      />
    </Box>
  );
}