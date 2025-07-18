// Dashboard Realtime Hook - Hook para suscripciones en tiempo real del dashboard
// Fecha: 2025-01-16

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { DashboardMetricsResponse, NotificationEvent } from '@/types/dashboard';

// =====================================================
// Interfaces
// =====================================================

interface RealtimeConnectionStatus {
  isConnected: boolean;
  lastUpdate: string | null;
  connectionError: string | null;
  reconnectAttempts: number;
}

interface UseRealtimeSubscriptionOptions {
  channel: string;
  event: string;
  enabled?: boolean;
  onUpdate?: (payload: any) => void;
  onError?: (error: Error) => void;
}

interface UseDashboardRealtimeOptions {
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMetricsUpdate?: (metrics: Partial<DashboardMetricsResponse>) => void;
  onNotification?: (notification: NotificationEvent) => void;
  onConnectionChange?: (status: RealtimeConnectionStatus) => void;
}

// =====================================================
// Hook principal para tiempo real del dashboard
// =====================================================

export function useDashboardRealtime(
  userId: string,
  options: UseDashboardRealtimeOptions = {}
) {
  const { data: session } = useSession();
  const {
    enabled = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onMetricsUpdate,
    onNotification,
    onConnectionChange
  } = options;

  // Estados
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    isConnected: false,
    lastUpdate: null,
    connectionError: null,
    reconnectAttempts: 0
  });

  // Referencias
  const supabaseRef = useRef<any>(null);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // =====================================================
  // Inicializar cliente de Supabase
  // =====================================================

  const initializeSupabase = useCallback(() => {
    if (!session?.supabaseToken) return null;

    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${session.supabaseToken}`
          }
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );
  }, [session?.supabaseToken]);

  // =====================================================
  // Configurar suscripciones
  // =====================================================

  const setupSubscriptions = useCallback(async () => {
    if (!enabled || !userId || !session?.supabaseToken) return;

    try {
      const supabase = initializeSupabase();
      if (!supabase) return;

      supabaseRef.current = supabase;

      // Canal para métricas del dashboard
      const metricsChannel = supabase
        .channel(`dashboard_metrics_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversaciones',
            filter: `usuario_id=eq.${userId}`
          },
          (payload) => {
            if (mountedRef.current) {
              handleMetricsUpdate(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mensajes_conversacion'
          },
          (payload) => {
            if (mountedRef.current) {
              handleMessageUpdate(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `usuario_id=eq.${userId}`
          },
          (payload) => {
            if (mountedRef.current) {
              handleTaskUpdate(payload);
            }
          }
        );

      // Canal para notificaciones
      const notificationsChannel = supabase
        .channel(`notifications_${userId}`)
        .on('broadcast', { event: 'notification' }, (payload) => {
          if (mountedRef.current) {
            handleNotification(payload.payload);
          }
        });

      // Suscribir canales
      const channels = [metricsChannel, notificationsChannel];
      
      for (const channel of channels) {
        const subscription = await channel.subscribe((status) => {
          if (mountedRef.current) {
            handleSubscriptionStatus(status, channel.topic);
          }
        });

        if (subscription.state === 'joined') {
          channelsRef.current.push(channel);
        }
      }

      // Actualizar estado de conexión
      if (mountedRef.current) {
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: true,
          connectionError: null,
          reconnectAttempts: 0,
          lastUpdate: new Date().toISOString()
        }));
      }

    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error);
      
      if (mountedRef.current) {
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: false,
          connectionError: error instanceof Error ? error.message : 'Unknown error'
        }));
        
        scheduleReconnect();
      }
    }
  }, [enabled, userId, session?.supabaseToken, initializeSupabase]);

  // =====================================================
  // Manejar actualizaciones
  // =====================================================

  const handleMetricsUpdate = useCallback((payload: any) => {
    const now = new Date().toISOString();
    
    setConnectionStatus(prev => ({
      ...prev,
      lastUpdate: now
    }));

    // Notificar actualización de métricas
    if (onMetricsUpdate) {
      // Aquí se procesaría el payload para extraer métricas relevantes
      const metricsUpdate = processMetricsPayload(payload);
      onMetricsUpdate(metricsUpdate);
    }
  }, [onMetricsUpdate]);

  const handleMessageUpdate = useCallback((payload: any) => {
    const now = new Date().toISOString();
    
    setConnectionStatus(prev => ({
      ...prev,
      lastUpdate: now
    }));

    // Procesar actualización de mensaje
    if (payload.eventType === 'INSERT' && payload.new) {
      const message = payload.new;
      
      // Crear notificación si es mensaje entrante
      if (message.tipo === 'entrante' && onNotification) {
        const notification: NotificationEvent = {
          id: `msg_${message.id}`,
          type: 'new_message',
          title: 'Nuevo mensaje',
          message: `Mensaje de ${message.remitente || 'Usuario'}`,
          data: message,
          timestamp: now,
          read: false
        };
        
        onNotification(notification);
      }
    }
  }, [onNotification]);

  const handleTaskUpdate = useCallback((payload: any) => {
    const now = new Date().toISOString();
    
    setConnectionStatus(prev => ({
      ...prev,
      lastUpdate: now
    }));

    // Procesar actualización de tarea
    if (payload.eventType === 'INSERT' && payload.new) {
      const task = payload.new;
      
      // Crear notificación para nueva tarea
      if (onNotification) {
        const notification: NotificationEvent = {
          id: `task_${task.id}`,
          type: 'task_due',
          title: 'Nueva tarea',
          message: task.title,
          data: task,
          timestamp: now,
          read: false
        };
        
        onNotification(notification);
      }
    }
  }, [onNotification]);

  const handleNotification = useCallback((payload: NotificationEvent) => {
    if (onNotification) {
      onNotification(payload);
    }
  }, [onNotification]);

  const handleSubscriptionStatus = useCallback((status: string, topic: string) => {
    console.log(`Subscription ${topic}: ${status}`);
    
    if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      if (mountedRef.current) {
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: false,
          connectionError: `Subscription ${topic} failed: ${status}`
        }));
        
        scheduleReconnect();
      }
    }
  }, []);

  // =====================================================
  // Reconexión automática
  // =====================================================

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionStatus(prev => {
      if (prev.reconnectAttempts >= maxReconnectAttempts) {
        return {
          ...prev,
          connectionError: 'Max reconnection attempts reached'
        };
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log(`Attempting reconnection ${prev.reconnectAttempts + 1}/${maxReconnectAttempts}`);
          cleanup();
          setupSubscriptions();
        }
      }, reconnectInterval * Math.pow(2, prev.reconnectAttempts)); // Exponential backoff

      return {
        ...prev,
        reconnectAttempts: prev.reconnectAttempts + 1
      };
    });
  }, [maxReconnectAttempts, reconnectInterval, setupSubscriptions]);

  // =====================================================
  // Limpieza de suscripciones
  // =====================================================

  const cleanup = useCallback(() => {
    // Limpiar timeout de reconexión
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Desuscribir canales
    channelsRef.current.forEach(channel => {
      try {
        channel.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing channel:', error);
      }
    });
    channelsRef.current = [];

    // Limpiar cliente de Supabase
    if (supabaseRef.current) {
      try {
        supabaseRef.current.removeAllChannels();
      } catch (error) {
        console.error('Error removing channels:', error);
      }
      supabaseRef.current = null;
    }
  }, []);

  // =====================================================
  // Reconectar manualmente
  // =====================================================

  const reconnect = useCallback(() => {
    setConnectionStatus(prev => ({
      ...prev,
      reconnectAttempts: 0,
      connectionError: null
    }));
    
    cleanup();
    setupSubscriptions();
  }, [cleanup, setupSubscriptions]);

  // =====================================================
  // Efectos
  // =====================================================

  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled && userId && session?.supabaseToken) {
      setupSubscriptions();
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [enabled, userId, session?.supabaseToken, setupSubscriptions, cleanup]);

  // Notificar cambios de estado de conexión
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(connectionStatus);
    }
  }, [connectionStatus, onConnectionChange]);

  // =====================================================
  // Retorno del hook
  // =====================================================

  return {
    isConnected: connectionStatus.isConnected,
    lastUpdate: connectionStatus.lastUpdate,
    connectionError: connectionStatus.connectionError,
    reconnectAttempts: connectionStatus.reconnectAttempts,
    reconnect,
    cleanup
  };
}

