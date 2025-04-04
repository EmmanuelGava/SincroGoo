import { NextRequest, NextResponse } from 'next/server';
import { ExplorerPlacesService } from '@/app/servicios/google/explorer/PlacesService';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json({ 
        exito: false,
        error: 'Latitud y longitud son requeridas' 
      }, { status: 400 });
    }

    const placesService = ExplorerPlacesService.getInstance(session.accessToken);
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Error al obtener la dirección');
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error('No se encontró la dirección');
      }

      return NextResponse.json({
        exito: true,
        datos: {
          formatted_address: data.results[0].formatted_address
        }
      });
    } catch (error) {
      console.error('Error al geocodificar:', error);
      return NextResponse.json({ 
        exito: false,
        error: 'Error al obtener la dirección' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error en geocodificación:', error);
    return NextResponse.json({ 
      exito: false,
      error: 'Error al buscar la ubicación' 
    }, { status: 500 });
  }
} 