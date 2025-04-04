export interface Proyecto {
  id: string;
  usuario_id: string; // ID de usuario en la base de datos
  nombre: string; // Nombre del proyecto (antes titulo)
  descripcion: string;
  fecha_creacion: string; // Fecha de creación
  fecha_actualizacion: string; // Fecha de actualización
  sheets_id: string | null; // ID de la hoja de cálculo asociada
  slides_id: string | null; // ID de la presentación asociada
  hojastitulo: string | null; // Título de la hoja de cálculo
  presentaciontitulo: string | null; // Título de la presentación
} 