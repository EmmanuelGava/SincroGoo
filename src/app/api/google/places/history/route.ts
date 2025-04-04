import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/options';
import { ExplorerSheetsService } from '@/app/servicios/google/explorer/ExplorerSheetsService';
import { HistorialBusqueda } from '@/app/servicios/google/explorer/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const service = ExplorerSheetsService.getInstance(session.accessToken);
    const resultado = await service.obtenerHistorialBusquedas();

    if (!resultado.exito) {
      throw new Error(resultado.error);
    }

    return NextResponse.json(resultado.datos);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { busqueda, filtros, resultados } = body;

    const historial: HistorialBusqueda = {
      fecha: new Date().toLocaleString(),
      busqueda,
      filtros: JSON.stringify(filtros),
      resultados
    };

    const service = ExplorerSheetsService.getInstance(session.accessToken);
    const resultado = await service.guardarHistorialBusqueda(historial);

    if (!resultado.exito) {
      throw new Error(resultado.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al guardar historial:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
} 