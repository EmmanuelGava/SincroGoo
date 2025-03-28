import { NextResponse } from 'next/server';
import { supabase } from '@/servicios/supabase/globales/auth-service';

export async function PUT(req: Request) {
  try {
    // Verificar si estamos en modo desarrollo sin autenticación
    const devModeNoAuth = process.env.DEV_MODE_NO_AUTH === 'true';
    
    // Si el cliente Supabase no está disponible y estamos en modo desarrollo, simular autenticación
    if (!supabase && devModeNoAuth) {
      console.log('[API] Modo desarrollo sin autenticación activado');
      const { id, ultimaModificacion } = await req.json();
      
      // Simular respuesta exitosa en modo desarrollo
      console.log('[API] Simulando actualización de proyecto con ID:', id);
      return NextResponse.json({
        id,
        ultima_modificacion: new Date(ultimaModificacion).toISOString(),
        mensaje: 'Simulación en modo desarrollo'
      });
    }
    
    // Verificar autenticación usando el servicio centralizado
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.email) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    console.log('[API] Usuario autenticado:', session.user.email);
    const { id, ultimaModificacion } = await req.json();

    console.log('[API] Actualizando proyecto con ID:', id);
    const { data: proyectoActualizado, error } = await supabase
      .from('proyectos')
      .update({
        ultima_modificacion: new Date(ultimaModificacion).toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('[API] Error al actualizar proyecto:', error);
      return new NextResponse(error.message, { status: 500 });
    }

    console.log('[API] Proyecto actualizado correctamente:', proyectoActualizado);
    return NextResponse.json(proyectoActualizado);
  } catch (error) {
    console.error('Error al actualizar proyecto:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}