import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateProyecto } from '@/lib/supabase';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    const { id, ultimaModificacion } = await req.json();

    const proyectoActualizado = await updateProyecto(id, {
      ultimaModificacion: new Date(ultimaModificacion).toISOString()
    });

    return NextResponse.json(proyectoActualizado);
  } catch (error) {
    console.error('Error al actualizar proyecto:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
} 