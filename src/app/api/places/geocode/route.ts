import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!address) {
      return NextResponse.json({ error: 'Dirección no proporcionada' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );

    const data = await response.json();

    if (data.status === 'OK') {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { error: 'No se encontró la ubicación' },
        { status: data.status === 'ZERO_RESULTS' ? 404 : 500 }
      );
    }
  } catch (error) {
    console.error('Error en geocodificación:', error);
    return NextResponse.json({ error: 'Error al buscar la ubicación' }, { status: 500 });
  }
} 