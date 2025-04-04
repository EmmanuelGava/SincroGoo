import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase local
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Implementación local del servicio de sincronización
const syncService = {
  async initializeDatabase() {
    try {
      // Intentar una operación simple para verificar la conexión
      const { error } = await supabase.from('proyectos').select('count').limit(1);
      
      return {
        message: error ? 'Error al conectar con la base de datos' : 'Conexión exitosa',
        error: error ? error.message : null,
        status: error ? 'error' : 'success'
      };
    } catch (error) {
      console.error('Error al inicializar la base de datos:', error);
      return {
        message: 'Error al inicializar la base de datos',
        error: error instanceof Error ? error.message : 'Error desconocido',
        status: 'error'
      };
    }
  }
};

/**
 * Inicializar base de datos
 * @route GET /api/supabase/sync
 */
export async function GET() {
  try {
    const result = await syncService.initializeDatabase();
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error al inicializar base de datos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al inicializar base de datos' },
      { status: 500 }
    );
  }
} 