import { NextResponse } from 'next/server';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import {
  getOrganizacionContext,
  listMiembrosOrganizacion,
} from '@/lib/auth/getOrganizacionContext';

/** GET /api/organizacion/miembros — lista miembros de la org para dropdowns. */
export async function GET() {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const miembros = await listMiembrosOrganizacion(ctx.organizacionId);

    return NextResponse.json({
      miembros,
      organizacion_id: ctx.organizacionId,
      rol: ctx.rol,
      usuario_id: ctx.usuarioId,
    });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
