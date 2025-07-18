// Database Types - Mapeo de tablas existentes de la base de datos
// Fecha: 2025-01-16

// =====================================================
// Tipos base de la base de datos existente
// =====================================================

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  avatar_url?: string;
  provider?: string;
  ultimo_acceso?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  auth_id: string;
}

export interface EstadoLead {
  id: string;
  usuario_id: string;
  nombre: string;
  color?: string;
  orden: number;
  is_default: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  icono?: string;
}

export interface Lead {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  estado_id: string;
  probabilidad_cierre: number;
  tags: string[];
  valor_potencial: number;
  origen: string;
  notas: string;
  ultima_interaccion: string;
  asignado_a?: string;
  creado_por?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  telegram_id?: string;
  telegram_username?: string;
}

export interface Conversacion {
  id: string;
  lead_id?: string;
  usuario_id?: string;
  servicio_origen: string;
  tipo: 'entrante' | 'saliente';
  remitente?: string;
  fecha_mensaje: string;
  metadata?: Record<string, any>;
  fecha_creacion: string;
}

export interface MensajeConversacion {
  id: string;
  conversacion_id: string;
  tipo?: string;
  contenido?: string;
  remitente?: string;
  fecha_mensaje: string;
  canal?: string;
  metadata?: Record<string, any>;
  usuario_id?: string;
}

export interface Interaccion {
  id: string;
  lead_id: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  resultado?: string;
  siguiente_accion?: string;
  fecha_siguiente_accion?: string;
  creado_por?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  usuario_id?: string;
}

export interface ConfiguracionMensajeriaUsuario {
  id: string;
  usuario_id: string;
  plataforma: 'telegram' | 'whatsapp' | 'email';
  activa: boolean;
  configuracion: Record<string, any>;
  nombre_configuracion?: string;
  descripcion?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  sheets_id?: string;
  slides_id?: string;
  hojastitulo?: string;
  presentaciontitulo?: string;
  usuario_id: string;
}

export interface Sheet {
  id: string;
  proyecto_id: string;
  sheets_id: string;
  nombre?: string;
  titulo?: string;
  ultima_sincronizacion: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  google_id?: string;
}

