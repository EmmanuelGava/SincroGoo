import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import { ExplorerPlacesService } from '@/app/servicios/google/explorer/PlacesService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ 
        exito: false,
        error: 'No autorizado' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');

    if (!query || !lat || !lng || !radius) {
      return NextResponse.json({ 
        exito: false,
        error: 'Faltan parámetros requeridos' 
      }, { status: 400 });
    }

    const service = ExplorerPlacesService.getInstance(session.accessToken);
    
    try {
      const results = await service.buscarEstablecimientos(
        query,
        parseFloat(lat),
        parseFloat(lng),
        parseInt(radius)
      );

      return NextResponse.json({
        exito: true,
        datos: {
          results
        }
      });
    } catch (error) {
      console.error('Error en la API de Google Places:', error);
      return NextResponse.json({ 
        exito: false,
        error: 'Error al buscar establecimientos en Google Places' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error en búsqueda de lugares:', error);
    return NextResponse.json({
      exito: false,
      error: 'Error al procesar la solicitud'
    }, { status: 500 });
  }
} 