"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/componentes/ui/card';
import { ScrollArea } from '@/componentes/ui/scroll-area';
import { Button } from '@/componentes/ui/button';
import { Separator } from '@/componentes/ui/separator';
import { RotateCcw, Clock, User, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface CambioHistorial {
  id: string;
  idDiapositiva: string;
  idElemento: string;
  contenidoAnterior: string;
  contenidoNuevo: string;
  fecha: string;
  usuario: string;
}

interface PropiedadesHistorialCambios {
  cambios: CambioHistorial[];
  onRestaurar: (cambioId: string) => void;
}

export function HistorialCambios({
  cambios,
  onRestaurar
}: PropiedadesHistorialCambios) {
  // Agrupar cambios por fecha (hoy, ayer, esta semana, este mes)
  const agruparCambios = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    const grupos: Record<string, CambioHistorial[]> = {
      'Hoy': [],
      'Ayer': [],
      'Esta semana': [],
      'Este mes': [],
      'Anteriores': []
    };
    
    cambios.forEach(cambio => {
      const fechaCambio = new Date(cambio.fecha);
      
      if (fechaCambio >= hoy) {
        grupos['Hoy'].push(cambio);
      } else if (fechaCambio >= ayer) {
        grupos['Ayer'].push(cambio);
      } else if (fechaCambio >= inicioSemana) {
        grupos['Esta semana'].push(cambio);
      } else if (fechaCambio >= inicioMes) {
        grupos['Este mes'].push(cambio);
      } else {
        grupos['Anteriores'].push(cambio);
      }
    });
    
    return grupos;
  };
  
  const cambiosAgrupados = agruparCambios();
  
  // Función para truncar texto largo
  const truncarTexto = (texto: string, longitud: number = 50) => {
    if (texto.length <= longitud) return texto;
    return texto.substring(0, longitud) + '...';
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Historial de Cambios</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {cambios.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay cambios registrados.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(cambiosAgrupados).map(([grupo, cambiosGrupo]) => 
                cambiosGrupo.length > 0 && (
                  <div key={grupo}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">{grupo}</h3>
                    <div className="space-y-4">
                      {cambiosGrupo.map(cambio => (
                        <div key={cambio.id} className="bg-muted/30 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(cambio.fecha), { addSuffix: true, locale: es })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{cambio.usuario}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Diapositiva: {cambio.idDiapositiva}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRestaurar(cambio.id)}
                            >
                              <RotateCcw className="h-3 w-3 mr-2" />
                              Restaurar
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Contenido anterior:</div>
                              <div className="text-sm bg-background p-2 rounded">
                                {truncarTexto(cambio.contenidoAnterior)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Contenido nuevo:</div>
                              <div className="text-sm bg-background p-2 rounded">
                                {truncarTexto(cambio.contenidoNuevo)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-4" />
                  </div>
                )
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 