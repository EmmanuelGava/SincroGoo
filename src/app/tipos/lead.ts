import { LeadScore } from '@/lib/crm/leadKanbanFilters';
import type { ProximaTareaLead } from '@/lib/crm/leadTaskBadge';

export type { LeadScore };

export interface Lead {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  estado_id: string;
  contacto_id?: string | null;
  probabilidad_cierre?: number;
  tags?: string[];
  contacto_etiquetas?: string[];
  valor_potencial?: number | null;
  fecha_cierre?: string | null;
  score?: LeadScore | null;
  origen?: string;
  notas?: string;
  ultima_interaccion?: string;
  asignado_a?: string;
  creado_por?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  ultimo_mensaje?: string;
  fecha_ultimo_mensaje?: string;
  conversacion_id?: string | null;
  unread_count?: number;
  /** Canal de la conversación vinculada (whatsapp / telegram / email / …). */
  canal?: string | null;
  /** Posición manual dentro de la columna del Kanban. */
  orden?: number;
  esperando_seguimiento?: boolean;
  seguimiento_desde?: string | null;
  seguimiento_horas?: number | null;
  proxima_tarea?: ProximaTareaLead | null;
  ultimo_mov_etapa?: { texto: string; fecha: string } | null;
} 