export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    const pageToken = searchParams.get('pageToken');

    if (!query || !lat || !lng || !radius) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    }

    const location = `${lat},${lng}`;
    const fields = [
      'place_id',
      'name',
      'formatted_address',
      'geometry',
      'rating',
      'user_ratings_total',
      'formatted_phone_number',
      'international_phone_number',
      'website',
      'opening_hours',
      'photos',
      'price_level'
    ].join(',');

    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location}&radius=${radius}&fields=${fields}&key=${apiKey}`;
    
    if (pageToken) {
      url += `&pagetoken=${pageToken}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Error en la respuesta de Google Places:', data);
      return NextResponse.json({ error: 'Error al buscar lugares' }, { status: 500 });
    }

    // Si es una página subsiguiente, esperamos 2 segundos antes de devolver la respuesta
    if (pageToken) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 