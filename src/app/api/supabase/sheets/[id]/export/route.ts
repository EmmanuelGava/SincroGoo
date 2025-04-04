import { NextRequest, NextResponse } from 'next/server';
import { sheetsService } from '../../../../../../lib/supabase/services/sheets';
import { formatErrorResponse } from '../../../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/sheets/[id]/export
 * Exporta una hoja de cálculo en formato CSV
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheetId = params.id;
    
    // Verificar que la hoja existe
    const sheet = await sheetsService.getSheetById(sheetId);
    
    if (!sheet) {
      return NextResponse.json(
        { error: 'Hoja de cálculo no encontrada' },
        { status: 404 }
      );
    }
    
    // Exportar a CSV
    const csvContent = await sheetsService.exportAsCSV(sheetId);
    
    if (csvContent === null) {
      return NextResponse.json(
        { error: 'Error al exportar la hoja de cálculo' },
        { status: 500 }
      );
    }
    
    // Obtener formato de respuesta de los parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const formato = searchParams.get('formato') || 'json';
    
    // Si se solicita directamente el CSV, devolver como texto plano
    if (formato === 'csv') {
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${sheet.titulo || 'export'}.csv"`
        }
      });
    }
    
    // Si no, devolver el contenido CSV dentro de un objeto JSON
    return NextResponse.json({ 
      success: true,
      sheet_id: sheetId,
      sheet_title: sheet.titulo,
      csv: csvContent
    });
  } catch (error) {
    return formatErrorResponse('Error al exportar hoja de cálculo');
  }
} 