export interface Slide {
  id: string;
  proyecto_id: string;
  google_presentation_id: string;
  google_id?: string;
  titulo: string;
  nombre?: string;
  url?: string;
  ultima_sincronizacion: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface Diapositiva {
  id: string;
  orden?: number;
  titulo?: string;
  configuracion?: Record<string, any>;
  slides_id: string;
  diapositiva_id?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  google_presentation_id?: string;
}

export interface Elemento {
  id: string;
  diapositiva_id: string;
  elemento_id: string;
  tipo: string;
  contenido?: string;
  posicion: Record<string, any>;
  estilo: Record<string, any>;
  fecha_creacion: string;
  fecha_actualizacion: string;
  celda_asociada?: string;
  tipo_asociacion?: string;
}

export interface Celda {
  id: string;
  sheet_id: string;
  fila: number;
  columna: string;
  referencia_celda: string;
  contenido?: string;
  tipo?: string;
  formato: Record<string, any>;
  metadata: Record<string, any>;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface Asociacion {
  id: string;
  elemento_id: string;
  sheets_id: string;
  columna: string;
  tipo?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface HistorialCambio {
  id: string;
  tipo_cambio?: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  fecha_cambio: string;
  elemento_id?: string;
}

export interface ConfiguracionProyecto {
  id: string;
  configuracion?: Record<string, any>;
  proyecto_id?: string;
}

export interface Cache {
  id: string;
  clave: string;
  valor: Record<string, any>;
  tiempo_expiracion?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface OAuthState {
  id: string;
  state: string;
  user_id: string;
  provider: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

// =====================================================
// Vista existente
// =====================================================

export interface VistaLeadsConMensaje {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  estado_id: string;
  probabilidad_cierre: number;
  tags: string[];
  valor_potencial: number;
  origen: string;
  notas: string;
  ultima_interaccion: string;
  asignado_a?: string;
  creado_por?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  telegram_id?: string;
  telegram_username?: string;
  ultimo_mensaje?: string;
  fecha_ultimo_mensaje?: string;
}

// =====================================================
// Tipos para consultas complejas del dashboard
// =====================================================

export interface LeadConEstado extends Lead {
  estado: EstadoLead;
}

export interface ConversacionConLead extends Conversacion {
  lead?: Lead;
  mensajes?: MensajeConversacion[];
  ultimo_mensaje?: MensajeConversacion;
}

export interface LeadConConversaciones extends Lead {
  conversaciones: Conversacion[];
  estado: EstadoLead;
  interacciones?: Interaccion[];
}

// =====================================================
// Tipos para métricas agregadas
// =====================================================

export interface MetricasConversaciones {
  total_conversaciones: number;
  conversaciones_activas: number;
  mensajes_pendientes: number;
  tiempo_promedio_respuesta: number;
  tasa_respuesta: number;
  conversaciones_por_plataforma: {
    plataforma: string;
    cantidad: number;
  }[];
}

export interface MetricasLeads {
  total_leads: number;
  leads_nuevos_hoy: number;
  leads_por_estado: {
    estado_id: string;
    estado_nombre: string;
    cantidad: number;
  }[];
  valor_potencial_total: number;
  tasa_conversion: number;
}

export interface MetricasPlataforma {
  plataforma: string;
  mensajes_enviados: number;
  mensajes_recibidos: number;
  conversaciones_activas: number;
  tiempo_promedio_respuesta: number;
  estado_conexion: 'connected' | 'disconnected' | 'error';
  ultima_actividad: string;
}

// =====================================================
// Tipos para filtros y consultas
// =====================================================

export interface FiltroConversaciones {
  usuario_id?: string;
  lead_id?: string;
  servicio_origen?: string;
  tipo?: 'entrante' | 'saliente';
  fecha_desde?: string;
  fecha_hasta?: string;
  con_respuesta_pendiente?: boolean;
}

export interface FiltroLeads {
  usuario_id?: string;
  estado_id?: string;
  asignado_a?: string;
  origen?: string;
  fecha_creacion_desde?: string;
  fecha_creacion_hasta?: string;
  valor_potencial_min?: number;
  valor_potencial_max?: number;
  tags?: string[];
}

export interface FiltroMensajes {
  conversacion_id?: string;
  usuario_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo?: string;
  canal?: string;
}

// =====================================================
// Tipos para respuestas de API
// =====================================================

export interface RespuestaConversaciones {
  conversaciones: ConversacionConLead[];
  total: number;
  pagina: number;
  limite: number;
  tiene_mas: boolean;
}

export interface RespuestaLeads {
  leads: LeadConEstado[];
  total: number;
  pagina: number;
  limite: number;
  tiene_mas: boolean;
}

export interface RespuestaMensajes {
  mensajes: MensajeConversacion[];
  total: number;
  pagina: number;
  limite: number;
  tiene_mas: boolean;
}

// =====================================================
// Nuevas tablas del dashboard
// =====================================================

export interface DashboardPreferences {
  id: string;
  usuario_id: string;
  layout_type: 'compact' | 'expanded' | 'custom';
  visible_sections: string[];
  refresh_interval: number;
  notification_settings: {
    browser_notifications: boolean;
    sound_alerts: boolean;
    priority_only: boolean;
    quiet_hours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  focus_mode: boolean;
  custom_objectives: {
    response_time_target: number;
    daily_conversations_target: number;
    conversion_rate_target: number;
  };
  theme_preferences: {
    color_scheme: 'light' | 'dark' | 'auto';
    compact_view: boolean;
    show_animations: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  usuario_id: string;
  lead_id?: string;
  conversation_id?: string;
  task_type: 'follow_up' | 'first_response' | 'scheduled_contact' | 'lead_qualification' | 'proposal_followup' | 'meeting_reminder' | 'custom';
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'snoozed';
  is_recurring: boolean;
  recurring_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    end_date?: string;
    days_of_week?: number[];
    day_of_month?: number;
  };
  completed_at?: string;
  snoozed_until?: string;
  auto_generated: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetricsCache {
  id: string;
  usuario_id: string;
  metric_type: 'overview_metrics' | 'platform_breakdown' | 'conversation_metrics' | 'response_time_metrics' | 'conversion_metrics' | 'time_series_data';
  time_range: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';
  filters: Record<string, any>;
  data: Record<string, any>;
  expires_at: string;
  created_at: string;
}

// =====================================================
// Tipos para operaciones CRUD
// =====================================================

export interface CrearLead {
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  estado_id: string;
  probabilidad_cierre?: number;
  tags?: string[];
  valor_potencial?: number;
  origen?: string;
  notas?: string;
  asignado_a?: string;
  telegram_id?: string;
  telegram_username?: string;
}

export interface ActualizarLead {
  nombre?: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  estado_id?: string;
  probabilidad_cierre?: number;
  tags?: string[];
  valor_potencial?: number;
  origen?: string;
  notas?: string;
  asignado_a?: string;
  telegram_id?: string;
  telegram_username?: string;
}

export interface CrearConversacion {
  lead_id?: string;
  usuario_id?: string;
  servicio_origen: string;
  tipo: 'entrante' | 'saliente';
  remitente?: string;
  metadata?: Record<string, any>;
}

export interface CrearMensaje {
  conversacion_id: string;
  tipo?: string;
  contenido?: string;
  remitente?: string;
  canal?: string;
  metadata?: Record<string, any>;
  usuario_id?: string;
}

export interface CrearInteraccion {
  lead_id: string;
  tipo: string;
  descripcion: string;
  resultado?: string;
  siguiente_accion?: string;
  fecha_siguiente_accion?: string;
  usuario_id?: string;
}

export interface CrearDashboardPreferences {
  usuario_id: string;
  layout_type?: 'compact' | 'expanded' | 'custom';
  visible_sections?: string[];
  refresh_interval?: number;
  notification_settings?: {
    browser_notifications: boolean;
    sound_alerts: boolean;
    priority_only: boolean;
    quiet_hours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  focus_mode?: boolean;
  custom_objectives?: {
    response_time_target: number;
    daily_conversations_target: number;
    conversion_rate_target: number;
  };
  theme_preferences?: {
    color_scheme: 'light' | 'dark' | 'auto';
    compact_view: boolean;
    show_animations: boolean;
  };
}

export interface ActualizarDashboardPreferences {
  layout_type?: 'compact' | 'expanded' | 'custom';
  visible_sections?: string[];
  refresh_interval?: number;
  notification_settings?: {
    browser_notifications?: boolean;
    sound_alerts?: boolean;
    priority_only?: boolean;
    quiet_hours?: {
      enabled?: boolean;
      start?: string;
      end?: string;
    };
  };
  focus_mode?: boolean;
  custom_objectives?: {
    response_time_target?: number;
    daily_conversations_target?: number;
    conversion_rate_target?: number;
  };
  theme_preferences?: {
    color_scheme?: 'light' | 'dark' | 'auto';
    compact_view?: boolean;
    show_animations?: boolean;
  };
}

export interface CrearTask {
  usuario_id: string;
  lead_id?: string;
  conversation_id?: string;
  task_type: 'follow_up' | 'first_response' | 'scheduled_contact' | 'lead_qualification' | 'proposal_followup' | 'meeting_reminder' | 'custom';
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  is_recurring?: boolean;
  recurring_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    end_date?: string;
    days_of_week?: number[];
    day_of_month?: number;
  };
  auto_generated?: boolean;
  metadata?: Record<string, any>;
}

export interface ActualizarTask {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'snoozed';
  is_recurring?: boolean;
  recurring_pattern?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    interval?: number;
    end_date?: string;
    days_of_week?: number[];
    day_of_month?: number;
  };
  completed_at?: string;
  snoozed_until?: string;
  metadata?: Record<string, any>;
}

// =====================================================
// Tipos para configuración de mensajería
// =====================================================

export interface ConfiguracionTelegram {
  bot_token: string;
  webhook_url?: string;
  chat_id?: string;
  activo: boolean;
}

export interface ConfiguracionWhatsApp {
  phone_number_id: string;
  access_token: string;
  webhook_verify_token: string;
  business_account_id: string;
  activo: boolean;
}

export interface ConfiguracionEmail {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  activo: boolean;
}

export type ConfiguracionMensajeria = ConfiguracionTelegram | ConfiguracionWhatsApp | ConfiguracionEmail;