import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { assertSafePublicHttpUrl, fetchSafeBinary } from '@/lib/chat/ssrfGuard';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get('url') || '';
  try {
    const safe = await assertSafePublicHttpUrl(raw);
    const fetched = await fetchSafeBinary(safe);
    if (!fetched.ok) {
      return NextResponse.json({ error: 'No se pudo leer la imagen' }, { status: 502 });
    }
    const contentType = fetched.contentType.split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'No es una imagen' }, { status: 400 });
    }
    return new NextResponse(new Uint8Array(fetched.bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'URL no permitida' }, { status: 400 });
  }
}
