export interface Lead {
  id: string;
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
  ultima_interaccion?: string;
  asignado_a?: string;
  creado_por?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  ultimo_mensaje?: string;
  fecha_ultimo_mensaje?: string;
} 