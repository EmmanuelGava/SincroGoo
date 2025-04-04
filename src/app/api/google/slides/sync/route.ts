import { NextRequest, NextResponse } from 'next/server';
import { SlidesService } from '@/app/servicios/google/slides/SlidesService';
import { handleError, handleValidationError } from '@/app/servicios/google/utils/error-handling';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json(handleValidationError('No autorizado'), { status: 401 });
    }

    const slidesService = SlidesService.getInstance(session.accessToken);
    const { updates, presentationId } = await request.json();

    if (!updates || !presentationId) {
      return NextResponse.json(
        handleValidationError('Se requiere presentationId y las actualizaciones'),
        { status: 400 }
      );
    }

    // Convertir las actualizaciones al formato esperado por la API
    const requests = updates.map((update: any) => ({
      replaceAllText: {
        containsText: {
          text: update.oldText,
          matchCase: true,
        },
        replaceText: update.newText,
      },
    }));

    const resultado = await slidesService.sincronizarCambios(presentationId, requests);
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
} 