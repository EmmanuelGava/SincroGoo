import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteProyecto } from '@/lib/supabase';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    const { id } = params;
    await deleteProyecto(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
} 