import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { applyCatalogDrafts, draftsFromCatalogCsv, draftsFromCatalogTable, type CatalogoDraft } from '@/lib/chat/importCatalogo';
import { isCatalogoTipo, type CatalogoTipo } from '@/lib/chat/catalogoVentas';

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const usuarioId = await getUsuarioIdFromSession();
  if (!usuarioId) return null;
  return {
    supabase: getSupabaseAdmin() as unknown as SupabaseClient,
    usuarioId,
    accessToken: session.accessToken as string | undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const client = await requireUser();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let drafts: CatalogoDraft[] = [];
    let fallbackTipo: CatalogoTipo = 'producto';

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      fallbackTipo = isCatalogoTipo(body.tipo) ? body.tipo : 'producto';
      if (body.source === 'sheets') {
        if (!client.accessToken) {
          return NextResponse.json({ error: 'Volvé a iniciar sesión con Google' }, { status: 401 });
        }
        const spreadsheetId = String(body.spreadsheetId || '');
        if (!spreadsheetId) {
          return NextResponse.json({ error: 'Falta el spreadsheetId' }, { status: 400 });
        }
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z5000`,
          { headers: { Authorization: `Bearer ${client.accessToken}` } }
        );
        if (!res.ok) {
          return NextResponse.json({ error: 'No se pudo leer el Sheet' }, { status: 400 });
        }
        const data = await res.json();
        drafts = draftsFromCatalogTable(data.values || [], fallbackTipo);
      } else {
        return NextResponse.json({ error: 'Origen de importación no válido' }, { status: 400 });
      }
    } else {
      const form = await req.formData();
      fallbackTipo = isCatalogoTipo(String(form.get('tipo') || ''))
        ? (String(form.get('tipo')) as CatalogoTipo)
        : 'producto';
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Subí un CSV o Excel' }, { status: 400 });
      }

      const name = file.name.toLowerCase();
      if (name.endsWith('.csv') || file.type.includes('csv') || file.type === 'text/plain') {
        drafts = draftsFromCatalogCsv(await file.text(), fallbackTipo);
      } else {
        const buffer = Buffer.from(await file.arrayBuffer());
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
        drafts = draftsFromCatalogTable(rows, fallbackTipo);
      }
    }

    if (!drafts.length) {
      return NextResponse.json({
        error: 'No se leyeron filas. Usá columnas tipo, nombre, precio, descripcion.',
      }, { status: 400 });
    }

    const result = await applyCatalogDrafts(client.supabase, client.usuarioId, drafts);
    return NextResponse.json(result);
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
