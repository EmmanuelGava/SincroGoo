import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import {
  applyImportDrafts,
  draftsFromCsv,
  draftsFromTable,
  peopleToDraft,
} from '@/lib/contactos/importContactos';

async function requireContactos() {
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

async function fetchGooglePeople(accessToken: string) {
  const drafts = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 5; page += 1) {
    const url = new URL('https://people.googleapis.com/v1/people/me/connections');
    url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,organizations');
    url.searchParams.set('pageSize', '200');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      const error = new Error(err || 'No se pudieron leer los contactos de Google');
      (error as Error & { status?: number }).status = res.status;
      throw error;
    }
    const data = await res.json();
    for (const person of data.connections || []) {
      const draft = peopleToDraft(person);
      if (draft) drafts.push(draft);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return drafts;
}

export async function POST(req: NextRequest) {
  try {
    const client = await requireContactos();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let source = '';
    let csv = '';
    let spreadsheetId = '';
    let rows: unknown[][] | undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      source = String(form.get('source') || 'csv');
      const file = form.get('file');
      if (file instanceof File) {
        csv = await file.text();
      }
    } else {
      const body = await req.json().catch(() => ({}));
      source = String(body.source || '');
      csv = typeof body.csv === 'string' ? body.csv : '';
      spreadsheetId = typeof body.spreadsheetId === 'string' ? body.spreadsheetId : '';
      if (Array.isArray(body.rows)) rows = body.rows;
    }

    let drafts = [];
    if (source === 'csv') {
      if (csv.length > 1_500_000) {
        return NextResponse.json({ error: 'El CSV no puede superar 1.5 MB' }, { status: 400 });
      }
      drafts = draftsFromCsv(csv);
      if (!drafts.length) {
        return NextResponse.json(
          { error: 'No se encontraron columnas nombre, teléfono o email' },
          { status: 400 }
        );
      }
    } else if (source === 'sheets') {
      if (!client.accessToken) {
        return NextResponse.json({ error: 'Volvé a iniciar sesión con Google' }, { status: 401 });
      }
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
      drafts = draftsFromTable(data.values || []);
      if (!drafts.length) {
        return NextResponse.json(
          { error: 'El Sheet no tiene columnas nombre, teléfono o email' },
          { status: 400 }
        );
      }
    } else if (source === 'google') {
      if (!client.accessToken) {
        return NextResponse.json({ error: 'Volvé a iniciar sesión con Google' }, { status: 401 });
      }
      try {
        drafts = await fetchGooglePeople(client.accessToken);
      } catch (error) {
        const status = (error as Error & { status?: number }).status;
        if (status === 403 || status === 401) {
          return NextResponse.json(
            { error: 'Google no autorizó Contactos. Cerrá sesión, volvé a entrar y aceptá el permiso. Si sigue fallando, habilitá People API en Google Cloud.' },
            { status: 403 }
          );
        }
        throw error;
      }
      if (!drafts.length) {
        return NextResponse.json({ error: 'No hay contactos en Google para importar' }, { status: 400 });
      }
    } else if (source === 'rows' && rows) {
      drafts = draftsFromTable(rows);
    } else {
      return NextResponse.json({ error: 'Origen de importación no válido' }, { status: 400 });
    }

    const result = await applyImportDrafts(client.supabase, client.usuarioId, drafts);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
