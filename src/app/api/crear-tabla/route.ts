import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Endpoint para crear tablas en Supabase de forma segura
export async function POST(request: Request) {
  try {
    // Verificar autenticación del usuario
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ [API] Sin autenticación');
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Obtener datos de la solicitud
    const datos = await request.json();
    
    console.log('📥 [API] POST /api/crear-tabla');
    console.log('- Datos recibidos:', { tabla: datos.tabla, definicion: datos.definicion ? 'SQL presente (omitido por seguridad)' : 'Sin definición SQL' });
    
    // Verificar datos obligatorios
    if (!datos.tabla || !datos.definicion) {
      console.error('❌ [API] Faltan datos obligatorios');
      return NextResponse.json(
        { error: 'Faltan datos obligatorios (tabla, definicion)' },
        { status: 400 }
      );
    }
    
    // Validar nombre de tabla (solo permitir nombres simples alfanuméricos)
    if (!/^[a-z0-9_]+$/.test(datos.tabla)) {
      console.error('❌ [API] Nombre de tabla inválido');
      return NextResponse.json(
        { error: 'Nombre de tabla inválido (solo se permiten letras minúsculas, números y guiones bajos)' },
        { status: 400 }
      );
    }
    
    // Validar que la definición SQL parezca segura
    // Esta es una verificación básica, en un entorno de producción se necesitaría más validación
    if (
      datos.definicion.toLowerCase().includes('drop table') ||
      datos.definicion.toLowerCase().includes('truncate') ||
      datos.definicion.toLowerCase().includes('delete from') ||
      datos.definicion.toLowerCase().includes('update ') ||
      datos.definicion.toLowerCase().includes('insert into') ||
      !datos.definicion.toLowerCase().includes('create table')
    ) {
      console.error('❌ [API] Definición SQL potencialmente peligrosa');
      return NextResponse.json(
        { error: 'La definición SQL parece contener operaciones no permitidas' },
        { status: 400 }
      );
    }
    
    // Obtener credenciales de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ [API] Credenciales de Supabase no configuradas');
      return NextResponse.json(
        { error: 'Configuración de Supabase incompleta en el servidor' },
        { status: 500 }
      );
    }
    
    // Crear cliente de Supabase con service role para tener permisos elevados
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar primero si la tabla ya existe
    console.log(`🔍 [API] Verificando si la tabla '${datos.tabla}' ya existe...`);
    
    try {
      const { data: existeData, error: existeError } = await supabase
        .from(datos.tabla)
        .select('id')
        .limit(1);
      
      // Si no hay error, la tabla ya existe
      if (!existeError) {
        console.log(`✅ [API] La tabla '${datos.tabla}' ya existe`);
        return NextResponse.json({
          exito: true,
          mensaje: `La tabla '${datos.tabla}' ya existe`,
          yaExistia: true
        });
      }
      
      // Si el error no es porque la tabla no existe, algo más está mal
      if (existeError && existeError.code !== '42P01') {
        console.error(`❌ [API] Error al verificar tabla '${datos.tabla}':`, existeError);
        return NextResponse.json(
          { error: `Error al verificar tabla: ${existeError.message}` },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error(`❌ [API] Error inesperado al verificar tabla '${datos.tabla}':`, error);
      // Continuamos con la creación de la tabla de todos modos
    }
    
    // Ejecutar SQL para crear la tabla
    console.log(`🔍 [API] Creando tabla '${datos.tabla}'...`);
    
    try {
      // Intentar usar RPC primero si está disponible
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'ejecutar_sql',
        { sql: datos.definicion }
      );
      
      if (rpcError) {
        console.error(`❌ [API] Error RPC al crear tabla '${datos.tabla}':`, rpcError);
        console.log('🔍 [API] Intentando método alternativo...');
        
        // Si falla RPC, intentar con la API de REST de Supabase para SQL directo
        const { data: sqlData, error: sqlError } = await supabase
          .from('_ejecutar_sql')
          .insert({ sql: datos.definicion })
          .select('resultado');
        
        if (sqlError) {
          console.error(`❌ [API] Error SQL al crear tabla '${datos.tabla}':`, sqlError);
          return NextResponse.json(
            { error: `Error al crear tabla: ${sqlError.message}` },
            { status: 500 }
          );
        }
        
        console.log(`✅ [API] Tabla '${datos.tabla}' creada mediante SQL directo:`, sqlData);
      } else {
        console.log(`✅ [API] Tabla '${datos.tabla}' creada mediante RPC:`, rpcData);
      }
    } catch (error) {
      console.error(`❌ [API] Error general al crear tabla '${datos.tabla}':`, error);
      return NextResponse.json(
        { error: `Error al crear tabla: ${error instanceof Error ? error.message : 'Error desconocido'}` },
        { status: 500 }
      );
    }
    
    // Verificar que la tabla se haya creado correctamente
    console.log(`🔍 [API] Verificando que la tabla '${datos.tabla}' se haya creado...`);
    
    const { data: verificacionData, error: verificacionError } = await supabase
      .from(datos.tabla)
      .select('id')
      .limit(1);
    
    if (verificacionError) {
      console.error(`❌ [API] Error al verificar creación de tabla '${datos.tabla}':`, verificacionError);
      return NextResponse.json({
        exito: false, 
        advertencia: `La tabla parecía haberse creado pero no se puede verificar: ${verificacionError.message}`
      });
    }
    
    console.log(`✅ [API] Tabla '${datos.tabla}' creada y verificada correctamente`);
    
    return NextResponse.json({
      exito: true,
      mensaje: `Tabla '${datos.tabla}' creada correctamente`
    });
  } catch (error) {
    console.error('❌ [API] Error general al procesar la solicitud:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 