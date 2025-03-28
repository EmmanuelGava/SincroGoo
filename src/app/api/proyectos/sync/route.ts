import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ProyectosService } from '@/servicios/supabase/tablas/proyectos-service';

export async function POST(req: Request) {
  try {
    const session = await getServerSession();

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
      const existente = await ProyectosService.obtenerProyecto(proyecto.id);

      if (existente) {
        // Actualizar si es más reciente
        const fechaProyecto = proyecto.fecha_actualizacion ? new Date(proyecto.fecha_actualizacion) : new Date();
        const fechaExistente = existente.fecha_actualizacion ? new Date(existente.fecha_actualizacion as string) : new Date(0);
        
        if (fechaProyecto > fechaExistente) {
          return ProyectosService.actualizarProyecto(proyecto.id, {
            nombre: proyecto.nombre,
            descripcion: proyecto.descripcion,
            fecha_actualizacion: new Date(proyecto.fecha_actualizacion).toISOString()
          });
        }
      } else {
        // Crear nuevo proyecto
        return ProyectosService.crearProyecto({
          titulo: proyecto.nombre,
          descripcion: proyecto.descripcion,
          usuario_id: session.user?.email || '',
          fecha_creacion: new Date(proyecto.fecha_creacion).toISOString(),
          fecha_actualizacion: new Date(proyecto.fecha_actualizacion).toISOString()
        });
      }
    });

    await Promise.all(promesas);

    return NextResponse.json({ mensaje: 'Proyectos sincronizados correctamente' });
  } catch (error) {
    console.error('Error al sincronizar proyectos:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
} 