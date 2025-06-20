// Handler para normalizar mensajes entrantes de Telegram

export interface MensajeTelegramNormalizado {
  remitente_id: string;
  remitente_nombre?: string;
  remitente_username?: string;
  contenido: string;
  fecha_mensaje: string;
  metadata?: any;
}

export function normalizeTelegramMessage(telegramPayload: any): MensajeTelegramNormalizado | null {
  // Ejemplo de extracción básica (ajusta según el payload real de Telegram)
  if (!telegramPayload || !telegramPayload.message) return null;
  const msg = telegramPayload.message;
  return {
    remitente_id: String(msg.from.id),
    remitente_nombre: msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : ''),
    remitente_username: msg.from.username || undefined,
    contenido: msg.text || '',
    fecha_mensaje: new Date(msg.date * 1000).toISOString(),
    metadata: msg
  };
} 