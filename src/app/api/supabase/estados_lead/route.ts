import { NextRequest, NextResponse } from 'next/server';
import { getCrmApiClient } from '@/lib/crm/crmApiClient';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';
import { estadoPerteneceAOrganizacion, listarEstadosOrganizacion } from '@/lib/crm/estadosLeadDb';

const CAMPOS_EDITABLES = ['nombre', 'orden', 'color', 'icono', 'is_default'] as const;

function soloCamposEditables(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) out[campo] = body[campo];
  }
  return out;
}

const soloAdmin = () =>
  NextResponse.json({ error: 'Solo los administradores pueden modificar las etapas' }, { status: 403 });

// GET /api/supabase/estados_lead - Etapas de la organización (ordenadas)
export async function GET() {
  try {
    const client = await getCrmApiClient();
    if (!client) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const estados = await listarEstadosOrganizacion(client.supabase, client.organizacionId, client.userId);
    return NextResponse.json(estados);
  } catch (error) {
    console.error('Error en GET estados_lead:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// POST /api/supabase/estados_lead - Crear etapa (admin)
export async function POST(request: NextRequest) {
  try {
    const client = await getCrmApiClient();
    if (!client) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (client.rol !== 'admin') return soloAdmin();

    const body = soloCamposEditables(await request.json());
    if (!body.nombre || body.orden === undefined) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (nombre, orden)' }, { status: 400 });
    }

    const { data, error } = await client.supabase
      .from('estados_lead')
      .insert({ ...body, usuario_id: client.userId, organizacion_id: client.organizacionId })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// PATCH /api/supabase/estados_lead - Actualizar etapa por id (admin)
export async function PATCH(request: NextRequest) {
  try {
    const client = await getCrmApiClient();
    if (!client) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (client.rol !== 'admin') return soloAdmin();

    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'Falta el id del estado' }, { status: 400 });

    if (!(await estadoPerteneceAOrganizacion(client.supabase, client.organizacionId, id))) {
      return NextResponse.json({ error: 'Estado no encontrado o no autorizado' }, { status: 404 });
    }

    const { data, error } = await client.supabase
      .from('estados_lead')
      .update(soloCamposEditables(body))
      .eq('id', id)
      .eq('organizacion_id', client.organizacionId)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// DELETE /api/supabase/estados_lead?id= - Eliminar etapa (admin)
export async function DELETE(request: NextRequest) {
  try {
    const client = await getCrmApiClient();
    if (!client) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (client.rol !== 'admin') return soloAdmin();

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta el id del estado' }, { status: 400 });

    if (!(await estadoPerteneceAOrganizacion(client.supabase, client.organizacionId, id))) {
      return NextResponse.json({ error: 'Estado no encontrado o no autorizado' }, { status: 404 });
    }

    const { count } = await client.supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('estado_id', id)
      .eq('organizacion_id', client.organizacionId);
    if (count) {
      return NextResponse.json({ error: 'Mové los leads de esta etapa antes de eliminarla' }, { status: 409 });
    }

    const { error } = await client.supabase
      .from('estados_lead')
      .delete()
      .eq('id', id)
      .eq('organizacion_id', client.organizacionId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
