import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import { SlidesService } from '@/app/servicios/google/slides/SlidesService';

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Obtener parámetros
    const { searchParams } = new URL(request.url);
    const presentacionId = searchParams.get('presentacionId');
    const diapositivaId = searchParams.get('diapositivaId');

    if (!presentacionId || !diapositivaId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // 3. Obtener el servicio de slides
    const slidesService = SlidesService.getInstance(session.accessToken);

    // 4. Obtener la miniatura usando el servicio
    const resultado = await slidesService.obtenerMiniaturaSlide(
      presentacionId,
      diapositivaId
    );

    if (!resultado.exito || !resultado.datos) {
      return NextResponse.json(
        { error: 'Error al obtener la miniatura' },
        { status: 500 }
      );
    }

    // 5. Obtener la imagen y devolverla directamente
    const imageResponse = await fetch(resultado.datos);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const headers = new Headers();
    headers.set('Content-Type', 'image/png');
    headers.set('Cache-Control', 'public, max-age=86400'); // Cache por 24 horas

    return new NextResponse(imageArrayBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error al obtener miniatura:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 