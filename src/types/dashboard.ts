// Dashboard Types - Tipos TypeScript para el dashboard mejorado
// Fecha: 2025-01-16

import { Database } from '../tipos/supabase';

// =====================================================
// Tipos base del dashboard
// =====================================================

export type TimeRange = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';

export type Platform = 'whatsapp' | 'telegram' | 'email';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'snoozed';

export type TaskType = 'follow_up' | 'first_response' | 'scheduled_contact' | 'lead_qualification' | 'proposal_followup' | 'meeting_reminder' | 'custom';

export type LayoutType = 'compact' | 'expanded' | 'custom';

export type MetricType = 'overview_metrics' | 'platform_breakdown' | 'conversation_metrics' | 'response_time_metrics' | 'conversion_metrics' | 'time_series_data';

// =====================================================
// Interfaces para preferencias del dashboard
// =====================================================

export interface NotificationSettings {
  browser_notifications: boolean;
  sound_alerts: boolean;
  priority_only: boolean;
  quiet_hours: {
    enabled: boolean;
    start: string; // formato HH:MM
    end: string;   // formato HH:MM
  };
}

export interface CustomObjectives {
  response_time_target: number; // en segundos
  daily_conversations_target: number;
  conversion_rate_target: number; // porcentaje
}

export interface ThemePreferences {
  color_scheme: 'light' | 'dark' | 'auto';
  compact_view: boolean;
  show_animations: boolean;
}

export interface DashboardPreferences {
  id: string;
  usuario_id: string;
  layout_type: LayoutType;
  visible_sections: string[];
  refresh_interval: number;
  notification_settings: NotificationSettings;
  focus_mode: boolean;
  custom_objectives: CustomObjectives;
  theme_preferences: ThemePreferences;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Interfaces para tareas
// =====================================================

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number; // cada X días/semanas/meses
  end_date?: string; // fecha límite para la recurrencia
  days_of_week?: number[]; // para frecuencia semanal (0=domingo, 1=lunes, etc.)
  day_of_month?: number; // para frecuencia mensual
}

export interface TaskMetadata {
  lead_name?: string;
  conversation_preview?: string;
  estimated_duration?: number; // en minutos
  tags?: string[];
  external_id?: string; // ID de sistema externo
  [key: string]: any; // permite metadata adicional
}

