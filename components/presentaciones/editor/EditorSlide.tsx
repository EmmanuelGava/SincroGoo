import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, Undo } from 'lucide-react';
import type { SlideElement } from '@/types/slides';

interface EditorSlideProps {
  slideId: string;
  elements: SlideElement[];
  onSave: (elements: SlideElement[]) => Promise<void>;
  onPreview: (elements: SlideElement[]) => void;
  loading?: boolean;
}

interface ElementEdit {
  id: string;
  originalContent: string;
  newContent: string;
  variables: string[];
}

export function EditorSlide({ 
  slideId, 
  elements, 
  onSave, 
  onPreview,
  loading = false 
}: EditorSlideProps) {
  const [editedElements, setEditedElements] = useState<ElementEdit[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar elementos editables
  useEffect(() => {
    const initialElements = elements.map(element => ({
      id: element.id,
      originalContent: element.content,
      newContent: element.content,
      variables: extractVariables(element.content)
    }));
    setEditedElements(initialElements);
  }, [elements]);

  // Extraer variables del formato {{variable}}
  const extractVariables = (content: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.match(regex);
    return matches ? matches.map(match => match.slice(2, -2)) : [];
  };

  // Actualizar contenido de un elemento
  const handleElementChange = (elementId: string, newContent: string) => {
    setEditedElements(prev => prev.map(el => 
      el.id === elementId 
        ? { ...el, newContent, variables: extractVariables(newContent) }
        : el
    ));
  };

  // Restaurar contenido original
  const handleRestore = (elementId: string) => {
    setEditedElements(prev => prev.map(el =>
      el.id === elementId
        ? { ...el, newContent: el.originalContent, variables: extractVariables(el.originalContent) }
        : el
    ));
  };

  // Guardar cambios
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedElements = editedElements.map(el => ({
        id: el.id,
        content: el.newContent,
        slideId
      }));
      await onSave(updatedElements);
    } finally {
      setIsSaving(false);
    }
  };

  // Previsualizar cambios
  const handlePreview = () => {
    const previewElements = editedElements.map(el => ({
      id: el.id,
      content: el.newContent,
      slideId
    }));
    onPreview(previewElements);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Editor de Diapositiva</h3>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={loading || isSaving}
            >
              Previsualizar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-15rem)] pr-4">
          <div className="space-y-6">
            {editedElements.map((element) => (
              <div key={element.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Elemento ID: {element.id}
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(element.id)}
                    disabled={element.newContent === element.originalContent}
                  >
                    <Undo className="mr-2 h-4 w-4" />
                    Restaurar
                  </Button>
                </div>
                
                <Input
                  value={element.newContent}
                  onChange={(e) => handleElementChange(element.id, e.target.value)}
                  placeholder="Contenido del elemento..."
                  disabled={loading || isSaving}
                />

                {element.variables.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Variables detectadas:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {element.variables.map((variable, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 