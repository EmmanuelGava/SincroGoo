import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Endpoint para verificar si una tabla existe
export async function POST(request: Request) {
  try {
    // Para seguridad adicional, verificar la autenticación
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ [API RPC] Sin autenticación');
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Obtener los datos de la petición
    const datos = await request.json();
    const nombreTabla = datos.nombre_tabla;
    
    console.log(`🔍 [API RPC] Verificando si existe la tabla: ${nombreTabla}`);
    
    if (!nombreTabla) {
      return NextResponse.json(
        { error: 'Es necesario proporcionar el nombre de la tabla' },
        { status: 400 }
      );
    }
    
    // Obtener credenciales de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [API RPC] Faltan credenciales de Supabase');
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }
    
    // Crear cliente con service role key para poder ejecutar SQL arbitrario
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Ejecutar consulta SQL segura para verificar si la tabla existe
    const { data, error } = await supabase.rpc('verificar_tabla_existe', {
      nombre_tabla: nombreTabla
    });
    
    if (error) {
      // Si la función RPC no existe, intentar con SQL directo
      console.log('⚠️ [API RPC] La función RPC no existe, intentando con SQL directo');
      
      // Consulta SQL segura para verificar la existencia de la tabla
      const { data: sqlData, error: sqlError } = await supabase.from('pg_tables')
        .select('*')
        .eq('tablename', nombreTabla)
        .eq('schemaname', 'public')
        .single();
      
      if (sqlError) {
        console.error('❌ [API RPC] Error al consultar pg_tables:', sqlError);
        
        // Último recurso: intentar una consulta SELECT a la tabla
        try {
          const { count, error: countError } = await supabase
            .from(nombreTabla)
            .select('*', { count: 'exact', head: true });
          
          if (countError) {
            if (countError.code === '42P01') { // 42P01 es el código para "tabla no existe"
              console.log(`❌ [API RPC] La tabla ${nombreTabla} no existe`);
              return NextResponse.json(false);
            } else {
              console.log(`⚠️ [API RPC] Error al contar registros, pero la tabla probablemente existe: ${countError.message}`);
              return NextResponse.json(true);
            }
          }
          
          console.log(`✅ [API RPC] La tabla ${nombreTabla} existe`);
          return NextResponse.json(true);
        } catch (finalError) {
          console.error('❌ [API RPC] Error final al verificar tabla:', finalError);
          return NextResponse.json(false);
        }
      }
      
      const tablaExiste = !!sqlData;
      console.log(`${tablaExiste ? '✅' : '❌'} [API RPC] La tabla ${nombreTabla} ${tablaExiste ? 'existe' : 'no existe'}`);
      return NextResponse.json(tablaExiste);
    }
    
    console.log(`${data ? '✅' : '❌'} [API RPC] La tabla ${nombreTabla} ${data ? 'existe' : 'no existe'}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [API RPC] Error al procesar la solicitud:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 