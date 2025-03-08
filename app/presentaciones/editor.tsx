"use client"

import React, { useState } from 'react';
import { EditorDiapositiva } from '@/componentes/presentaciones/editor/EditorDiapositiva';
import { VistaPreviaCambios } from '@/componentes/presentaciones/editor/VistaPreviaCambios';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import type { ElementoDiapositiva, CambioPrevio } from '@/tipos/diapositivas';
import { useRouter } from 'next/navigation';

interface PropiedadesEditor {
  idPresentacion: string;
  idDiapositiva: string;
  elementos: ElementoDiapositiva[];
  onVolver: () => void;
  onGuardar: (elementos: ElementoDiapositiva[]) => Promise<void>;
}

export default function EditorPresentacion({
  idPresentacion,
  idDiapositiva,
  elementos,
  onVolver,
  onGuardar
}: PropiedadesEditor) {
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [cambios, setCambios] = useState<CambioPrevio[]>([]);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const manejarPreview = (elementosNuevos: ElementoDiapositiva[]) => {
    const cambiosPreview = elementosNuevos.map(nuevo => {
      const original = elementos.find(el => el.id === nuevo.id);
      return {
        idDiapositiva,
        idElemento: nuevo.id,
        contenidoAnterior: original?.contenido || '',
        contenidoNuevo: nuevo.contenido,
        variables: extraerVariables(nuevo.contenido)
      };
    }).filter(cambio => cambio.contenidoAnterior !== cambio.contenidoNuevo);

    setCambios(cambiosPreview);
    setMostrarPreview(true);
  };

  const extraerVariables = (contenido: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const coincidencias = contenido.match(regex);
    return coincidencias ? coincidencias.map(match => match.slice(2, -2)) : [];
  };

  const manejarGuardado = async (elementos: ElementoDiapositiva[]) => {
    try {
      setCargando(true);
      await onGuardar(elementos);
      setMostrarPreview(false);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior */}
      <div className="border-b">
        <div className="container mx-auto py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onVolver}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <h1 className="text-xl font-semibold">Editor de Diapositiva</h1>
            <Button disabled={cargando}>
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto py-6">
        <EditorDiapositiva
          idDiapositiva={idDiapositiva}
          elementos={elementos}
          alGuardar={manejarGuardado}
          alPrevisualizar={manejarPreview}
          alCancelar={() => router.push('/presentaciones')}
          cargando={cargando}
        />
      </div>

      {/* Modal de vista previa */}
      <Sheet open={mostrarPreview} onOpenChange={setMostrarPreview}>
        <SheetContent side="right" className="w-[90vw] sm:w-[600px]">
          <SheetHeader>
            <SheetTitle>Vista Previa de Cambios</SheetTitle>
          </SheetHeader>
          <VistaPreviaCambios
            cambios={cambios}
            alAplicar={async () => {
              const elementosActualizados = elementos.map(el => {
                const cambio = cambios.find(c => c.idElemento === el.id);
                return cambio ? { ...el, contenido: cambio.contenidoNuevo } : el;
              });
              await manejarGuardado(elementosActualizados);
            }}
            alCancelar={() => setMostrarPreview(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
} 