import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';

const IMAGE_BUCKET = 'chat-images';
const AUDIO_BUCKET = 'chat-audio';
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_AUDIO = 16 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/opus',
];

function normalizeMime(type: string): string {
  const base = (type || '').split(';')[0].trim().toLowerCase();
  if (base === 'image/jpg') return 'image/jpeg';
  if (base === 'audio/mp3') return 'audio/mpeg';
  return base;
}

function kindFromMime(mime: string): 'image' | 'audio' | null {
  if (IMAGE_TYPES.includes(mime)) return 'image';
  if (AUDIO_TYPES.includes(mime) || mime.startsWith('audio/')) return 'audio';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const conversationId = String(formData.get('conversationId') || 'general');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const mime = normalizeMime(file.type);
    const kind = kindFromMime(mime);
    if (!kind) {
      return NextResponse.json({ success: false, error: 'Solo se permiten imágenes o audio' }, { status: 400 });
    }

    const max = kind === 'image' ? MAX_IMAGE : MAX_AUDIO;
    if (file.size > max) {
      return NextResponse.json({
        success: false,
        error: `El archivo no debe superar ${Math.round(max / 1024 / 1024)}MB`,
      }, { status: 400 });
    }

    const bucket = kind === 'image' ? IMAGE_BUCKET : AUDIO_BUCKET;
    const ext = (file.name.split('.').pop() || (kind === 'image' ? 'jpg' : 'webm'))
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8) || (kind === 'image' ? 'jpg' : 'webm');
    const safeConversation = conversationId.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 64) || 'general';
    const path = `${session.user.id}/${safeConversation}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: mime || (kind === 'image' ? 'image/jpeg' : 'audio/webm'),
    });

    if (error) {
      console.error('[chat/upload] Error:', error);
      return NextResponse.json({ success: false, error: 'Error al subir el archivo' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path,
      bucket,
      fileType: kind,
    });
  } catch (error) {
    console.error('[chat/upload] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 });
  }
}
