import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getOrganizacionContext,
  listMiembrosOrganizacion,
} from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import {
  construirReporteAgentes,
  parseReportePeriodo,
  type ReporteCambioEtapa,
  type ReporteConversacion,
  type ReporteLead,
  type ReporteMensaje,
} from '@/lib/crm/reporteAgentes';

const PAGE = 1000;
const IN_CHUNK = 200;
const MAX_MENSAJES = 20000;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function paginar<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  limite = Infinity
): Promise<{ rows: T[]; truncado: boolean }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return { rows, truncado: false };
    if (rows.length >= limite) return { rows, truncado: true };
  }
}

async function cargarLeads(supabase: SupabaseClient, organizacionId: string): Promise<ReporteLead[]> {
  const { rows } = await paginar<{
    id: string;
    asignado_a: string | null;
    estado_id: string | null;
    valor_potencial: number | null;
    fecha_creacion: string | null;
  }>((from, to) =>
    supabase
      .from('leads')
      .select('id, asignado_a, estado_id, valor_potencial, fecha_creacion')
      .eq('organizacion_id', organizacionId)
      .order('id')
      .range(from, to)
  );

  const estadoIds = Array.from(new Set(rows.map((l) => l.estado_id).filter(Boolean))) as string[];
  const nombres = new Map<string, string>();
  for (const ids of chunks(estadoIds, IN_CHUNK)) {
    const { data, error } = await supabase.from('estados_lead').select('id, nombre').in('id', ids);
    if (error) throw error;
    for (const e of data || []) nombres.set(e.id, e.nombre);
  }

  return rows.map((l) => ({
    id: l.id,
    asignado_a: l.asignado_a,
    estado_nombre: l.estado_id ? nombres.get(l.estado_id) || null : null,
    valor_potencial: l.valor_potencial,
    fecha_creacion: l.fecha_creacion,
  }));
}

async function cargarCambiosEtapa(
  supabase: SupabaseClient,
  leadIds: string[],
  desde: string
): Promise<ReporteCambioEtapa[]> {
  const out: ReporteCambioEtapa[] = [];
  for (const ids of chunks(leadIds, IN_CHUNK)) {
    const { rows } = await paginar<ReporteCambioEtapa>((from, to) =>
      supabase
        .from('lead_etapa_historial')
        .select('lead_id, estado_nuevo_nombre, fecha')
        .in('lead_id', ids)
        .gte('fecha', desde)
        .order('fecha')
        .range(from, to)
    );
    out.push(...rows);
  }
  return out;
}

async function cargarConversaciones(
  supabase: SupabaseClient,
  organizacionId: string,
  desde: string
): Promise<ReporteConversacion[]> {
  const { rows } = await paginar<ReporteConversacion>((from, to) =>
    supabase
      .from('conversaciones')
      .select('id, asignado_a, archived_at')
      .eq('organizacion_id', organizacionId)
      .gte('fecha_mensaje', desde)
      .order('id')
      .range(from, to)
  );
  return rows;
}

async function cargarMensajes(
  supabase: SupabaseClient,
  conversacionIds: string[],
  desde: string
): Promise<{ mensajes: ReporteMensaje[]; truncado: boolean }> {
  const mensajes: ReporteMensaje[] = [];
  for (const ids of chunks(conversacionIds, IN_CHUNK)) {
    const restante = MAX_MENSAJES - mensajes.length;
    if (restante <= 0) return { mensajes, truncado: true };
    const { rows, truncado } = await paginar<ReporteMensaje>(
      (from, to) =>
        supabase
          .from('mensajes_conversacion')
          .select('conversacion_id, fecha_mensaje, usuario_id, metadata, tipo')
          .in('conversacion_id', ids)
          .gte('fecha_mensaje', desde)
          .order('fecha_mensaje')
          .range(from, to),
      restante
    );
    mensajes.push(...rows);
    if (truncado) return { mensajes, truncado: true };
  }
  return { mensajes, truncado: false };
}

/** GET /api/crm/reportes/agentes?dias=7|30|90 — admin ve todo el equipo; agente solo su fila. */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const dias = parseReportePeriodo(req.nextUrl.searchParams.get('dias'));
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
    const supabase = getSupabaseAdmin();

    const [miembros, leads, conversaciones] = await Promise.all([
      listMiembrosOrganizacion(ctx.organizacionId),
      cargarLeads(supabase, ctx.organizacionId),
      cargarConversaciones(supabase, ctx.organizacionId, desde),
    ]);
    const [cambiosEtapa, { mensajes, truncado }] = await Promise.all([
      cargarCambiosEtapa(supabase, leads.map((l) => l.id), desde),
      cargarMensajes(supabase, conversaciones.map((c) => c.id), desde),
    ]);

    const filas = construirReporteAgentes({
      desde,
      miembros: miembros.map((m) => ({ usuario_id: m.usuario_id, nombre: m.nombre })),
      leads,
      cambiosEtapa,
      conversaciones,
      mensajes,
    });

    const esAdmin = ctx.rol === 'admin';
    return NextResponse.json(
      {
        dias,
        desde,
        es_admin: esAdmin,
        truncado,
        filas: esAdmin ? filas : filas.filter((f) => f.usuario_id === ctx.usuarioId),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const { error: message, status } = formatErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
