// Este archivo contiene las funciones para emitir eventos desde el servidor
// Las funciones reales están definidas en server.js

declare global {
  // eslint-disable-next-line no-var
  var emitToUser: (userId: string, event: string, data: any) => void;
  // eslint-disable-next-line no-var
  var emitToAll: (event: string, data: any) => void;
}

// Función para emitir eventos a usuarios específicos
export function emitToUser(userId: string, event: string, data: any) {
  if (typeof global.emitToUser === 'function') {
    global.emitToUser(userId, event, data);
  } else {
    console.warn('⚠️ Socket.IO no está inicializado aún');
  }
}

// Función para emitir eventos a todos los usuarios
export function emitToAll(event: string, data: any) {
  if (typeof global.emitToAll === 'function') {
    global.emitToAll(event, data);
  } else {
    console.warn('⚠️ Socket.IO no está inicializado aún');
  }
} 