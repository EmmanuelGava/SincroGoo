import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { normalizeOutgoingMime, validateOutgoingMedia } from '@/lib/chat/mediaLimits';

const IMAGE_BUCKET = 'chat-images';
const AUDIO_BUCKET = 'chat-audio';
const FILE_BUCKET = 'chat-files';

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

    const mime = normalizeOutgoingMime(file.type);
    const check = validateOutgoingMedia(file);
    if (!check.ok) {
      return NextResponse.json({ success: false, error: check.error }, { status: 400 });
    }
    const kind = check.kind;

    const bucket = kind === 'image' ? IMAGE_BUCKET : kind === 'audio' ? AUDIO_BUCKET : FILE_BUCKET;
    const ext = (file.name.split('.').pop() || (kind === 'image' ? 'jpg' : kind === 'audio' ? 'webm' : 'bin'))
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8) || (kind === 'image' ? 'jpg' : kind === 'audio' ? 'webm' : 'bin');
    const safeConversation = conversationId.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 64) || 'general';
    const path = `${session.user.id}/${safeConversation}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: mime || (kind === 'image' ? 'image/jpeg' : kind === 'audio' ? 'audio/webm' : 'application/octet-stream'),
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
