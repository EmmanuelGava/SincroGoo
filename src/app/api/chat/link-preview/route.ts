import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { fetchSafeHtml } from '@/lib/chat/ssrfGuard';
import {
  resolveLinkPreview,
  type CachedLinkPreview,
} from '@/lib/chat/linkPreviewResolve';

function isWellFormedHttpUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get('url') || '';
  if (!raw || !isWellFormedHttpUrl(raw)) {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const preview = await resolveLinkPreview(raw.trim(), {
    cacheGet: async (url) => {
      const { data } = await supabase
        .from('chat_link_previews')
        .select('url, title, description, image_url, site_name, fetched_at, expires_at')
        .eq('url', url)
        .maybeSingle();
      return (data as CachedLinkPreview | null) || null;
    },
    cacheSet: async (row) => {
      await supabase.from('chat_link_previews').upsert(row, { onConflict: 'url' });
    },
    fetchHtml: (url) => fetchSafeHtml(url),
  });

  if (!preview) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(preview);
}
