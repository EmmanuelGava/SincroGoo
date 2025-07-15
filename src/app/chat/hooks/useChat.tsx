import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/browserClient';

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

export function useChat() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversaciones
  const fetchConversaciones = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/chat/conversaciones');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error fetching conversaciones');
      }
      
      setConversaciones(data.conversaciones || []);
    } catch (error) {
      console.error('Error fetching conversaciones:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setConversaciones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch mensajes de una conversación específica
  const fetchMensajes = useCallback(async (conversacionId: string) => {
    if (!conversacionId) return;
    
    setLoadingMensajes(true);
    try {
      setError(null);
      const res = await fetch(`/api/chat/mensajes?conversacionId=${conversacionId}`);
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
      setLoadingMensajes(false);
    }
  }, []);

  // Enviar mensaje
  const enviarMensaje = useCallback(async (contenido: string) => {
    if (!conversacionActiva || !contenido.trim()) {
      return false;
    }

    try {
      setError(null);
      const res = await fetch('/api/chat/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversacionId: conversacionActiva.id,
          contenido: contenido.trim(),
          canal: conversacionActiva.servicio_origen,
          remitente: conversacionActiva.remitente
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error enviando mensaje');
      }

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
  }, [fetchMensajes]);

  // Limpiar conversación activa
  const limpiarConversacionActiva = useCallback(() => {
    setConversacionActiva(null);
    setMensajes([]);
  }, []);

  // Efecto inicial para cargar conversaciones
  useEffect(() => {
    fetchConversaciones();
  }, [fetchConversaciones]);

  // Suscripción a tiempo real
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client no disponible para realtime');
      return;
    }

    console.log('Configurando suscripción realtime para chat...');
    
    const channel = supabase
      .channel('chat_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_conversacion' },
        (payload) => {
          console.log('Nuevo mensaje recibido en chat:', payload);
          
          // Si hay una conversación activa, refrescar sus mensajes
          if (conversacionActiva) {
            fetchMensajes(conversacionActiva.id);
          }
          
          // Siempre refrescar la lista de conversaciones
          fetchConversaciones();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversaciones' },
        (payload) => {
          console.log('Conversación actualizada:', payload);
          fetchConversaciones();
        }
      )
      .subscribe((status) => {
        console.log('Estado de suscripción realtime chat:', status);
      });

    return () => {
      console.log('Limpiando suscripción realtime chat...');
      channel.unsubscribe();
    };
  }, [conversacionActiva, fetchConversaciones, fetchMensajes]);

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
    
    // Utilidades
    hasConversaciones: conversaciones.length > 0,
    hasMensajes: mensajes.length > 0,
  };
}