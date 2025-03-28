import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Endpoint para crear funciones RPC en Supabase
export async function POST(request: Request) {
  try {
    // Verificar autenticación del usuario
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ [API Crear Función] Sin autenticación');
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Obtener datos de la solicitud
    const datos = await request.json();
    const { nombreFuncion } = datos;
    
    console.log(`🔍 [API Crear Función] Creando función: ${nombreFuncion}`);
    
    // Por seguridad, solo permitimos crear funciones específicas
    if (nombreFuncion !== 'verificar_tabla_existe') {
      return NextResponse.json(
        { error: 'No se permite crear esta función' },
        { status: 403 }
      );
    }
    
    // Obtener credenciales de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [API Crear Función] Faltan credenciales de Supabase');
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }
    
    // Crear cliente con service role key para poder ejecutar SQL arbitrario
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Implementar la creación de diferentes funciones según el parámetro
    if (nombreFuncion === 'verificar_tabla_existe') {
      // SQL para crear la función verificar_tabla_existe
      const sql = `
        CREATE OR REPLACE FUNCTION public.verificar_tabla_existe(nombre_tabla text)
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          existe boolean;
        BEGIN
          SELECT EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public' AND tablename = nombre_tabla
          ) INTO existe;
          
          RETURN existe;
        END;
        $$;
        
        -- Establecer permisos
        GRANT EXECUTE ON FUNCTION public.verificar_tabla_existe(text) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.verificar_tabla_existe(text) TO service_role;
        GRANT EXECUTE ON FUNCTION public.verificar_tabla_existe(text) TO anon;
      `;
      
      // Ejecutar el SQL para crear la función
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        // La función exec_sql podría no existir, en ese caso hay que crearla primero
        if (error.message.includes('function exec_sql') || error.code === '42883') {
          console.log('⚠️ [API Crear Función] La función exec_sql no existe, creándola primero');
          
          // SQL para crear la función exec_sql (utilidad para ejecutar SQL arbitrario)
          const createExecSql = `
            CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              EXECUTE sql;
            END;
            $$;
            
            -- Establecer permisos para exec_sql (solo authenticated y service_role)
            GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
            GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
          `;
          
          // Ejecutar SQL directo para crear la función exec_sql
          const { error: execSqlError } = await supabase.rpc('exec_sql', { sql: createExecSql });
          
          if (execSqlError) {
            // Si sigue fallando, intentamos el último recurso: ejecutar SQL directo
            console.error('❌ [API Crear Función] No se pudo crear la función exec_sql:', execSqlError);
            
            try {
              // Usar la API REST de Supabase con service_role para ejecutar SQL
              const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'apikey': supabaseServiceKey
                },
                body: JSON.stringify({ sql })
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error al ejecutar SQL: ${JSON.stringify(errorData)}`);
              }
              
              console.log('✅ [API Crear Función] Función verificar_tabla_existe creada mediante API REST');
              return NextResponse.json({
                mensaje: `Función ${nombreFuncion} creada correctamente mediante API REST`
              });
            } catch (restError: any) {
              console.error('❌ [API Crear Función] Error al usar API REST:', restError);
              return NextResponse.json(
                { error: `No se pudo crear la función: ${restError.message}` },
                { status: 500 }
              );
            }
          }
          
          // Si se creó exec_sql correctamente, intentamos crear verificar_tabla_existe
          const { error: retryError } = await supabase.rpc('exec_sql', { sql });
          
          if (retryError) {
            console.error('❌ [API Crear Función] Error al crear verificar_tabla_existe tras crear exec_sql:', retryError);
            return NextResponse.json(
              { error: `No se pudo crear la función: ${retryError.message}` },
              { status: 500 }
            );
          }
        } else {
          console.error('❌ [API Crear Función] Error al crear función:', error);
          return NextResponse.json(
            { error: `No se pudo crear la función: ${error.message}` },
            { status: 500 }
          );
        }
      }
      
      console.log('✅ [API Crear Función] Función verificar_tabla_existe creada correctamente');
      return NextResponse.json({
        mensaje: `Función ${nombreFuncion} creada correctamente`
      });
    }
    
    // Si llegamos aquí es porque se solicitó crear una función no implementada
    return NextResponse.json(
      { error: 'Función no implementada' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ [API Crear Función] Error general:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    mensaje: 'Endpoint para crear funciones RPC en Supabase',
    funciones_disponibles: ['verificar_tabla_existe']
  });
} 