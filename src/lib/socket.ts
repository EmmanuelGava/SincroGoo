import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let initializationPromise: Promise<Socket> | null = null;

export function initSocket(): Socket {
  if (socket && socket.connected) {
    console.log('🔌 Socket.IO ya está conectado, reutilizando conexión existente');
    return socket;
  }

  if (initializationPromise) {
    console.log('🔌 Socket.IO ya se está inicializando, esperando...');
    return socket!; // Return existing socket even if not connected yet
  }

  console.log('🔌 Inicializando Socket.IO...');
  // Log de stack trace para depuración (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Stack trace de inicialización de Socket.IO:', new Error().stack);
  }

  const socketUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  console.log('🔌 URL del Socket.IO:', socketUrl);

  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    timeout: 30000, // Aumentar timeout
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO conectado exitosamente:', socket?.id);
    reconnectAttempts = 0; // Resetear contador de reintentos
    initializationPromise = null; // Reset initialization promise
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket.IO desconectado:', reason);

    if (reason === 'io server disconnect') {
      // El servidor desconectó, intentar reconectar manualmente
      console.log('🔄 Servidor desconectó, intentando reconectar...');
      setTimeout(() => {
        if (socket) {
          socket.connect();
        }
      }, 1000);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Error conectando Socket.IO:', error);
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Máximo de reintentos alcanzado para Socket.IO');
    } else {
      console.log(`🔄 Reintento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} en 2 segundos...`);
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('✅ Socket.IO reconectado después de', attemptNumber, 'intentos');
    reconnectAttempts = 0;
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('🔄 Intento de reconexión Socket.IO:', attemptNumber);
  });

  socket.on('reconnect_error', (error) => {
    console.error('❌ Error en reconexión Socket.IO:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Falló la reconexión Socket.IO después de', MAX_RECONNECT_ATTEMPTS, 'intentos');
  });

  socket.on('error', (error) => {
    console.error('❌ Error en Socket.IO:', error);
  });

  // Verificar estado de conexión periódicamente
  setInterval(() => {
    if (socket && !socket.connected) {
      console.log('⚠️ Socket.IO no está conectado, verificando estado...');
      console.log('📊 Estado del socket:', {
        connected: socket.connected,
        id: socket.id,
        disconnected: socket.disconnected
      });
    }
  }, 30000); // Verificar cada 30 segundos

  return socket;
}

export function getSocket() {
  if (!socket) {
    console.log('⚠️ Socket no inicializado, inicializando...');
    return initSocket();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    console.log('🔌 Desconectando Socket.IO...');
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
}

export function isSocketConnected(): boolean {
  return socket ? socket.connected : false;
}

export function getSocketId(): string | null {
  return socket?.id || null;
}

export function shouldInitializeSocket(): boolean {
  // Only initialize socket if we're in a WhatsApp-related page or component
  if (typeof window === 'undefined') return false;

  const currentPath = window.location.pathname;
  const isWhatsAppPage = currentPath.includes('/configuracion/mensajeria');

  console.log('🔍 Verificando si se debe inicializar Socket.IO:', {
    currentPath,
    isWhatsAppPage,
    hasSocket: !!socket,
    isConnected: socket?.connected || false
  });

  return isWhatsAppPage;
} 