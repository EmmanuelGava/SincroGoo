import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';

const BUCKET = 'chat-files';
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/jpg'];

/**
 * POST /api/upload/logo
 * Sube una imagen (logo) a Supabase Storage y devuelve la URL pública.
 * Requiere autenticación.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ exito: false, error: 'No se envió ningún archivo' }, { status: 400 });
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ exito: false, error: 'Solo se permiten imágenes PNG o JPG' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ exito: false, error: 'El archivo no debe superar 2MB' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const ext = file.name.split('.').pop() || 'png';
    const path = `plantilla-logos/${session.user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

    if (error) {
      console.error('[upload/logo] Error:', error);
      return NextResponse.json({ exito: false, error: 'Error al subir el archivo' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ exito: true, url: urlData.publicUrl });
  } catch (err) {
    console.error('[upload/logo] Error:', err);
    return NextResponse.json(
      { exito: false, error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
