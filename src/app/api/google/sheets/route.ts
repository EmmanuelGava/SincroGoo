import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import { SheetsService } from '@/servicios/google/sheets';

export async function GET(request: NextRequest) {
  console.log('🎯 [API Sheets] Recibiendo petición GET');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('🔐 [API Sheets] Estado de sesión:', {
      haySession: !!session,
      hayToken: !!session?.accessToken
    });

    if (!session?.accessToken) {
      console.error('❌ [API Sheets] No hay token de acceso');
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const spreadsheetId = searchParams.get('spreadsheetId');

    console.log('🔍 [API Sheets] Parámetros:', { action, spreadsheetId });

    if (!action || !spreadsheetId) {
      console.error('❌ [API Sheets] Faltan parámetros requeridos');
      return NextResponse.json(
        { exito: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    const sheetsService = SheetsService.getInstance(session.accessToken);

    if (action === 'getData') {
      console.log('📊 [API Sheets] Obteniendo datos de hoja:', spreadsheetId);
      const [datosSettled, metaSettled] = await Promise.allSettled([
        sheetsService.obtenerDatosHoja(spreadsheetId),
        sheetsService.obtenerHojaCalculo(spreadsheetId)
      ]);
      const resultadoDatos = datosSettled.status === 'fulfilled' ? datosSettled.value : null;
      const resultadoMeta = metaSettled.status === 'fulfilled' ? metaSettled.value : null;
      if (metaSettled.status === 'rejected') {
        console.warn('⚠️ [API Sheets] obtenerHojaCalculo falló (título opcional):', metaSettled.reason?.message);
      }
      console.log('✅ [API Sheets] Resultado:', {
        exito: resultadoDatos?.exito,
        hayError: !!resultadoDatos?.error,
        hayDatos: !!resultadoDatos?.datos
      });

      if (!resultadoDatos?.exito) {
        return NextResponse.json(
          { exito: false, error: resultadoDatos?.error || 'Error al obtener datos' },
          { status: resultadoDatos?.codigo || 500 }
        );
      }

      const titulo = resultadoMeta?.exito && resultadoMeta?.datos ? resultadoMeta.datos.titulo : undefined;
      return NextResponse.json({
        ...resultadoDatos,
        datos: {
          ...resultadoDatos.datos,
          ...(titulo && { titulo })
        }
      });
    }

    console.error('❌ [API Sheets] Acción no soportada:', action);
    return NextResponse.json(
      { exito: false, error: 'Acción no soportada' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ [API Sheets] Error en el servidor:', error);
    return NextResponse.json(
      { 
        exito: false, 
        error: error instanceof Error ? error.message : 'Error del servidor',
        detalles: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('🎯 [API Sheets] Recibiendo petición POST');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('🔐 [API Sheets] Estado de sesión:', {
      haySession: !!session,
      hayToken: !!session?.accessToken
    });

    if (!session?.accessToken) {
      console.error('❌ [API Sheets] No hay token de acceso');
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 [API Sheets] Cuerpo de la petición:', body);

    const { spreadsheetId, range, valores } = body;

    if (!spreadsheetId || !range || !valores) {
      console.error('❌ [API Sheets] Faltan datos requeridos en el cuerpo');
      return NextResponse.json(
        { exito: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const sheetsService = SheetsService.getInstance(session.accessToken);
    console.log('🔄 [API Sheets] Actualizando hoja:', { spreadsheetId, range });
    
    const resultado = await sheetsService.actualizarRango(spreadsheetId, range, valores);
    console.log('✅ [API Sheets] Resultado:', {
      exito: resultado.exito,
      hayError: !!resultado.error,
      hayDatos: !!resultado.datos
    });

    if (!resultado.exito) {
      return NextResponse.json(
        { exito: false, error: resultado.error },
        { status: resultado.codigo || 500 }
      );
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('❌ [API Sheets] Error en el servidor:', error);
    return NextResponse.json(
      { 
        exito: false, 
        error: error instanceof Error ? error.message : 'Error del servidor',
        detalles: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 