export interface Task {
  id: string;
  usuario_id: string;
  lead_id?: string;
  conversation_id?: string;
  task_type: TaskType;
  title: string;
  description?: string;
  due_date?: string;
  priority: Priority;
  status: TaskStatus;
  is_recurring: boolean;
  recurring_pattern?: RecurringPattern;
  completed_at?: string;
  snoozed_until?: string;
  auto_generated: boolean;
  metadata: TaskMetadata;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Interfaces para métricas del dashboard
// =====================================================

export interface PlatformMetrics {
  platform: Platform;
  messageCount: number;
  responseRate: number;
  averageResponseTime: number; // en segundos
  connectionStatus: 'connected' | 'disconnected' | 'error';
  activeConversations: number;
  pendingResponses: number;
  conversionRate: number;
}

export interface MetricTrend {
  metric: string;
  current: number;
  previous: number;
  change: number; // porcentaje de cambio
  trend: 'up' | 'down' | 'stable';
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface LiveMetrics {
  activeConversations: number;
  pendingResponses: number;
  averageResponseTime: number;
  conversionRate: number;
  platformBreakdown: PlatformMetrics[];
  trends: MetricTrend[];
  lastUpdated: string;
}

export interface DashboardOverview {
  activeConversations: number;
  pendingResponses: number;
  averageResponseTime: number;
  conversionRate: number;
  totalLeads: number;
  newLeadsToday: number;
  responseTimeTarget: number;
  targetAchievement: number; // porcentaje
}

// =====================================================
// Interfaces para conversaciones prioritarias
// =====================================================

export interface PriorityConversation {
  id: string;
  leadId: string;
  leadName: string;
  platform: Platform;
  lastMessage: string;
  lastMessageAt: string;
  timeSinceLastResponse: number; // en minutos
  priority: Priority;
  isMarkedImportant: boolean;
  leadValue: number;
  unreadCount: number;
  tags: string[];
  status: string;
  assignedTo?: string;
}

// =====================================================
// Interfaces para alertas y notificaciones
// =====================================================

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  actionable: boolean;
  action?: {
    label: string;
    url?: string;
    callback?: () => void;
  };
  priority: Priority;
  timestamp: string;
  dismissed: boolean;
}

export interface NotificationEvent {
  id: string;
  type: 'new_message' | 'task_due' | 'lead_update' | 'system_alert';
  title: string;
  message: string;
  data: any;
  timestamp: string;
  read: boolean;
}

// =====================================================
// Interfaces para cache de métricas
// =====================================================

export interface DashboardMetricsCache {
  id: string;
  usuario_id: string;
  metric_type: MetricType;
  time_range: TimeRange;
  filters: Record<string, any>;
  data: any;
  expires_at: string;
  created_at: string;
}

// =====================================================
// Interfaces para APIs del dashboard
// =====================================================

export interface DashboardMetricsRequest {
  timeRange: TimeRange;
  platforms?: Platform[];
  includeComparison?: boolean;
  customRange?: {
    start: string;
    end: string;
  };
}

export interface DashboardMetricsResponse {
  overview: DashboardOverview;
  platformBreakdown: PlatformMetrics[];
  timeSeriesData: TimeSeriesPoint[];
  alerts: Alert[];
  trends: MetricTrend[];
  lastUpdated: string;
}

export interface PriorityConversationsRequest {
  limit?: number;
  offset?: number;
  platforms?: Platform[];
  priorityFilter?: Priority[];
  includeCompleted?: boolean;
}

export interface PriorityConversationsResponse {
  conversations: PriorityConversation[];
  totalCount: number;
  hasMore: boolean;
  filters: {
    platforms: Platform[];
    priorities: Priority[];
  };
}

export interface TasksRequest {
  status?: TaskStatus[];
  priority?: Priority[];
  taskType?: TaskType[];
  dueDateRange?: {
    start?: string;
    end?: string;
  };
  limit?: number;
  offset?: number;
}

export interface TasksResponse {
  tasks: Task[];
  overdueTasks: Task[];
  upcomingTasks: Task[];
  totalCount: number;
  hasMore: boolean;
  summary: {
    pending: number;
    overdue: number;
    completed_today: number;
  };
}

// =====================================================
// Interfaces para componentes del dashboard
// =====================================================

export interface DashboardLayoutProps {
  user: any; // Tipo del usuario de NextAuth
  preferences: DashboardPreferences;
  children: React.ReactNode;
}

export interface MetricsOverviewProps {
  timeRange: TimeRange;
  realTimeData: LiveMetrics;
  comparisonEnabled: boolean;
  onTimeRangeChange: (range: TimeRange) => void;
}

export interface PriorityConversationsProps {
  conversations: PriorityConversation[];
  loading: boolean;
  onConversationClick: (conversationId: string) => void;
  onMarkImportant: (conversationId: string, important: boolean) => void;
  onRefresh: () => void;
}

export interface TasksPanelProps {
  tasks: Task[];
  loading: boolean;
  onTaskComplete: (taskId: string) => void;
  onTaskSnooze: (taskId: string, snoozeTime: number) => void;
  onTaskCreate: (task: Partial<Task>) => void;
  onRefresh: () => void;
}

export interface NotificationCenterProps {
  notifications: NotificationEvent[];
  alerts: Alert[];
  onNotificationRead: (notificationId: string) => void;
  onAlertDismiss: (alertId: string) => void;
}

// =====================================================
// Interfaces para hooks personalizados
// =====================================================

export interface UseDashboardMetricsOptions {
  timeRange: TimeRange;
  refreshInterval?: number;
  enabled?: boolean;
  platforms?: Platform[];
}

export interface UseDashboardMetricsReturn {
  data: DashboardMetricsResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  lastUpdated: string | null;
}

export interface UseRealtimeSubscriptionOptions {
  channel: string;
  event: string;
  enabled?: boolean;
  onUpdate?: (payload: any) => void;
}

export interface UseTasksOptions {
  status?: TaskStatus[];
  priority?: Priority[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseTasksReturn {
  tasks: Task[];
  overdueTasks: Task[];
  upcomingTasks: Task[];
  loading: boolean;
  error: Error | null;
  createTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  snoozeTask: (taskId: string, snoozeTime: number) => Promise<void>;
  refetch: () => void;
}

// =====================================================
// Tipos para errores específicos del dashboard
// =====================================================

export interface DashboardError {
  type: 'AUTH_ERROR' | 'DATA_ERROR' | 'REALTIME_ERROR' | 'VALIDATION_ERROR';
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: string;
}

export interface AuthError extends DashboardError {
  type: 'AUTH_ERROR';
  code: 'TOKEN_EXPIRED' | 'INVALID_SESSION' | 'INSUFFICIENT_PERMISSIONS';
  redirectTo?: string;
}

export interface DataError extends DashboardError {
  type: 'DATA_ERROR';
  code: 'NETWORK_ERROR' | 'SERVER_ERROR' | 'TIMEOUT' | 'NOT_FOUND';
}

export interface RealtimeError extends DashboardError {
  type: 'REALTIME_ERROR';
  code: 'CONNECTION_LOST' | 'SUBSCRIPTION_FAILED' | 'CHANNEL_ERROR';
  affectedChannels: string[];
}

// =====================================================
// Tipos de utilidad
// =====================================================

export type DashboardSection = 'metrics' | 'conversations' | 'tasks' | 'notifications' | 'analytics';

export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  order: SortOrder;
}

export interface FilterConfig {
  platforms?: Platform[];
  priorities?: Priority[];
  status?: TaskStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
}

// =====================================================
// Extensiones de tipos existentes
// =====================================================

// Extender el tipo de Usuario existente con campos del dashboard
export interface DashboardUser {
  id: string;
  email: string;
  nombre: string;
  avatar_url?: string;
  preferences?: DashboardPreferences;
  lastActivity?: string;
  timezone?: string;
}

// Extender el tipo de Lead existente con información del dashboard
export interface DashboardLead {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  estado_id: string;
  valor_potencial: number;
  ultima_interaccion: string;
  // Campos adicionales para el dashboard
  priority: Priority;
  unreadMessages: number;
  lastMessageAt?: string;
  responseTime?: number;
  tags: string[];
  assignedTo?: string;
}

// Extender el tipo de Conversación existente
export interface DashboardConversation {
  id: string;
  lead_id: string;
  usuario_id: string;
  servicio_origen: string;
  tipo: 'entrante' | 'saliente';
  fecha_mensaje: string;
  // Campos adicionales para el dashboard
  unreadCount: number;
  lastMessage?: string;
  priority: Priority;
  isImportant: boolean;
  responseTime?: number;
  platform: Platform;
}