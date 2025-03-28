export interface Proyecto {
  id?: string;
  userid: string; // ID de usuario como texto (para consultas en Supabase)
  usuario_id?: string; // ID de usuario como UUID (para compatibilidad con versiones anteriores)
  nombre: string;
  titulo?: string; // Alias de nombre para compatibilidad
  descripcion: string;
  fecha_creacion: string;
  sheets_id?: string;
  slides_id?: string;
  hojastitulo?: string;
  presentaciontitulo?: string;
  fecha_actualizacion?: string;
} 