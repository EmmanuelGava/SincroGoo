import { NextRequest } from 'next/server';
import { getCamposDeEntidad, putCamposDeEntidad } from '@/lib/crm/camposPersonalizadosRoutes';

type RouteContext = { params: { id: string } };

export function GET(_req: NextRequest, { params }: RouteContext) {
  return getCamposDeEntidad('lead', params.id);
}

export function PUT(req: NextRequest, { params }: RouteContext) {
  return putCamposDeEntidad('lead', params.id, req);
}
