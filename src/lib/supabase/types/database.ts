export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      asociaciones: {
        Row: {
          id: string;
          elemento_id: string;
          sheets_id: string;
          columna: string;
          tipo: string | null;
          fecha_creacion: string | null;
          fecha_actualizacion: string | null;
        };
        Insert: {
          id?: string;
          elemento_id: string;
          sheets_id: string;
          columna: string;
          tipo?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
        };
        Update: {
          id?: string;
          elemento_id?: string;
          sheets_id?: string;
          columna?: string;
          tipo?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
        };
      };

      cache: {
        Row: {
          id: string;
          clave: string;
          valor: Json;
          tiempo_expiracion: string | null;
          fecha_creacion: string | null;
          fecha_actualizacion: string | null;
        };
        Insert: {
          id?: string;
          clave: string;
          valor: Json;
          tiempo_expiracion?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
        };
        Update: {
          id?: string;
          clave?: string;
          valor?: Json;
          tiempo_expiracion?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
        };
      };

      celdas: {
        Row: {
          id: string;
          sheet_id: string;
          fila: number;
          columna: string;
          referencia_celda: string;
          contenido: string | null;
          tipo: string | null;
          formato: Json | null;
          metadata: Json | null;
          fecha_creacion: string | null;
          fecha_actualizacion: string | null;
        };
        Insert: {
          id?: string;
          sheet_id: string;
          fila: number;
          columna: string;
          referencia_celda: string;
          contenido?: string | null;
          tipo?: string | null;
          formato?: Json | null;
          metadata?: Json | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
        };
        Update: {
          id?: string;
          sheet_id?: string;
          fila?: number;
          columna?: string;
          referencia_celda?: string;
          contenido?: string | null;
          tipo?: string | null;
          formato?: Json | null;
          metadata?: Json | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
        };
      };

      configuracion_proyecto: {
        Row: {
          id: string;
          configuracion: Json | null;
          proyecto_id: string | null;
        };
        Insert: {
          id?: string;
          configuracion?: Json | null;
          proyecto_id?: string | null;
        };
        Update: {
          id?: string;
          configuracion?: Json | null;
          proyecto_id?: string | null;
        };
      };

      diapositivas: {
        Row: {
          id: string;
          orden: number | null;
          titulo: string | null;
          configuracion: Json | null;
          slides_id: string;
          diapositiva_id: string | null;
          fecha_creacion: string | null;
          fecha_actualizacion: string | null;
          google_presentation_id: string | null;
        };
        Insert: {
          id?: string;
          orden?: number | null;
          titulo?: string | null;
          configuracion?: Json | null;
          slides_id: string;
          diapositiva_id?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
          google_presentation_id?: string | null;
        };
        Update: {
          id?: string;
          orden?: number | null;
          titulo?: string | null;
          configuracion?: Json | null;
          slides_id?: string;
          diapositiva_id?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
          google_presentation_id?: string | null;
        };
      };

      elementos: {
        Row: {
          id: string;
          diapositiva_id: string;
          elemento_id: string;
          tipo: string;
          contenido: string | null;
          posicion: Json | null;
          estilo: Json | null;
          fecha_creacion: string | null;
          fecha_actualizacion: string | null;
          celda_asociada: string | null;
          tipo_asociacion: string | null;
        };
        Insert: {
          id?: string;
          diapositiva_id: string;
          elemento_id: string;
          tipo: string;
          contenido?: string | null;
          posicion?: Json | null;
          estilo?: Json | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
          celda_asociada?: string | null;
          tipo_asociacion?: string | null;
        };
        Update: {
          id?: string;
          diapositiva_id?: string;
          elemento_id?: string;
          tipo?: string;
          contenido?: string | null;
          posicion?: Json | null;
          estilo?: Json | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
          celda_asociada?: string | null;
          tipo_asociacion?: string | null;
        };
      };

      historial_cambios: {
        Row: {
          id: string;
          tipo_cambio: string | null;
          valor_anterior: string | null;
          valor_nuevo: string | null;
          fecha_cambio: string | null;
          elemento_id: string | null;
        };
        Insert: {
          id?: string;
          tipo_cambio?: string | null;
          valor_anterior?: string | null;
          valor_nuevo?: string | null;
          fecha_cambio?: string | null;
          elemento_id?: string | null;
        };
        Update: {
          id?: string;
          tipo_cambio?: string | null;
          valor_anterior?: string | null;
          valor_nuevo?: string | null;
          fecha_cambio?: string | null;
          elemento_id?: string | null;
        };
      };

      proyectos: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          fecha_creacion: string;
          fecha_actualizacion: string;
          sheets_id: string | null;
          slides_id: string | null;
          hojastitulo: string | null;
          presentaciontitulo: string | null;
          usuario_id: string;
          modo?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string | null;
          fecha_creacion?: string;
          fecha_actualizacion?: string;
          sheets_id?: string | null;
          slides_id?: string | null;
          hojastitulo?: string | null;
          presentaciontitulo?: string | null;
          usuario_id: string;
          modo?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          descripcion?: string | null;
          fecha_creacion?: string;
          fecha_actualizacion?: string;
          sheets_id?: string | null;
          slides_id?: string | null;
          hojastitulo?: string | null;
          presentaciontitulo?: string | null;
          usuario_id?: string;
          modo?: string | null;
          metadata?: Record<string, unknown> | null;
        };
      };

      sheets: {
        Row: {
          id: string;
          proyecto_id: string;
          sheets_id: string;
          nombre: string | null;
          titulo: string | null;
          ultima_sincronizacion: string | null;
          fecha_creacion: string | null;
          fecha_actualizacion: string | null;
          google_id: string | null;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          sheets_id: string;
          nombre?: string | null;
          titulo?: string | null;
          ultima_sincronizacion?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
          google_id?: string | null;
        };
        Update: {
          id?: string;
          proyecto_id?: string;
          sheets_id?: string;
          nombre?: string | null;
          titulo?: string | null;
          ultima_sincronizacion?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
          google_id?: string | null;
        };
      };

      generacion_jobs: {
        Row: {
          id: string;
          proyecto_id: string | null;
          usuario_id: string | null;
          estado: string;
          presentation_id: string | null;
          spreadsheet_id: string | null;
          slide_template_id: string | null;
          template_type: string | null;
          column_mapping: Json | null;
          total_filas: number;
          filas_procesadas: number;
          filas_error: number;
          errores: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          proyecto_id?: string | null;
          usuario_id?: string | null;
          estado?: string;
          presentation_id?: string | null;
          spreadsheet_id?: string | null;
          slide_template_id?: string | null;
          template_type?: string | null;
          column_mapping?: Json | null;
          total_filas?: number;
          filas_procesadas?: number;
          filas_error?: number;
          errores?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          proyecto_id?: string | null;
          usuario_id?: string | null;
          estado?: string;
          presentation_id?: string | null;
          spreadsheet_id?: string | null;
          slide_template_id?: string | null;
          template_type?: string | null;
          column_mapping?: Json | null;
          total_filas?: number;
          filas_procesadas?: number;
          filas_error?: number;
          errores?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };

      generacion_job_items: {
        Row: {
          id: string;
          job_id: string | null;
          fila_index: number;
          datos_fila: Json | null;
          slide_id: string | null;
          estado: string;
          error: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          fila_index: number;
          datos_fila?: Json | null;
          slide_id?: string | null;
          estado?: string;
          error?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          fila_index?: number;
          datos_fila?: Json | null;
          slide_id?: string | null;
          estado?: string;
          error?: string | null;
          created_at?: string | null;
        };
      };

      slides: {
        Row: {
          id: string;
          proyecto_id: string;
          google_presentation_id: string;
          google_id: string | null;
          titulo: string;
          nombre: string | null;
          url: string | null;
          ultima_sincronizacion: string | null;
          fecha_creacion: string | null;
          fecha_actualizacion: string | null;
        };
        Insert: {
          id?: string;
          proyecto_id: string;
          google_presentation_id: string;
          google_id?: string | null;
          titulo: string;
          nombre?: string | null;
          url?: string | null;
          ultima_sincronizacion?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
        };
        Update: {
          id?: string;
          proyecto_id?: string;
          google_presentation_id?: string;
          google_id?: string | null;
          titulo?: string;
          nombre?: string | null;
          url?: string | null;
          ultima_sincronizacion?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
        };
      };

      usuarios: {
        Row: {
          id: string;
          email: string;
          nombre: string;
          avatar_url: string | null;
          provider: string | null;
          ultimo_acceso: string | null;
          fecha_creacion: string | null;
          fecha_actualizacion: string | null;
          auth_id: string;
        };
        Insert: {
          id?: string;
          email: string;
          nombre: string;
          avatar_url?: string | null;
          provider?: string | null;
          ultimo_acceso?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
          auth_id: string;
        };
        Update: {
          id?: string;
          email?: string;
          nombre?: string;
          avatar_url?: string | null;
          provider?: string | null;
          ultimo_acceso?: string | null;
          fecha_creacion?: string | null;
          fecha_actualizacion?: string | null;
          auth_id?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Esta es una definición parcial. 
// Se deberá completar con todas las tablas específicas del proyecto. 