// =====================================================
// Hook para suscripción específica
// =====================================================

export function useRealtimeSubscription(
  userId: string,
  options: UseRealtimeSubscriptionOptions
) {
  const { data: session } = useSession();
  const { channel, event, enabled = true, onUpdate, onError } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<any>(null);

  const connect = useCallback(async () => {
    if (!enabled || !userId || !session?.supabaseToken) return;

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${session.supabaseToken}`
            }
          }
        }
      );

      supabaseRef.current = supabase;

      const realtimeChannel = supabase
        .channel(channel)
        .on('postgres_changes' as any, { event: event as any, schema: '*' }, (payload: any) => {
          if (onUpdate) {
            onUpdate(payload);
          }
        });

      const subscription = await realtimeChannel.subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setError(new Error(`Subscription failed: ${status}`));
        }
      });

      channelRef.current = realtimeChannel;
      setError(null);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      if (onError) {
        onError(error);
      }
    }
  }, [enabled, userId, session?.supabaseToken, channel, event, onUpdate, onError]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (supabaseRef.current) {
      supabaseRef.current.removeAllChannels();
      supabaseRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    reconnect: connect,
    disconnect
  };
}

// =====================================================
// Hook para notificaciones en tiempo real
// =====================================================

export function useRealtimeNotifications(userId: string, enabled = true) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification: NotificationEvent) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Mantener solo 50 notificaciones
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Configurar suscripción a notificaciones
  useDashboardRealtime(userId, {
    enabled,
    onNotification: addNotification
  });

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
}

// =====================================================
// Funciones auxiliares
// =====================================================

function processMetricsPayload(payload: any): Partial<DashboardMetricsResponse> {
  // Procesar el payload de Supabase para extraer métricas relevantes
  // Esta es una implementación simplificada
  
  const now = new Date().toISOString();
  
  return {
    lastUpdated: now,
    // Aquí se procesarían los datos reales del payload
    overview: {
      activeConversations: 0,
      pendingResponses: 0,
      averageResponseTime: 0,
      conversionRate: 0,
      totalLeads: 0,
      newLeadsToday: 0,
      responseTimeTarget: 120,
      targetAchievement: 0
    }
  };
}

// =====================================================
// Tipos de exportación
// =====================================================

export type {
  RealtimeConnectionStatus,
  UseRealtimeSubscriptionOptions,
  UseDashboardRealtimeOptions
};