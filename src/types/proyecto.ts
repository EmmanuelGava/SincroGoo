export interface Proyecto {
  id: string
  usuario_id: string
  nombre: string
  descripcion: string
  fecha_creacion: string
  fecha_actualizacion: string
  sheets_id: string | null
  slides_id: string | null
  hojastitulo: string | null
  presentaciontitulo: string | null
} 