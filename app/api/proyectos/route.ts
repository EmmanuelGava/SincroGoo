import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProyectosByUserId, createProyecto } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    const proyectos = await getProyectosByUserId(session.user.email);
    return NextResponse.json(proyectos);
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    const body = await req.json();
    const { nombre, sheetsId, slidesId, hojasTitulo, presentacionTitulo } = body;

    const proyecto = await createProyecto({
      nombre,
      sheetsId,
      slidesId,
      hojasTitulo,
      presentacionTitulo,
      userId: session.user.email,
      fechaCreacion: new Date().toISOString(),
      ultimaModificacion: new Date().toISOString()
    });

    return NextResponse.json(proyecto);
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
} 