import { DisconnectReason } from 'baileys';

// Logger básico para evitar el error del noise-handler
const createBasicLogger = () => ({
  level: 'silent',
  child: () => createBasicLogger(),
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {}
});

export const BAILEYS_CONFIG = {
  browser: ['WhatsApp Web', 'Chrome', '120.0.0'] as [string, string, string],
  connectTimeoutMs: 90_000, // Timeout más largo para conexiones lentas
  qrTimeout: 120_000, // QR timeout más largo para dar tiempo al móvil
  defaultQueryTimeoutMs: 90_000,
  retryRequestDelayMs: 2000, // Más tiempo entre reintentos
  maxMsgRetryCount: 8, // Más reintentos para superar error 515
  markOnlineOnConnect: false,
  keepAliveIntervalMs: 20_000, // Keep alive más frecuente
  emitOwnEvents: false,
  shouldSyncFullHistory: false,
  // Configuraciones para resistir error 515
  printQRInTerminal: false,
  syncFullHistory: false,
  generateHighQualityLinkPreview: false,
  // Logger básico para evitar el error del noise-handler
  logger: createBasicLogger(),
  // Configuración de versión compatible
  version: undefined,
  // Configuración de red optimizada para móvil
  getMessage: async () => ({ conversation: 'Mensaje no disponible' }),
  // Configuraciones adicionales para estabilidad móvil
  fireInitQueries: false, // No hacer queries iniciales que pueden causar 515
  shouldSyncHistoryMessage: () => false // No sincronizar historial
};

export const SESSION_CONFIG = {
  requiredCredProps: ['noiseKey', 'signedIdentityKey', 'signedPreKey', 'registrationId', 'advSignedIdentityKey']
};

export const DISCONNECT_HANDLERS = {
  [DisconnectReason.badSession]: 'Sesión corrupta detectada',
  [DisconnectReason.connectionClosed]: 'Conexión cerrada',
  [DisconnectReason.connectionLost]: 'Conexión perdida',
  [DisconnectReason.connectionReplaced]: 'Conexión reemplazada',
  [DisconnectReason.restartRequired]: 'Reinicio requerido',
  [DisconnectReason.loggedOut]: 'Usuario deslogueado'
};

export const RECONNECT_DELAYS = {
  [DisconnectReason.badSession]: 0, // No reconectar
  [DisconnectReason.connectionClosed]: 3000,
  [DisconnectReason.connectionLost]: 3000,
  [DisconnectReason.connectionReplaced]: 3000,
  [DisconnectReason.restartRequired]: 2000,
  [DisconnectReason.loggedOut]: 0 // No reconectar
}; 