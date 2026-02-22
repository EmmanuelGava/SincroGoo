import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WhatsAppConnectionEvent, WhatsAppQREvent, WhatsAppMessageEvent } from '@/types/socket';

interface UseSocketOptions {
  userId?: string;
  onWhatsAppConnected?: (data: WhatsAppConnectionEvent) => void;
  onWhatsAppQR?: (data: WhatsAppQREvent) => void;
  onWhatsAppMessage?: (data: WhatsAppMessageEvent) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Inicializar Socket.IO
    const initSocket = async () => {
      try {
        // Primero inicializar el servidor Socket.IO
        await fetch('/api/socket');
        
        // Conectar cliente
        const socket = io(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', {
          transports: ['websocket', 'polling']
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('🔌 Socket.IO conectado:', socket.id);
          setIsConnected(true);

          // Unir al usuario a su sala personal
          if (options.userId) {
            socket.emit('join-user-room', options.userId);
          }
        });

        socket.on('disconnect', () => {
          console.log('🔌 Socket.IO desconectado');
          setIsConnected(false);
        });

        // Eventos de WhatsApp
        socket.on('whatsapp-connected', (data: WhatsAppConnectionEvent) => {
          console.log('📱 WhatsApp conectado via Socket.IO:', data);
          options.onWhatsAppConnected?.(data);
        });

        socket.on('whatsapp-qr', (data: WhatsAppQREvent) => {
          console.log('📱 QR de WhatsApp via Socket.IO:', data);
          options.onWhatsAppQR?.(data);
        });

        socket.on('whatsapp-message', (data: WhatsAppMessageEvent) => {
          console.log('📨 Mensaje de WhatsApp via Socket.IO:', data);
          options.onWhatsAppMessage?.(data);
        });

      } catch (error) {
        console.error('❌ Error inicializando Socket.IO:', error);
      }
    };

    initSocket();

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [options.userId]);

  return {
    isConnected,
    socket: socketRef.current
  };
} 