/**
 * Tipos compartidos para el sistema de mensajería
 */

export type PlataformaMensajeria = 'telegram' | 'whatsapp' | 'email' | 'sms';

export interface MensajeNormalizado {
  id?: string;
  remitente: string;
  contenido: string;
  fecha_mensaje: string;
  servicio_origen: PlataformaMensajeria;
  tipo: 'entrante' | 'saliente';
  metadata?: Record<string, any>;
}

export interface ConversacionNormalizada {
  id?: string;
  remitente: string;
  servicio_origen: PlataformaMensajeria;
  fecha_mensaje: string;
  lead_id?: string;
  metadata?: Record<string, any>;
}

export interface ConfiguracionPlataforma {
  nombre: string;
  activa: boolean;
  configuracion: Record<string, any>;
}

export interface EstadoMensaje {
  estado: 'enviando' | 'enviado' | 'entregado' | 'leido' | 'error';
  fecha_actualizacion: string;
  detalles?: string;
}

export interface RespuestaEnvio {
  exito: boolean;
  mensaje_id?: string;
  error?: string;
  metadata?: Record<string, any>;
}