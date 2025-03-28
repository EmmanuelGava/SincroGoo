// Interfaces para los datos de Supabase
export interface Sheet {
  id?: string
  proyecto_id: string
  sheets_id: string
  titulo: string
  nombre?: string | null
  google_id?: string | null
  url?: string | null
  metadata?: Record<string, any>
  fecha_creacion?: string
  fecha_actualizacion?: string
}

export interface Slide {
  id?: string
  proyecto_id: string
  google_presentation_id: string
  titulo: string
  nombre?: string | null
  url?: string | null
  google_id?: string | null
  fecha_creacion?: string
  fecha_actualizacion?: string
}

export interface Diapositiva {
  id?: string
  slides_id: string
  titulo?: string | null
  orden?: number
  diapositiva_id?: string | null
  google_presentation_id?: string | null
  configuracion?: Record<string, any>
  fecha_creacion?: string
  fecha_actualizacion?: string
  thumbnail_url?: string | null
}

export interface Elemento {
  id?: string
  diapositiva_id: string
  elemento_id: string
  tipo: string
  contenido?: string | null
  posicion?: Record<string, any>
  estilo?: Record<string, any>
  celda_asociada?: string | null
  tipo_asociacion?: string | null
  fecha_creacion?: string
  fecha_actualizacion?: string
  columnaAsociada?: string
}

export interface Asociacion {
  id?: string
  elemento_id: string
  sheets_id: string
  columna: string
  tipo: string
}

export interface Celda {
  id?: string
  sheet_id: string
  fila: number
  columna: string
  referencia_celda: string
  contenido?: string
  tipo?: 'texto' | 'numero' | 'formula' | 'fecha' | 'imagen'
  formato?: Record<string, any>
  metadata?: Record<string, any>
}

export interface Proyecto {
  id?: string
  userid?: string
  usuario_id?: string
  nombre: string
  descripcion?: string
  fecha_creacion?: string
  fecha_actualizacion?: string
  sheets_id?: string
  slides_id?: string
  hojastitulo?: string
  presentaciontitulo?: string
}
