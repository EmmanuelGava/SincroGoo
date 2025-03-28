/**
 * Tipos para la base de datos de Supabase
 * Define la estructura de tablas y relaciones
 */

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
          titulo: string
          descripcion: string | null
          google_id: string | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          usuario_id: string
          titulo: string
          descripcion?: string | null
          google_id?: string | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          titulo?: string
          descripcion?: string | null
          google_id?: string | null
          creado_en?: string
          actualizado_en?: string
        }
      }
      sheets: {
        Row: {
          id: string
          proyecto_id: string
          google_id: string | null
          nombre: string
          metadata: Json | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          google_id?: string | null
          nombre: string
          metadata?: Json | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          google_id?: string | null
          nombre?: string
          metadata?: Json | null
          creado_en?: string
          actualizado_en?: string
        }
      }
      slides: {
        Row: {
          id: string
          proyecto_id: string
          google_id: string | null
          nombre: string
          metadata: Json | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          google_id?: string | null
          nombre: string
          metadata?: Json | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          google_id?: string | null
          nombre?: string
          metadata?: Json | null
          creado_en?: string
          actualizado_en?: string
        }
      }
      celdas: {
        Row: {
          id: string
          sheet_id: string
          celda_id: string
          valor: string | null
          formato: Json | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          sheet_id: string
          celda_id: string
          valor?: string | null
          formato?: Json | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          sheet_id?: string
          celda_id?: string
          valor?: string | null
          formato?: Json | null
          creado_en?: string
          actualizado_en?: string
        }
      }
      diapositivas: {
        Row: {
          id: string
          slide_id: string
          diapositiva_id: string
          titulo: string | null
          orden: number
          metadata: Json | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          slide_id: string
          diapositiva_id: string
          titulo?: string | null
          orden: number
          metadata?: Json | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          slide_id?: string
          diapositiva_id?: string
          titulo?: string | null
          orden?: number
          metadata?: Json | null
          creado_en?: string
          actualizado_en?: string
        }
      }
      elementos: {
        Row: {
          id: string
          diapositiva_id: string
          tipo: string
          contenido: string | null
          posicion: Json | null
          estilo: Json | null
          metadata: Json | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          diapositiva_id: string
          tipo: string
          contenido?: string | null
          posicion?: Json | null
          estilo?: Json | null
          metadata?: Json | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          diapositiva_id?: string
          tipo?: string
          contenido?: string | null
          posicion?: Json | null
          estilo?: Json | null
          metadata?: Json | null
          creado_en?: string
          actualizado_en?: string
        }
      }
      asociaciones: {
        Row: {
          id: string
          elemento_id: string
          sheets_id: string
          columna: string | null
          tipo: string
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          elemento_id: string
          sheets_id: string
          columna?: string | null
          tipo: string
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          elemento_id?: string
          sheets_id?: string
          columna?: string | null
          tipo?: string
          creado_en?: string
          actualizado_en?: string
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
