import React, { useState, useEffect } from 'react';
import { Table } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Save } from 'lucide-react';
import SheetSliders from '../SheetSliders';
import { SlideElement, SelectedRow } from '../types';
import { SlidePreview } from '@/lib/types';
import { useSession } from 'next-auth/react';
import { SlidesService } from '@/lib/slides-service';
import { SheetsService } from '@/lib/sheets-service';

export function SheetEditor() {
  const { data: session } = useSession();
  const [rows, setRows] = useState<SelectedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<SelectedRow | null>(null);
  const [selectedSlide, setSelectedSlide] = useState<SlidePreview | undefined>(undefined);
  const [slideElements, setSlideElements] = useState<SlideElement[]>([]);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSheetData = async () => {
      try {
        setLoading(true);
        if (!session?.accessToken) return;

        const sheetsService = new SheetsService(session.accessToken);
        const sheetsId = localStorage.getItem('connectedSheets');
        
        if (!sheetsId) {
          console.error('No hay hoja de cálculo conectada');
          return;
        }

        const result = await sheetsService.getSheetData(sheetsId);
        if (result.success && result.data) {
          setRows(result.data.rows);
          setColumns(result.data.columns);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSheetData();
  }, [session]);

  const handleRowSelect = (row: SelectedRow) => {
    if (selectedRow?.id === row.id) {
      setSelectedRow(null);
      setIsSidebarOpen(false);
    } else {
      setSelectedRow(row);
      setIsSidebarOpen(true);
    }
  };

  const handleSlideSelect = async (slideId: string, elementId: string | null) => {
    try {
      if (!session?.accessToken) return;

      const slidesService = new SlidesService(session.accessToken);
      const presentationId = localStorage.getItem('connectedSlides');
      
      if (!presentationId) {
        console.error('No hay presentación conectada');
        return;
      }

      // Obtener información del slide
      const slideInfo = await slidesService.getSlideInfo(presentationId, slideId);
      if (slideInfo.success && slideInfo.data) {
        setSelectedSlide(slideInfo.data);
      }

      // Obtener elementos del slide
      const elements = await slidesService.getSlideElements(presentationId, slideId);
      if (elements.success && elements.data) {
        setSlideElements(elements.data);
      }

      if (elementId) {
        setSelectedElements(prev => [...prev, elementId]);
      }
    } catch (error) {
      console.error('Error al cargar elementos del slide:', error);
    }
  };

  const handleUpdateElements = async (elements: SlideElement[]) => {
    if (!selectedRow || !selectedSlide) return;

    try {
      if (!session?.accessToken) return;

      const slidesService = new SlidesService(session.accessToken);
      const presentationId = localStorage.getItem('connectedSlides');
      
      if (!presentationId) return;

      // Reemplazar variables en los elementos con datos de la fila seleccionada
      const updatedElements = elements.map(element => ({
        ...element,
        content: replaceVariables(element.content, selectedRow)
      }));

      await slidesService.updateSlideElements(presentationId, selectedSlide.id, updatedElements);
      setSlideElements(updatedElements);
    } catch (error) {
      console.error('Error al actualizar elementos:', error);
    }
  };

  const replaceVariables = (content: string, row: SelectedRow) => {
    return content.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return row[variable] || match;
    });
  };

  const filteredRows = rows.filter(row =>
    Object.values(row).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 relative">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en la hoja de cálculo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button
            onClick={() => handleUpdateElements(slideElements)}
            disabled={!selectedRow || !selectedSlide}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>

        <div className="bg-card rounded-lg shadow-sm flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <Table>
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${
                      selectedRow?.id === row.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleRowSelect(row)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRowSelect(row);
                      }
                    }}
                  >
                    {columns.map((column) => (
                      <td key={`${row.id}-${column}`} className="px-4 py-2 text-sm">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollArea>
        </div>
      </div>

      <SheetSliders
        token={session?.accessToken || ''}
        selectedSlide={selectedSlide}
        slideElements={slideElements}
        selectedElements={selectedElements}
        onSelectSlide={handleSlideSelect}
        onUpdateElements={handleUpdateElements}
        onUpdateSlideElements={setSlideElements}
        selectedRow={selectedRow || undefined}
        isOpen={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        className="w-[400px] shrink-0"
      />
    </div>
  );
} 