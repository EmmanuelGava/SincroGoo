"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, ArrowUpDown, RotateCcw } from "lucide-react"
import { useState, useEffect } from "react"
import { ElementoDiapositiva } from "@/tipos/diapositivas"

interface CambioHistorial {
  id: string;
  fecha: Date;
  usuario: string;
  diapositiva: string;
  elemento: string;
  contenidoAnterior: string;
  contenidoNuevo: string;
}

interface HistorialCambiosProps {
  abierto: boolean;
  onCerrar: () => void;
  onRestaurar: (elementoId: string, contenido: string) => void;
  idPresentacion?: string;
  idDiapositiva?: string;
}

export function HistorialCambios({
  abierto,
  onCerrar,
  onRestaurar,
  idPresentacion,
  idDiapositiva
}: HistorialCambiosProps) {
  const [cargando, setCargando] = useState(false);
  const [cambios, setCambios] = useState<CambioHistorial[]>([]);
  const [filtroElemento, setFiltroElemento] = useState<string | null>(null);
  
  // Simulación de datos de historial
  // En una implementación real, estos datos vendrían de una API
  const cambiosSimulados: CambioHistorial[] = [
    {
      id: "1",
      fecha: new Date(Date.now() - 3600000), // 1 hora atrás
      usuario: "Usuario Actual",
      diapositiva: "Diapositiva 1",
      elemento: "Título",
      contenidoAnterior: "Título Original",
      contenidoNuevo: "Nuevo Título Actualizado"
    },
    {
      id: "2",
      fecha: new Date(Date.now() - 7200000), // 2 horas atrás
      usuario: "Usuario Actual",
      diapositiva: "Diapositiva 2",
      elemento: "Párrafo",
      contenidoAnterior: "Texto original del párrafo con información básica.",
      contenidoNuevo: "Texto actualizado con información más detallada y precisa sobre el tema."
    },
    {
      id: "3",
      fecha: new Date(Date.now() - 86400000), // 1 día atrás
      usuario: "Otro Usuario",
      diapositiva: "Diapositiva 1",
      elemento: "Subtítulo",
      contenidoAnterior: "Subtítulo original",
      contenidoNuevo: "Subtítulo modificado con palabras clave"
    }
  ];
  
  // Cargar historial de cambios
  const cargarHistorial = async () => {
    setCargando(true);
    try {
      // Aquí iría la llamada a la API para obtener el historial real
      // Por ahora usamos datos simulados
      setTimeout(() => {
        setCambios(cambiosSimulados);
        setCargando(false);
      }, 800);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      setCargando(false);
    }
  };
  
  // Cargar historial cuando se abre el diálogo
  useEffect(() => {
    if (abierto) {
      cargarHistorial();
    }
  }, [abierto]);
  
  // Formatear fecha
  const formatearFecha = (fecha: Date) => {
    return new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(fecha);
  };
  
  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Historial de Cambios
          </DialogTitle>
          <DialogDescription>
            Revisa los cambios realizados en esta diapositiva y restaura versiones anteriores si es necesario
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-between my-2">
          <div className="text-sm text-muted-foreground">
            {idDiapositiva ? `Mostrando cambios para la diapositiva actual` : 'Mostrando todos los cambios'}
          </div>
          
          <Button variant="outline" size="sm" onClick={cargarHistorial} disabled={cargando}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {cargando ? 'Cargando...' : 'Actualizar'}
          </Button>
        </div>
        
        <ScrollArea className="flex-1 mt-2">
          {cambios.length > 0 ? (
            <div className="space-y-4">
              {cambios.map((cambio) => (
                <div key={cambio.id} className="border rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{cambio.elemento} en {cambio.diapositiva}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatearFecha(cambio.fecha)} por {cambio.usuario}
                      </p>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onRestaurar(cambio.elemento, cambio.contenidoAnterior)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restaurar
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Contenido Anterior</h4>
                      <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                        {cambio.contenidoAnterior || <em className="text-muted-foreground">Vacío</em>}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Contenido Nuevo</h4>
                      <div className="bg-primary/5 border-primary/20 border p-3 rounded-md text-sm whitespace-pre-wrap">
                        {cambio.contenidoNuevo || <em className="text-muted-foreground">Vacío</em>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {cargando ? (
                <p>Cargando historial de cambios...</p>
              ) : (
                <p>No hay cambios registrados para esta diapositiva</p>
              )}
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onCerrar}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 