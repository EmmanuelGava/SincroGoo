import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { applyCatalogDrafts, draftFromUploadedFile } from '@/lib/chat/importCatalogo';
import { isCatalogoTipo, type CatalogoTipo } from '@/lib/chat/catalogoVentas';
import { normalizeOutgoingMime, validateOutgoingMedia } from '@/lib/chat/mediaLimits';

const IMAGE_BUCKET = 'chat-images';
const FILE_BUCKET = 'chat-files';
const MAX_FILES = 50;

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const usuarioId = await getUsuarioIdFromSession();
  if (!usuarioId) return null;
  return {
    supabase: getSupabaseAdmin() as unknown as SupabaseClient,
    usuarioId,
    userId: session.user.id,
  };
}

export async function POST(req: NextRequest) {
  try {
    const client = await requireUser();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const form = await req.formData();
    const fallbackTipo = isCatalogoTipo(String(form.get('tipo') || ''))
      ? (String(form.get('tipo')) as CatalogoTipo)
      : 'producto';
    const files = form.getAll('files').filter((item): item is File => item instanceof File && item.size > 0);
    if (!files.length) {
      return NextResponse.json({ error: 'Elegí uno o más archivos' }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Máximo ${MAX_FILES} archivos por carga` }, { status: 400 });
    }

    const drafts = [];
    for (const file of files) {
      const check = validateOutgoingMedia(file);
      if (!check.ok) {
        return NextResponse.json({ error: `${file.name}: ${check.error}` }, { status: 400 });
      }
      if (check.kind === 'audio') {
        return NextResponse.json({ error: `${file.name}: el catálogo no admite audio` }, { status: 400 });
      }

      const mime = normalizeOutgoingMime(file.type);
      const bucket = check.kind === 'image' ? IMAGE_BUCKET : FILE_BUCKET;
      const ext = (file.name.split('.').pop() || (check.kind === 'image' ? 'jpg' : 'bin'))
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 8) || (check.kind === 'image' ? 'jpg' : 'bin');
      const path = `${client.userId}/catalogo/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error } = await client.supabase.storage.from(bucket).upload(path, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: mime || (check.kind === 'image' ? 'image/jpeg' : 'application/octet-stream'),
      });
      if (error) {
        return NextResponse.json({ error: `No se pudo subir ${file.name}` }, { status: 500 });
      }
      const { data: urlData } = client.supabase.storage.from(bucket).getPublicUrl(path);
      drafts.push(draftFromUploadedFile(file.name, urlData.publicUrl, mime, fallbackTipo));
    }

    const result = await applyCatalogDrafts(client.supabase, client.usuarioId, drafts);
    return NextResponse.json(result);
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
