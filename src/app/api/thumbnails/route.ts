import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Implementar patrón singleton para el cliente de Supabase
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseInstance() {
  if (!supabaseInstance && supabaseUrl && supabaseKey) {
    console.log('🔄 [Supabase] Creando instancia única del cliente Supabase en thumbnails/route.ts');
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance || (supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null as any);
}

const supabase = getSupabaseInstance();

// Duración de la caché: 24 horas
const CACHE_DURATION = 24 * 60 * 60; // en segundos

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url);
    const presentationId = searchParams.get('presentationId');
    const slideId = searchParams.get('slideId');

    // Validar parámetros
    if (!presentationId || !slideId) {
      return NextResponse.json(
        { error: 'Se requieren los parámetros presentationId y slideId' },
        { status: 400 }
      );
    }

    // Verificar si la miniatura está en caché en Supabase
    const cacheKey = `thumbnail_${presentationId}_${slideId}`;
    const { data: cachedData } = await supabase
      .from('cache')
      .select('value, created_at')
      .eq('key', cacheKey)
      .single();

    // Si hay datos en caché y no han expirado, devolverlos
    if (cachedData) {
      const createdAt = new Date(cachedData.created_at);
      const now = new Date();
      const ageInSeconds = (now.getTime() - createdAt.getTime()) / 1000;

      if (ageInSeconds < CACHE_DURATION) {
        // Devolver la imagen en caché
        return new Response(cachedData.value, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': `public, max-age=${CACHE_DURATION}`,
          },
        });
      }
    }

    // Si no hay caché o ha expirado, obtener la miniatura de Google Slides
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener la URL de la miniatura de Google Slides
    const thumbnailResponse = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}/pages/${slideId}/thumbnail`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!thumbnailResponse.ok) {
      return NextResponse.json(
        { error: 'Error al obtener la miniatura de Google Slides' },
        { status: thumbnailResponse.status }
      );
    }

    const thumbnailData = await thumbnailResponse.json();
    const imageUrl = thumbnailData.contentUrl;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No se encontró la URL de la miniatura' },
        { status: 404 }
      );
    }

    // Obtener la imagen
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Error al obtener la imagen' },
        { status: imageResponse.status }
      );
    }

    // Obtener los bytes de la imagen
    const imageBuffer = await imageResponse.arrayBuffer();

    // Guardar en caché en Supabase
    try {
      await supabase
        .from('cache')
        .upsert({
          key: cacheKey,
          value: Buffer.from(imageBuffer).toString('base64'),
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error al guardar en caché:', error);
      // Continuar aunque falle el guardado en caché
    }

    // Devolver la imagen
    return new Response(Buffer.from(imageBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': `public, max-age=${CACHE_DURATION}`,
      },
    });
  } catch (error) {
    console.error('Error en la API de miniaturas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 