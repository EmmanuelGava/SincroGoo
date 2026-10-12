import { NextRequest, NextResponse } from 'next/server';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { normalizeCategoriaSlug } from '@/lib/catalogo/catalogoCategorias';
import { CATEGORIA_SELECT } from '@/lib/catalogo/catalogoCategoriasDb';

async function requireOrg() {
  const ctx = await getOrganizacionContext();
  if (!ctx) return null;
  return { ctx, supabase: getSupabaseAdmin() };
}

export async function GET() {
  try {
    const client = await requireOrg();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data, error } = await client.supabase
      .from('catalogo_categorias')
      .select(CATEGORIA_SELECT)
      .eq('organizacion_id', client.ctx.organizacionId)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ categorias: data || [] });
  } catch (error) {
    const { error: msg, status } = formatErrorResponse(error);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = await requireOrg();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (client.ctx.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admin puede crear categorías' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const slug = normalizeCategoriaSlug(body.slug || body.nombre);
    const nombre = String(body.nombre ?? '').trim();
    if (!slug || nombre.length < 2) {
      return NextResponse.json({ error: 'Nombre o slug inválido' }, { status: 400 });
    }

    const { data, error } = await client.supabase
      .from('catalogo_categorias')
      .insert({
        organizacion_id: client.ctx.organizacionId,
        slug,
        nombre: nombre.slice(0, 80),
        incluir_sin_stock_en_lista: Boolean(body.incluir_sin_stock_en_lista),
        orden: Number(body.orden ?? 0) || 0,
      })
      .select(CATEGORIA_SELECT)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Ya existe una categoría con el slug "${slug}"` },
          { status: 409 },
        );
      }
      throw error;
    }
    return NextResponse.json({ categoria: data }, { status: 201 });
  } catch (error) {
    const { error: msg, status } = formatErrorResponse(error);
    return NextResponse.json({ error: msg }, { status });
  }
}
