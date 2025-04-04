import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { ExcelToSlidesService } from '@/app/servicios/google/conversions/excel-to-slides/ExcelToSlidesService';

export async function POST(request: NextRequest) {
  console.log('🎯 [API Excel-to-Slides] Recibiendo petición POST');
  
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions);
    console.log('🔐 [API Excel-to-Slides] Estado de sesión:', {
      haySession: !!session,
      hayToken: !!session?.accessToken
    });

    if (!session?.accessToken) {
      console.error('❌ [API Excel-to-Slides] No hay token de acceso');
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el archivo del FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const nombrePresentacion = formData.get('nombrePresentacion') as string;
    const diapositivasJson = formData.get('diapositivas') as string;

    if (!file || !nombrePresentacion || !diapositivasJson) {
      console.error('❌ [API Excel-to-Slides] Faltan datos requeridos:', {
        tieneArchivo: !!file,
        tieneNombre: !!nombrePresentacion,
        tieneDiapositivas: !!diapositivasJson
      });
      return NextResponse.json(
        { exito: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const diapositivas = JSON.parse(diapositivasJson);
    console.log('📦 [API Excel-to-Slides] Datos recibidos:', {
      nombreArchivo: file.name,
      nombrePresentacion,
      cantidadDiapositivas: diapositivas.length
    });

    // Convertir el archivo
    const service = ExcelToSlidesService.getInstance(session.accessToken);

    // Leer los datos del archivo
    const datos = await service.leerDatosHoja(file, diapositivas[0].hoja);
    
    // Generar la presentación
    const presentationId = await service.generarPresentacionPaginada(nombrePresentacion, datos);

    if (!presentationId) {
      throw new Error('No se pudo generar la presentación');
    }

    const resultado = {
      exito: true,
      datos: {
        presentationId,
        url: `https://docs.google.com/presentation/d/${presentationId}/edit`
      }
    };

    console.log('✅ [API Excel-to-Slides] Resultado:', {
      exito: resultado.exito,
      hayDatos: !!resultado.datos
    });

    return NextResponse.json(resultado);

  } catch (error) {
    console.error('❌ [API Excel-to-Slides] Error:', error);
    return NextResponse.json(
      { 
        exito: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 500
      },
      { status: 500 }
    );
  }
} 