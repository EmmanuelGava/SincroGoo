import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { initSocket, shouldInitializeSocket } from '@/lib/socket';
import { supabase } from '@/lib/supabase/browserClient';
import { inboxChannelName } from '@/lib/chat/inboxChannel';
import { shouldAlertIncomingMessage, shouldPlayIncomingSound } from '@/lib/chat/chatNotifyPolicy';
import {
  isChatSoundEnabled,
  playChatIncomingSound,
  showChatBrowserNotification,
  unlockChatAudio,
} from '@/lib/chat/chatNotifications';
import { conversationNeedsPhoneResolution } from '@/lib/chat/conversationIdentity';

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
  esperando_seguimiento?: boolean;
  seguimiento_desde?: string | null;
  seguimiento_horas?: number | null;
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
  estado_envio?: string | null;
}

export function useChat() {
  const { data: session, status } = useSession();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs para funciones estables en live/poll
  const fetchConversacionesRef = useRef<() => Promise<void>>();
  const fetchMensajesRef = useRef<(id: string, options?: { silent?: boolean }) => Promise<void>>();
  const conversacionActivaRef = useRef<Conversacion | null>(null);
  const resolvingPhoneRef = useRef(new Set<string>());

  // Fetch conversaciones
  const fetchConversaciones = useCallback(async () => {
    // No hacer peticiones si no hay sesión
    if (status === 'loading') {
      return; // Esperar a que cargue la sesión
    }
    
    if (status === 'unauthenticated' || !session) {
      setError('Debes iniciar sesión para ver las conversaciones');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      const res = await fetch('/api/chat/conversaciones', { cache: 'no-store' });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        throw new Error(data.error || 'Error fetching conversaciones');
      }
      
      const next = data.conversaciones || [];
      setConversaciones(next);
      setConversacionActiva((prev) => {
        if (!prev) return prev;
        return next.find((c: Conversacion) => c.id === prev.id) || prev;
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching conversaciones:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setConversaciones([]);
    } finally {
      setLoading(false);
    }
  }, [session, status]);

  // Actualizar ref cuando cambie la función
  useEffect(() => {
    fetchConversacionesRef.current = fetchConversaciones;
  }, [fetchConversaciones]);

  // Fetch mensajes de una conversación específica
  const fetchMensajes = useCallback(async (conversacionId: string, options?: { silent?: boolean }) => {
    if (!conversacionId) return;
    
    if (!options?.silent) setLoadingMensajes(true);
    try {
      setError(null);
      const res = await fetch(`/api/chat/mensajes?conversacionId=${conversacionId}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error fetching mensajes');
      }
      
      setMensajes(data.mensajes || []);
    } catch (error) {
      console.error('Error fetching mensajes:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setMensajes([]);
    } finally {
      if (!options?.silent) setLoadingMensajes(false);
    }
  }, []);

  // Actualizar ref cuando cambie la función
  useEffect(() => {
    fetchMensajesRef.current = fetchMensajes;
  }, [fetchMensajes]);

  // Enviar mensaje
  const enviarMensaje = useCallback(async (contenido: string) => {
    if (!conversacionActiva || !contenido.trim()) {
      return false;
    }

    try {
      setError(null);
      
      // Usar la nueva arquitectura unificada
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: conversacionActiva.servicio_origen === 'whatsapp-lite'
            ? 'whatsapp'
            : conversacionActiva.servicio_origen,
          to: conversacionActiva.metadata?.phone_number
            || conversacionActiva.metadata?.remote_jid
            || conversacionActiva.remitente,
          message: contenido.trim(),
          messageType: 'text',
          metadata: {
            conversacion_id: conversacionActiva.id,
            original_canal: conversacionActiva.servicio_origen
          }
        })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error enviando mensaje');
      }

      console.log('✅ Mensaje enviado via nueva arquitectura:', data);

      // Refrescar mensajes y conversaciones
      await fetchMensajes(conversacionActiva.id);
      await fetchConversaciones();
      
      return true;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setError(error instanceof Error ? error.message : 'Error enviando mensaje');
      return false;
    }
  }, [conversacionActiva, fetchMensajes, fetchConversaciones]);

  // Seleccionar conversación
  const seleccionarConversacion = useCallback((conversacion: Conversacion) => {
    setConversacionActiva(conversacion);
    fetchMensajes(conversacion.id);
    if (conversationNeedsPhoneResolution(conversacion) && !resolvingPhoneRef.current.has(conversacion.id)) {
      resolvingPhoneRef.current.add(conversacion.id);
      const jid = String(conversacion.metadata?.remote_jid || '')
        || (String(conversacion.remitente).includes('@')
          ? String(conversacion.remitente)
          : `${conversacion.remitente}@lid`);
      fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve-peer',
          type: 'lite',
          jid,
          conversacionId: conversacion.id,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.resolved && data?.phone) {
            fetchConversacionesRef.current?.();
          } else {
            resolvingPhoneRef.current.delete(conversacion.id);
          }
        })
        .catch(() => {
          resolvingPhoneRef.current.delete(conversacion.id);
        });
    }
    if ((conversacion.unread_count || 0) > 0) {
      fetch('/api/chat/conversaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversacionId: conversacion.id }),
      }).then(() => {
        setConversaciones((prev) =>
          prev.map((c) => (c.id === conversacion.id ? { ...c, unread_count: 0 } : c))
        );
        setConversacionActiva((prev) =>
          prev && prev.id === conversacion.id ? { ...prev, unread_count: 0 } : prev
        );
      }).catch((error) => {
        console.warn('No se pudo marcar la conversación como leída:', error);
      });
    }
  }, [fetchMensajes]);

  // Limpiar conversación activa
  const limpiarConversacionActiva = useCallback(() => {
    setConversacionActiva(null);
    setMensajes([]);
  }, []);

  const eliminarConversacion = useCallback(async (conversacionId: string) => {
    try {
      const res = await fetch('/api/chat/conversaciones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversacionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo eliminar el chat');
      }
      setConversaciones((prev) => prev.filter((c) => c.id !== conversacionId));
      if (conversacionActivaRef.current?.id === conversacionId) {
        setConversacionActiva(null);
        setMensajes([]);
      }
      return true;
    } catch (error) {
      console.error('Error eliminando conversación:', error);
      setError(error instanceof Error ? error.message : 'Error eliminando el chat');
      return false;
    }
  }, []);

  useEffect(() => {
    conversacionActivaRef.current = conversacionActiva;
  }, [conversacionActiva]);

  // Efecto inicial para cargar conversaciones
  useEffect(() => {
    fetchConversaciones();
  }, [fetchConversaciones]);

  useEffect(() => {
    const unlock = () => unlockChatAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const refreshLive = useCallback(() => {
    fetchConversacionesRef.current?.();
    const activeId = conversacionActivaRef.current?.id;
    if (activeId) {
      fetchMensajesRef.current?.(activeId, { silent: true });
    }
  }, []);

  const alertIncoming = useCallback((payload: {
    conversacionId?: string;
    preview?: string;
    contactName?: string;
    direction?: string;
  }) => {
    if (shouldPlayIncomingSound({ direction: payload.direction }) && isChatSoundEnabled()) {
      playChatIncomingSound();
    }
    if (!shouldAlertIncomingMessage({
      direction: payload.direction,
      conversacionId: payload.conversacionId,
      activeConversacionId: conversacionActivaRef.current?.id,
      pageVisible: typeof document === 'undefined' ? true : !document.hidden,
    })) {
      return;
    }
    const title = payload.contactName || 'Nuevo mensaje';
    const body = payload.preview || 'Tenés un mensaje nuevo';
    showChatBrowserNotification(title, body, payload.conversacionId);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id || !supabase) return;

    const client = supabase;
    const channel = client
      .channel(inboxChannelName(session.user.id))
      .on('broadcast', { event: 'new_message' }, (msg) => {
        const payload = (msg?.payload || {}) as {
          conversacionId?: string;
          preview?: string;
          contactName?: string;
          direction?: string;
        };
        refreshLive();
        alertIncoming(payload);
      })
      .subscribe((subStatus) => {
        console.log('Realtime inbox chat:', subStatus);
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [status, session?.user?.id, refreshLive, alertIncoming]);

  // Respaldo por si el broadcast se pierde (pestaña en segundo plano, etc.)
  useEffect(() => {
    if (status !== 'authenticated') return;
    const id = setInterval(refreshLive, 3000);
    return () => clearInterval(id);
  }, [status, refreshLive]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    if (typeof window !== 'undefined' && !shouldInitializeSocket()) return;

    const socket = initSocket();
    const onMessage = () => refreshLive();
    const join = () => socket.emit('join-user-room', session.user.id);
    socket.on('whatsapp-message', onMessage);
    socket.on('connect', join);
    if (socket.connected) join();

    return () => {
      socket.off('whatsapp-message', onMessage);
      socket.off('connect', join);
    };
  }, [status, session?.user?.id, refreshLive]);

  return {
    // Estado
    conversaciones,
    conversacionActiva,
    mensajes,
    loading,
    loadingMensajes,
    error,
    
    // Acciones
    fetchConversaciones,
    fetchMensajes,
    enviarMensaje,
    seleccionarConversacion,
    limpiarConversacionActiva,
    eliminarConversacion,
    
    // Utilidades
    hasConversaciones: conversaciones.length > 0,
    hasMensajes: mensajes.length > 0,
  };
}