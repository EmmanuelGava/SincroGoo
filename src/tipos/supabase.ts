export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      proyectos: {
        Row: {
          id: string
          usuario_id: string
          nombre: string
          descripcion: string | null
          fecha_creacion: string
          fecha_actualizacion: string
          sheets_id: string | null
          slides_id: string | null
          hojastitulo: string | null
          presentaciontitulo: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          usuario_id: string
          nombre: string
          descripcion?: string | null
          fecha_creacion?: string
          fecha_actualizacion?: string
          sheets_id?: string | null
          slides_id?: string | null
          hojastitulo?: string | null
          presentaciontitulo?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          usuario_id?: string
          nombre?: string
          descripcion?: string | null
          fecha_creacion?: string
          fecha_actualizacion?: string
          sheets_id?: string | null
          slides_id?: string | null
          hojastitulo?: string | null
          presentaciontitulo?: string | null
          metadata?: Json | null
        }
      }
      sheets: {
        Row: {
          id: string
          proyecto_id: string
          nombre: string | null
          titulo: string | null
          google_id: string | null
          url: string | null
          ultima_sincronizacion: string | null
          fecha_creacion: string
          fecha_actualizacion: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          proyecto_id: string
          nombre?: string | null
          titulo?: string | null
          google_id?: string | null
          url?: string | null
          ultima_sincronizacion?: string | null
          fecha_creacion?: string
          fecha_actualizacion?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          proyecto_id?: string
          nombre?: string | null
          titulo?: string | null
          google_id?: string | null
          url?: string | null
          ultima_sincronizacion?: string | null
          fecha_creacion?: string
          fecha_actualizacion?: string
          metadata?: Json | null
        }
      }
      slides: {
        Row: {
          id: string
          proyecto_id: string
          nombre: string | null
          titulo: string | null
          google_id: string | null
          url: string | null
          ultima_sincronizacion: string | null
          fecha_creacion: string
          fecha_actualizacion: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          proyecto_id: string
          nombre?: string | null
          titulo?: string | null
          google_id?: string | null
          url?: string | null
          ultima_sincronizacion?: string | null
          fecha_creacion?: string
          fecha_actualizacion?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          proyecto_id?: string
          nombre?: string | null
          titulo?: string | null
          google_id?: string | null
          url?: string | null
          ultima_sincronizacion?: string | null
          fecha_creacion?: string
          fecha_actualizacion?: string
          metadata?: Json | null
        }
      }
      elementos: {
        Row: {
          id: string
          slide_id: string
          tipo: string
          contenido: Json
          posicion: Json | null
          tamaño: Json | null
          estilo: Json | null
          fecha_creacion: string
          fecha_actualizacion: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          slide_id: string
          tipo: string
          contenido: Json
          posicion?: Json | null
          tamaño?: Json | null
          estilo?: Json | null
          fecha_creacion?: string
          fecha_actualizacion?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          slide_id?: string
          tipo?: string
          contenido?: Json
          posicion?: Json | null
          tamaño?: Json | null
          estilo?: Json | null
          fecha_creacion?: string
          fecha_actualizacion?: string
          metadata?: Json | null
        }
      }
      asociaciones: {
        Row: {
          id: string
          elemento_id: string
          celda_id: string
          tipo: string
          fecha_creacion: string
          fecha_actualizacion: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          elemento_id: string
          celda_id: string
          tipo: string
          fecha_creacion?: string
          fecha_actualizacion?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          elemento_id?: string
          celda_id?: string
          tipo?: string
          fecha_creacion?: string
          fecha_actualizacion?: string
          metadata?: Json | null
        }
      }
      celdas: {
        Row: {
          id: string
          sheet_id: string
          fila: number
          columna: number
          valor: string | null
          fecha_creacion: string
          fecha_actualizacion: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          sheet_id: string
          fila: number
          columna: number
          valor?: string | null
          fecha_creacion?: string
          fecha_actualizacion?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          sheet_id?: string
          fila?: number
          columna?: number
          valor?: string | null
          fecha_creacion?: string
          fecha_actualizacion?: string
          metadata?: Json | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 