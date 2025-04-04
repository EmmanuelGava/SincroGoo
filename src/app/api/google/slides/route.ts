import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import { SlidesService } from '@/app/servicios/google/slides/SlidesService';
import { ElementoDiapositiva, OpcionesActualizacion } from '@/app/servicios/google/slides/types';
import { handleError, handleValidationError } from '@/app/servicios/google/utils/error-handling';

export async function GET(request: NextRequest) {
  console.log('🎯 [API Slides] Recibiendo petición GET');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('🔐 [API Slides] Estado de sesión:', {
      haySession: !!session,
      hayToken: !!session?.accessToken
    });

    if (!session?.accessToken) {
      console.error('❌ [API Slides] No hay token de acceso');
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const presentationId = searchParams.get('presentationId');

    console.log('🔍 [API Slides] Parámetros:', { action, presentationId });

    if (!action || !presentationId) {
      console.error('❌ [API Slides] Faltan parámetros requeridos');
      return NextResponse.json(
        { exito: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    const slidesService = SlidesService.getInstance(session.accessToken);

    if (action === 'getData') {
      console.log('📊 [API Slides] Obteniendo datos de presentación:', presentationId);
      const resultado = await slidesService.obtenerPresentacion(presentationId);
      console.log('✅ [API Slides] Resultado:', {
        exito: resultado.exito,
        hayError: !!resultado.error,
        hayDatos: !!resultado.datos
      });

      if (!resultado.exito || !resultado.datos) {
        return NextResponse.json(
          { 
            exito: false, 
            error: resultado.error || 'No se obtuvieron datos de la presentación'
          },
          { status: resultado.codigo || 500 }
        );
      }

      // Transformar los datos al formato esperado por el frontend
      const respuesta = {
        exito: true,
        datos: {
          diapositivas: resultado.datos.diapositivas.map(diapositiva => ({
            id: diapositiva.id,
            titulo: diapositiva.titulo,
            elementos: diapositiva.elementos || [],
            indice: diapositiva.indice,
            urlImagen: diapositiva.urlImagen
          }))
        }
      };

      return NextResponse.json(respuesta);
    }

    console.error('❌ [API Slides] Acción no soportada:', action);
    return NextResponse.json(
      { exito: false, error: 'Acción no soportada' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ [API Slides] Error en el servidor:', error);
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
  console.log('🎯 [API Slides] Recibiendo petición POST');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('🔐 [API Slides] Estado de sesión:', {
      haySession: !!session,
      hayToken: !!session?.accessToken
    });

    if (!session?.accessToken) {
      console.error('❌ [API Slides] No hay token de acceso');
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 [API Slides] Cuerpo de la petición:', {
      presentationId: body.presentationId,
      slideId: body.slideId,
      cantidadElementos: body.elementos?.length,
      elementos: body.elementos?.map((e: any) => ({
        id: e.id,
        tipo: e.tipo,
        contenido: e.contenido
      }))
    });

    const { presentationId, slideId, elementos } = body;

    if (!presentationId || !slideId || !elementos) {
      console.error('❌ [API Slides] Faltan datos requeridos en el cuerpo:', {
        tienePresentationId: !!presentationId,
        tieneSlideId: !!slideId,
        tieneElementos: !!elementos
      });
      return NextResponse.json(
        { exito: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const slidesService = SlidesService.getInstance(session.accessToken);
    console.log('🔄 [API Slides] Actualizando diapositiva:', { presentationId, slideId });
    
    const resultado = await slidesService.actualizarDiapositiva(presentationId, slideId, elementos);
    console.log('✅ [API Slides] Resultado:', {
      exito: resultado.exito,
      hayError: !!resultado.error,
      hayDatos: !!resultado.datos,
      error: resultado.error,
      codigo: resultado.codigo
    });

    if (!resultado.exito) {
      return NextResponse.json(
        { exito: false, error: resultado.error },
        { status: resultado.codigo || 500 }
      );
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('❌ [API Slides] Error en el servidor:', error);
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

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json(handleValidationError('No autorizado'), { status: 401 });
    }

    const slidesService = SlidesService.getInstance(session.accessToken);
    const body = await request.json();
    
    const { presentationId, updates } = body;
    
    if (!presentationId || !updates) {
      return NextResponse.json(
        handleValidationError('Se requiere el ID de la presentación y las actualizaciones'),
        { status: 400 }
      );
    }

    const resultado = await slidesService.actualizarPresentacion(presentationId, updates);
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json(handleValidationError('No autorizado'), { status: 401 });
    }

    const slidesService = SlidesService.getInstance(session.accessToken);
    const presentationId = request.nextUrl.searchParams.get('presentationId');

    if (!presentationId) {
      return NextResponse.json(
        handleValidationError('Se requiere el ID de la presentación'),
        { status: 400 }
      );
    }

    const resultado = await slidesService.eliminarPresentacion(presentationId);
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
} 