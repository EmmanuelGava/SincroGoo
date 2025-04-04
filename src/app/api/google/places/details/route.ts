import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';

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
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json({ 
        exito: false, 
        error: 'ID de lugar requerido' 
      }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          exito: false, 
          error: 'API key no configurada' 
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&fields=name,formatted_address,geometry,formatted_phone_number,website,opening_hours,rating,user_ratings_total,price_level,photos`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener detalles del lugar');
    }

    const data = await response.json();
    if (data.status !== 'OK') {
      throw new Error(data.error_message || 'Error al obtener detalles del lugar');
    }

    const result = data.result;
    const detalles = {
      id: placeId,
      nombre: result.name || 'Sin nombre',
      direccion: result.formatted_address || 'Dirección no disponible',
      latitud: result.geometry.location.lat,
      longitud: result.geometry.location.lng,
      telefono: result.formatted_phone_number || 'No disponible',
      sitioWeb: result.website || '',
      horarios: result.opening_hours?.weekday_text || [],
      puntuacion: result.rating,
      totalPuntuaciones: result.user_ratings_total,
      nivelPrecio: result.price_level,
      fotos: result.photos?.map((foto: any) => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${foto.photo_reference}&key=${apiKey}`
      ) || []
    };

    return NextResponse.json({
      exito: true,
      datos: detalles
    });
  } catch (error) {
    console.error('Error al obtener detalles del lugar:', error);
    return NextResponse.json(
      { 
        exito: false, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 