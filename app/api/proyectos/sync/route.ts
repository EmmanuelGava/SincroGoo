import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    const { proyectos } = await req.json();

    // Sincronizar cada proyecto
    const promesas = proyectos.map(async (proyecto: any) => {
      // Solo sincronizar proyectos que pertenezcan al usuario
      if (proyecto.userId !== session.user?.email) {
        return;
      }

      // Buscar si el proyecto ya existe
      const { data: existente } = await supabase
        .from('proyectos')
        .select()
        .eq('id', proyecto.id)
        .single();

      if (existente) {
        // Actualizar si es más reciente
        if (new Date(proyecto.ultimaModificacion) > new Date(existente.ultimaModificacion)) {
          return supabase
            .from('proyectos')
            .update({
              nombre: proyecto.nombre,
              sheetsId: proyecto.sheetsId,
              slidesId: proyecto.slidesId,
              hojasTitulo: proyecto.hojasTitulo,
              presentacionTitulo: proyecto.presentacionTitulo,
              ultimaModificacion: new Date(proyecto.ultimaModificacion).toISOString()
            })
            .eq('id', proyecto.id);
        }
      } else {
        // Crear nuevo proyecto
        return supabase
          .from('proyectos')
          .insert([{
            id: proyecto.id,
            nombre: proyecto.nombre,
            sheetsId: proyecto.sheetsId,
            slidesId: proyecto.slidesId,
            hojasTitulo: proyecto.hojasTitulo,
            presentacionTitulo: proyecto.presentacionTitulo,
            userId: session.user.email,
            fechaCreacion: new Date(proyecto.fechaCreacion).toISOString(),
            ultimaModificacion: new Date(proyecto.ultimaModificacion).toISOString()
          }]);
      }
    });

    await Promise.all(promesas);

    return NextResponse.json({ mensaje: 'Proyectos sincronizados correctamente' });
  } catch (error) {
    console.error('Error al sincronizar proyectos:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
} 