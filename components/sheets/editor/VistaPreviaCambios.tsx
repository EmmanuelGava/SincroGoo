import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import type { CambioPrevio } from '@/tipos/diapositivas';

interface PropiedadesVistaPreviaCambios {
  cambios: CambioPrevio[];
  alAplicar: () => Promise<void>;
  alCancelar: () => void;
}

export function VistaPreviaCambios({ 
  cambios, 
  alAplicar, 
  alCancelar 
}: PropiedadesVistaPreviaCambios) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Vista Previa de Cambios</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
          <div className="space-y-6">
            {cambios.map((cambio, indice) => (
              <div key={`${cambio.idDiapositiva}-${cambio.idElemento}`} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    ID del Elemento: {cambio.idElemento}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    ID de Diapositiva: {cambio.idDiapositiva}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Contenido Original:
                    </label>
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-sm whitespace-pre-wrap">
                        {cambio.contenidoAnterior}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Contenido Nuevo:
                    </label>
                    <div className="rounded-md bg-primary/5 p-3">
                      <p className="text-sm whitespace-pre-wrap">
                        {cambio.contenidoNuevo}
                      </p>
                    </div>
                  </div>

                  {cambio.variables.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Variables Detectadas:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {cambio.variables.map((variable, idx) => (
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

                {indice < cambios.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-2 mt-6">
          <Button
            variant="outline"
            onClick={alCancelar}
          >
            Cancelar
          </Button>
          <Button
            onClick={alAplicar}
          >
            Aplicar Cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 