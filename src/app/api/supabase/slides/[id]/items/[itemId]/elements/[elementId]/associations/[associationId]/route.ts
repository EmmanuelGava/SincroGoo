import { NextRequest, NextResponse } from 'next/server';
import { slidesService } from '../../../../../../../../../../../lib/supabase/services/slides';
import { formatErrorResponse } from '../../../../../../../../../../../lib/supabase/utils/error-handler';

/**
 * DELETE /api/supabase/slides/[id]/items/[itemId]/elements/[elementId]/associations/[associationId]
 * Elimina una asociación específica
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string; elementId: string; associationId: string } }
) {
  try {
    const { elementId, associationId } = params;
    
    // Obtener asociaciones
    const associations = await slidesService.getElementAssociations(elementId);
    const association = associations.find(assoc => assoc.id === associationId);
    
    if (!association) {
      return NextResponse.json(
        { error: 'Asociación no encontrada' },
        { status: 404 }
      );
    }
    
    // Eliminar asociación
    const success = await slidesService.deleteElementAssociation(associationId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo eliminar la asociación' },
        { status: 500 }
      );
    }
    
    // Devolver respuesta
    return NextResponse.json({ success: true });
  } catch (error) {
    return formatErrorResponse('Error al eliminar asociación');
  }
} 