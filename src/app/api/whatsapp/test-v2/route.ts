import { NextResponse } from 'next/server';

/** @deprecated V2 en Vercel no sirve: Baileys vive en Railway vía /api/whatsapp */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        'WhatsApp Lite V2 en Vercel está deshabilitado. Usá Conectar WhatsApp (Railway worker vía /api/whatsapp).',
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecado. Usá POST /api/whatsapp con action connect y type lite.',
    },
    { status: 410 }
  );
}
