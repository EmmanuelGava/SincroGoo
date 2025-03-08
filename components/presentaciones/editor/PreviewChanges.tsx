import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { PreviewChange } from '@/types/slides';

interface PreviewChangesProps {
  changes: PreviewChange[];
  onApply: () => Promise<void>;
  onCancel: () => void;
}

export function PreviewChanges({ changes, onApply, onCancel }: PreviewChangesProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Vista Previa de Cambios</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
          <div className="space-y-6">
            {changes.map((change, index) => (
              <div key={`${change.slideId}-${change.elementId}`} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Elemento ID: {change.elementId}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Diapositiva ID: {change.slideId}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Contenido Original:
                    </label>
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-sm whitespace-pre-wrap">
                        {change.oldContent}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Nuevo Contenido:
                    </label>
                    <div className="rounded-md bg-primary/5 p-3">
                      <p className="text-sm whitespace-pre-wrap">
                        {change.newContent}
                      </p>
                    </div>
                  </div>

                  {change.variables.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Variables Detectadas:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {change.variables.map((variable, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                          >
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {index < changes.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Cancelar
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Aplicar Cambios
          </button>
        </div>
      </CardContent>
    </Card>
  );
} 