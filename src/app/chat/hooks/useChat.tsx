import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
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
  const { data: session, status } = useSession();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs para funciones estables en realtime
  const fetchConversacionesRef = useRef<() => Promise<void>>();
  const fetchMensajesRef = useRef<(id: string) => Promise<void>>();

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
      
      const res = await fetch('/api/chat/conversaciones');
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
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
  }, [session, status]);

  // Actualizar ref cuando cambie la función
  useEffect(() => {
    fetchConversacionesRef.current = fetchConversaciones;
  }, [fetchConversaciones]);

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

  // Suscripción a tiempo real - solo se configura una vez
  useEffect(() => {
    if (!supabase || status !== 'authenticated') {
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
          
          // Usar refs para evitar dependencias
          if (fetchConversacionesRef.current) {
            fetchConversacionesRef.current();
          }
          
          // Si el mensaje es de la conversación activa, refrescar mensajes
          const conversacionId = payload.new?.conversacion_id;
          setConversacionActiva(current => {
            if (current && current.id === conversacionId && fetchMensajesRef.current) {
              fetchMensajesRef.current(conversacionId);
            }
            return current;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversaciones' },
        (payload) => {
          console.log('Conversación actualizada:', payload);
          if (fetchConversacionesRef.current) {
            fetchConversacionesRef.current();
          }
        }
      )
      .subscribe((status) => {
        console.log('Estado de suscripción realtime chat:', status);
      });

    return () => {
      console.log('Limpiando suscripción realtime chat...');
      channel.unsubscribe();
    };
  }, [status]); // Solo depende del status de autenticación

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