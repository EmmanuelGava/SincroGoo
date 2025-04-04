import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

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
    const input = searchParams.get('input');

    if (!input) {
      return NextResponse.json(
        { 
          exito: false, 
          error: 'Falta el parámetro input' 
        },
        { status: 400 }
      );
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
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener sugerencias de ubicación');
    }

    const data = await response.json();
    if (data.status !== 'OK') {
      throw new Error(data.error_message || 'Error al obtener sugerencias de ubicación');
    }

    const predictions = data.predictions.map((prediction: any) => ({
      description: prediction.description,
      place_id: prediction.place_id
    }));

    return NextResponse.json({
      exito: true,
      datos: {
        predictions
      }
    });
  } catch (error) {
    console.error('Error en autocompletado:', error);
    return NextResponse.json(
      { 
        exito: false, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 