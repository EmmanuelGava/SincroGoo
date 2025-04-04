import { NextRequest, NextResponse } from 'next/server';
import { ExplorerPlacesService } from '@/app/servicios/google/explorer/PlacesService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const placeId = searchParams.get('placeId');
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radio = searchParams.get('radius');
    const tipo = searchParams.get('type');
    const pageToken = searchParams.get('pageToken');
    const photoReference = searchParams.get('photoReference');
    const maxWidth = searchParams.get('maxWidth');

    const placesService = ExplorerPlacesService.getInstance();

    switch (action) {
      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'Se requiere un término de búsqueda' }, { status: 400 });
        }

        if (!lat || !lng || !radio) {
          return NextResponse.json({ error: 'Se requieren latitud, longitud y radio' }, { status: 400 });
        }

        const searchResult = await placesService.buscarEstablecimientos(
          query,
          parseFloat(lat),
          parseFloat(lng),
          parseInt(radio)
        );
        return NextResponse.json(searchResult);

      case 'details':
        if (!placeId) {
          return NextResponse.json({ error: 'Se requiere un place_id' }, { status: 400 });
        }

        const detailsResult = await placesService.obtenerDetallesLugar(placeId);
        return NextResponse.json(detailsResult);

      case 'photo':
        if (!photoReference) {
          return NextResponse.json({ error: 'Se requiere una referencia de foto' }, { status: 400 });
        }

        // La nueva versión no soporta fotos directamente
        return NextResponse.json({ error: 'Funcionalidad de fotos no soportada en esta versión' }, { status: 400 });

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en Places API:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
} 