import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { contactoWriteFields, isUniquePhoneViolation } from '@/lib/contactos/contactoWrite';

async function requireContactos() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const usuarioId = await getUsuarioIdFromSession();
  if (!usuarioId) return null;
  return {
    supabase: getSupabaseAdmin() as unknown as SupabaseClient,
    usuarioId,
  };
}

type RouteContext = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const client = await requireContactos();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });
    }

    const { data: contacto, error: contactoError } = await client.supabase
      .from('contactos')
      .select('*')
      .eq('id', id)
      .eq('usuario_id', client.usuarioId)
      .maybeSingle();

    if (contactoError) throw contactoError;
    if (!contacto) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    const { data: conversaciones, error: convError } = await client.supabase
      .from('conversaciones')
      .select('id, remitente, servicio_origen, fecha_mensaje, metadata')
      .eq('contacto_id', id)
      .order('fecha_mensaje', { ascending: false });

    if (convError) throw convError;

    const { data: leads, error: leadsError } = await client.supabase
      .from('leads')
      .select('id, nombre, estado_id, estados_lead(nombre, color)')
      .eq('contacto_id', id);

    if (leadsError) throw leadsError;

    return NextResponse.json(
      {
        contacto,
        conversaciones: conversaciones || [],
        leads: leads || [],
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const client = await requireContactos();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = contactoWriteFields(body, { requireNombre: false, partial: true });
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (Object.keys(parsed.fields).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const { data, error } = await client.supabase
      .from('contactos')
      .update({
        ...parsed.fields,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('usuario_id', client.usuarioId)
      .select('*')
      .maybeSingle();

    if (error) {
      if (isUniquePhoneViolation(error)) {
        return NextResponse.json(
          { error: 'Ya existe un contacto con ese teléfono' },
          { status: 409 }
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ contacto: data });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const client = await requireContactos();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });
    }

    const { data, error } = await client.supabase
      .from('contactos')
      .delete()
      .eq('id', id)
      .eq('usuario_id', client.usuarioId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
