import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { isAllowedStorageUrl } from '@/lib/chat/allowedStorageUrl';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get('url');
  if (!url || !isAllowedStorageUrl(url)) {
    return NextResponse.json({ error: 'URL no permitida' }, { status: 400 });
  }

  const headers: HeadersInit = {};
  const range = request.headers.get('range');
  if (range) headers.Range = range;

  const upstream = await fetch(url, { headers, cache: 'no-store' });
  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: 'No se pudo leer el archivo' }, { status: 502 });
  }

  const out = new Headers();
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  out.set('Content-Type', contentType);
  out.set('Cache-Control', 'private, max-age=3600');
  const acceptRanges = upstream.headers.get('accept-ranges');
  if (acceptRanges) out.set('Accept-Ranges', acceptRanges);
  const contentRange = upstream.headers.get('content-range');
  if (contentRange) out.set('Content-Range', contentRange);
  const contentLength = upstream.headers.get('content-length');
  if (contentLength) out.set('Content-Length', contentLength);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}
