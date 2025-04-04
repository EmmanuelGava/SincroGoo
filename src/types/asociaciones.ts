// Interfaz para representar la estructura de datos de las asociaciones en Supabase
export interface AsociacionElementoSupabase {
  id?: string;                  // ID único en Supabase (generado automáticamente)
  id_elemento: string;          // ID del elemento (en el código se mapea a elemento_id)
  columna: string;              // Nombre de la columna asociada
  tipo_asociacion: string;      // 'texto', etc. (en la BD se guarda como 'tipo')
  id_hoja?: string;             // ID de la hoja de cálculo (en la BD se guarda como 'sheets_id')
  id_fila?: string;             // ID de la fila en la hoja
  fecha_creacion?: string;      // Fecha de creación
  fecha_actualizacion?: string; // Fecha de actualización
} 

// Interfaz que representa la estructura real en la base de datos
export interface AsociacionElementoDB {
  id?: string;                  // ID único en Supabase (generado automáticamente)
  elemento_id: string;          // ID del elemento
  columna: string;              // Nombre de la columna asociada
  tipo: string;                 // 'texto', etc.
  sheets_id: string;            // ID de la hoja de cálculo
  fecha_creacion?: string;      // Fecha de creación
  fecha_actualizacion?: string; // Fecha de actualización
}

// Interfaz para el resultado de guardarAsociacionesElementos
export interface ResultadoGuardarAsociaciones {
  exito: boolean;
  mensaje: string;
  idsGuardados?: string[];
  advertencia?: string;  // Mensaje de advertencia para casos especiales
} 