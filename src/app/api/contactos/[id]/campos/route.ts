import { NextRequest } from 'next/server';
import { getCamposDeEntidad, putCamposDeEntidad } from '@/lib/crm/camposPersonalizadosRoutes';

type RouteContext = { params: { id: string } };

export function GET(_req: NextRequest, { params }: RouteContext) {
  return getCamposDeEntidad('contacto', params.id);
}

export function PUT(req: NextRequest, { params }: RouteContext) {
  return putCamposDeEntidad('contacto', params.id, req);
}
