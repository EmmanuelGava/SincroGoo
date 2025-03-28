"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { EditorDiapositiva } from '@/app/presentaciones/componentes/editor/EditorSimplificado';
import { VistaPreviaCambios } from '@/app/presentaciones/componentes/editor/VistaPreviaCambios';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/componentes/ui/sheet';
import { Button } from '@/componentes/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import type { ElementoDiapositiva, CambioPrevio, ActualizacionDiapositiva } from '@/tipos/diapositivas';
import { useRouter, useSearchParams } from 'next/navigation';
import { ServicioGoogleSlides } from '@/servicios/google/googleSlides';

function EditorPresentacionesContent() {
  const [elementos, setElementos] = useState<ElementoDiapositiva[]>([]);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [cambios, setCambios] = useState<CambioPrevio[]>([]);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const idPresentacion = searchParams.get('idPresentacion') || '';
  const idDiapositiva = searchParams.get('idDiapositiva') || '';
  
  useEffect(() => {
    const cargarElementos = async () => {
      if (idPresentacion && idDiapositiva) {
        setCargando(true);
        try {
          const servicio = await ServicioGoogleSlides.obtenerInstancia();
          if (servicio) {
            const resultado = await servicio.obtenerElementos(idPresentacion, idDiapositiva);
            if (resultado.exito && resultado.datos) {
              setElementos(resultado.datos);
            } else {
              console.error('Error al cargar elementos:', resultado.error);
            }
          }
        } catch (error) {
          console.error('Error al cargar elementos:', error);
        } finally {
          setCargando(false);
        }
      }
    };
    
    cargarElementos();
  }, [idPresentacion, idDiapositiva]);

  const manejarPreview = (elementosNuevos: ElementoDiapositiva[]) => {
    const cambiosPreview = elementosNuevos.map(nuevo => {
      const original = elementos.find(el => el.id === nuevo.id);
      const contenido = nuevo.contenido || '';
      return {
        idDiapositiva,
        idElemento: nuevo.id,
        contenidoAnterior: original?.contenido || '',
        contenidoNuevo: contenido,
        variables: extraerVariables(contenido)
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

  const manejarGuardado = async (elementosActualizados: ElementoDiapositiva[]) => {
    try {
      setCargando(true);
      const servicio = await ServicioGoogleSlides.obtenerInstancia();
      if (servicio) {
        // Actualizar cada elemento individualmente
        for (const elemento of elementosActualizados) {
          const actualizacion: ActualizacionDiapositiva = {
            idDiapositiva,
            elementos: elementosActualizados
          };
          await servicio.actualizarElemento(
            idPresentacion,
            idDiapositiva,
            elemento,
            actualizacion
          );
        }
      }
      setMostrarPreview(false);
      setElementos(elementosActualizados);
    } catch (error) {
      console.error('Error al guardar elementos:', error);
    } finally {
      setCargando(false);
    }
  };

  const manejarVolver = () => {
    router.push('/presentaciones');
  };

  if (!idPresentacion || !idDiapositiva) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="mb-4">Faltan parámetros necesarios para editar la diapositiva.</p>
        <Button onClick={() => router.push('/presentaciones')}>
          Volver a Presentaciones
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior */}
      <div className="border-b">
        <div className="container mx-auto py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={manejarVolver}>
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
        {cargando && elementos.length === 0 ? (
          <div className="text-center py-12">
            <p>Cargando elementos de la diapositiva...</p>
          </div>
        ) : (
          <EditorDiapositiva
            idDiapositiva={idDiapositiva}
            elementos={elementos}
            alGuardar={manejarGuardado}
            alPrevisualizar={manejarPreview}
            alCancelar={manejarVolver}
            cargando={cargando}
          />
        )}
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

export default function EditorPresentacionesPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <EditorPresentacionesContent />
    </Suspense>
  )
} 