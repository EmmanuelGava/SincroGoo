import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import { ExcelToSheetsService } from '@/app/servicios/google/conversions/excel-to-sheets/ExcelToSheetsService';
import { HojaExcel } from '@/app/servicios/google/conversions/excel-to-sheets/types';

export async function POST(request: NextRequest) {
  console.log('🎯 [API Excel to Sheets] Recibiendo petición POST');
  
  try {
    // 1. Validar sesión y token
    const session = await getServerSession(authOptions);
    console.log('🔐 [API Excel to Sheets] Estado de sesión:', {
      haySession: !!session,
      hayToken: !!session?.accessToken
    });

    if (!session?.accessToken) {
      console.error('❌ [API Excel to Sheets] No hay token de acceso');
      return NextResponse.json({ 
        exito: false, 
        error: 'No autorizado' 
      }, { status: 401 });
    }

    // 2. Obtener y validar FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const nombreDocumento = formData.get('nombreDocumento') as string;
    const documentoExistenteId = formData.get('documentoExistenteId') as string | undefined;
    const hojasJson = formData.get('hojas') as string;

    if (!file || !nombreDocumento || !hojasJson) {
      console.error('❌ [API Excel to Sheets] Faltan datos requeridos:', {
        tieneArchivo: !!file,
        tieneNombre: !!nombreDocumento,
        tieneHojas: !!hojasJson
      });
      return NextResponse.json({
        exito: false,
        error: 'Se requiere archivo Excel, nombre del documento y configuración de hojas'
      }, { status: 400 });
    }

    const hojas = JSON.parse(hojasJson) as HojaExcel[];
    console.log('📦 [API Excel to Sheets] Datos recibidos:', {
      nombreArchivo: file.name,
      nombreDocumento,
      documentoExistenteId,
      cantidadHojas: hojas.length
    });

    // 3. Inicializar servicio
    const service = ExcelToSheetsService.getInstance(session.accessToken);

    // 4. Procesar archivo
    const resultado = await service.sincronizarConGoogleSheets(
      hojas,
      file,
      {
        nombreDocumento,
        documentoExistenteId
      }
    );

    console.log('✅ [API Excel to Sheets] Resultado:', {
      exito: resultado.exito,
      hayError: !!resultado.error,
      hayDatos: !!resultado.datos,
      error: resultado.error,
      codigo: resultado.codigo
    });

    return NextResponse.json(resultado);

  } catch (error) {
    console.error('❌ [API Excel to Sheets] Error en el servidor:', error);
    return NextResponse.json({
      exito: false,
      error: error instanceof Error ? error.message : 'Error del servidor',
      detalles: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 