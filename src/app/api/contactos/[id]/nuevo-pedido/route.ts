import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

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

async function findEstadoNuevo(
  supabase: SupabaseClient,
  usuarioId: string
): Promise<string | null> {
  const { data: estados } = await supabase
    .from('estados_lead')
    .select('id, nombre, is_default, orden')
    .eq('usuario_id', usuarioId)
    .order('orden', { ascending: true });

  if (!estados?.length) return null;

  const byName = estados.find((estado) => estado.nombre?.trim().toLowerCase() === 'nuevo');
  if (byName?.id) return byName.id;

  const byDefault = estados.find((estado) => estado.is_default);
  if (byDefault?.id) return byDefault.id;

  return estados[0]?.id || null;
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const client = await requireContactos();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const contactoId = params.id;
    if (!contactoId) {
      return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });
    }

    const { data: contacto, error: contactoError } = await client.supabase
      .from('contactos')
      .select('id, nombre, telefono, email, empresa')
      .eq('id', contactoId)
      .eq('usuario_id', client.usuarioId)
      .maybeSingle();

    if (contactoError) throw contactoError;
    if (!contacto) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    const estadoId = await findEstadoNuevo(client.supabase, client.usuarioId);
    if (!estadoId) {
      return NextResponse.json({ error: 'No hay etapas configuradas en el CRM' }, { status: 400 });
    }

    const { data: lead, error: leadError } = await client.supabase
      .from('leads')
      .insert({
        nombre: contacto.nombre,
        email: contacto.email || '',
        telefono: contacto.telefono || null,
        empresa: contacto.empresa || null,
        estado_id: estadoId,
        asignado_a: client.usuarioId,
        creado_por: client.usuarioId,
        contacto_id: contactoId,
        notas: 'Nuevo pedido desde ficha de contacto',
      })
      .select('*')
      .single();

    if (leadError) throw leadError;

    const { data: conversacion } = await client.supabase
      .from('conversaciones')
      .select('id')
      .eq('contacto_id', contactoId)
      .order('fecha_mensaje', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conversacion?.id) {
      const { error: linkError } = await client.supabase
        .from('conversaciones')
        .update({ lead_id: lead.id })
        .eq('id', conversacion.id);
      if (linkError) throw linkError;
    }

    return NextResponse.json({ lead, conversacion_id: conversacion?.id || null }, { status: 201 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
