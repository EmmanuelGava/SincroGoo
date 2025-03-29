import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json({ error: 'Se requiere el ID del lugar' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    }

    const fields = [
      'name',
      'formatted_address',
      'formatted_phone_number',
      'international_phone_number',
      'website',
      'opening_hours',
      'rating',
      'user_ratings_total',
      'price_level',
      'photos',
      'geometry'
    ].join(',');

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Error en la respuesta de Google Places:', data);
      return NextResponse.json({ error: 'Error al obtener detalles del lugar' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 