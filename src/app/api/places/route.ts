import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_API_SECRET = process.env.GOOGLE_PLACES_API_SECRET;

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        { error: 'API key no configurada' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '5000';

    if (!query || !lat || !lng) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      query,
      location: `${lat},${lng}`,
      radius,
      type: 'establishment',
      key: GOOGLE_PLACES_API_KEY
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
          'X-Project-ID': session.projectId || ''
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error en la API de Google Places: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'REQUEST_DENIED') {
      return NextResponse.json(
        { error: 'Acceso denegado a la API de Google Places' },
        { status: 403 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error en el endpoint de places:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 