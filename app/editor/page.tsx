"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import TablaHojas from '@/components/sheets/editor/TablaHojas';
import { EditorDiapositiva } from '@/componentes/presentaciones/editor/EditorDiapositiva';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ServicioGoogleSheets } from '@/servicios/googleSheets';
import { ServicioGoogleSlides } from '@/servicios/googleSlides';
import { FilaHoja, FilaSeleccionada } from '@/tipos/hojas';
import { ElementoDiapositiva, VistaPreviaDiapositiva, ActualizacionElemento, ActualizacionDiapositiva } from '@/tipos/diapositivas';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft, LinkIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EditorElementos } from '@/componentes/editor/EditorElementos';
import { EditorElementoPopup } from '@/componentes/editor/EditorElementoPopup';
import { EncabezadoSitio } from '@/components/EncabezadoSitio';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PaginaEditor() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  // Estados para la tabla
  const [columnas, setColumnas] = useState<string[]>([]);
  const [filas, setFilas] = useState<FilaHoja[]>([]);
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaSeleccionada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el sidebar y diapositivas
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [elementos, setElementos] = useState<ElementoDiapositiva[]>([]);
  const [elementosSeleccionados, setElementosSeleccionados] = useState<string[]>([]);
  const [diapositivaSeleccionada, setDiapositivaSeleccionada] = useState<VistaPreviaDiapositiva>();
  const [guardandoCambios, setGuardandoCambios] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  
  // Estados para vista previa
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [elementosPrevia, setElementosPrevia] = useState<ElementoDiapositiva[]>([]);

  // Nuevo estado para las diapositivas
  const [diapositivas, setDiapositivas] = useState<VistaPreviaDiapositiva[]>([]);
  const [cargandoDiapositivas, setCargandoDiapositivas] = useState(false);

  const [elementoEditando, setElementoEditando] = useState<ElementoDiapositiva | null>(null)
  const [popupAbierto, setPopupAbierto] = useState(false)

  const idProyecto = searchParams.get('proyectoId');
  const idPresentacion = searchParams.get('presentacionId');
  const idHojaCalculo = searchParams.get('hojaCalculoId');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (!idProyecto) {
      router.push('/proyectos');
      return;
    }

    const inicializarDatos = async () => {
      if (idPresentacion && idHojaCalculo) {
        await Promise.all([
          cargarDatosHoja(),
          cargarDiapositivas()
        ]);
      }
    };

    inicializarDatos();
  }, [status, idProyecto, idPresentacion, idHojaCalculo]);

  const cargarDatosHoja = async () => {
    if (!session?.accessToken || !idHojaCalculo) return;
    
    try {
      setCargando(true);
      setError(null);
      const servicioSheets = await ServicioGoogleSheets.obtenerInstancia();
      if (!servicioSheets) {
        throw new Error('No se pudo inicializar el servicio de Google Sheets');
      }
      
      const resultado = await servicioSheets.obtenerDatosHoja(idHojaCalculo, 0);
      
      if (resultado.exito && resultado.datos) {
        const columnasHoja = resultado.datos.columnas;
        const filasHoja = resultado.datos.filas.map((fila, index) => ({
          id: `fila-${index}`,
          valores: columnasHoja.reduce((acc, columna) => ({
            ...acc,
            [columna]: fila[columna] || ''
          }), {}),
          ultimaActualizacion: new Date(),
          numeroFila: index + 1
        }));

        console.log('Columnas procesadas:', columnasHoja);
        console.log('Filas procesadas:', filasHoja);

        setColumnas(columnasHoja);
        setFilas(filasHoja);
        
        toast({
          title: "Datos cargados",
          description: `Se cargaron ${filasHoja.length} filas de datos.`,
        });
      } else {
        throw new Error(resultado.error || 'Error al cargar los datos de la hoja');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido al cargar los datos');
      toast({
        variant: "destructive",
        title: "Error al cargar datos",
        description: error instanceof Error ? error.message : 'Error desconocido al cargar los datos',
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarDiapositivas = async () => {
    if (!session?.accessToken || !idPresentacion) return;
    
    try {
      setCargandoDiapositivas(true);
      const servicioSlides = await ServicioGoogleSlides.obtenerInstancia();
      if (!servicioSlides) {
        throw new Error('No se pudo inicializar el servicio de Google Slides');
      }
      
      const resultado = await servicioSlides.obtenerVistasPrevias(idPresentacion);
      
      if (resultado.exito && resultado.datos) {
        console.log('Diapositivas cargadas:', resultado.datos);
        setDiapositivas(resultado.datos);
      } else {
        throw new Error(resultado.error || 'Error al cargar las diapositivas');
      }
    } catch (error) {
      console.error('Error al cargar diapositivas:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar diapositivas",
        description: error instanceof Error ? error.message : 'Error desconocido al cargar las diapositivas',
      });
    } finally {
      setCargandoDiapositivas(false);
    }
  };

  const manejarSeleccionFila = (fila: FilaSeleccionada) => {
    if (cambiosPendientes) {
      if (!confirm('Hay cambios sin guardar. ¿Deseas continuar y perder los cambios?')) {
        return;
      }
    }
    
    setFilaSeleccionada(fila);
    setSidebarAbierto(true);
    setElementos([]);
    setElementosSeleccionados([]);
    setDiapositivaSeleccionada(undefined);
    setCambiosPendientes(false);
  };

  const manejarSeleccionDiapositiva = async (idDiapositiva: string, idElemento: string | null) => {
    if (!session?.accessToken || !idPresentacion) return;
    
    try {
      const servicioSlides = await ServicioGoogleSlides.obtenerInstancia();
      if (!servicioSlides) {
        throw new Error('No se pudo inicializar el servicio de Google Slides');
      }

      // Actualizar la diapositiva seleccionada
      const diapositivaActual = diapositivas.find(d => d.id === idDiapositiva);
      if (!diapositivaActual) {
        throw new Error('No se encontró la diapositiva seleccionada');
      }
      
      setDiapositivaSeleccionada(diapositivaActual);
      setElementos([]); // Limpiar elementos mientras se cargan los nuevos
      setElementosSeleccionados([]);
      
      // Obtener elementos de la diapositiva
      const resultado = await servicioSlides.obtenerElementos(idPresentacion, idDiapositiva);
      
      if (resultado.exito && resultado.datos) {
        console.log('Elementos cargados:', resultado.datos);
        setElementos(resultado.datos);
        if (idElemento) {
          setElementosSeleccionados([idElemento]);
        }
      } else {
        throw new Error(resultado.error || 'Error al cargar los elementos de la diapositiva');
      }
    } catch (error) {
      console.error('Error al cargar elementos:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar diapositiva",
        description: error instanceof Error ? error.message : 'Error desconocido al cargar la diapositiva',
      });
    }
  };

  const previsualizarCambios = (elementosNuevos: ElementoDiapositiva[]) => {
    setElementosPrevia(elementosNuevos);
    setMostrarVistaPrevia(true);
    setCambiosPendientes(true);
  };

  const actualizarElementos = async (elementosActualizados: ElementoDiapositiva[]) => {
    if (!session?.accessToken || !idPresentacion || !diapositivaSeleccionada) return;
    
    try {
      setGuardandoCambios(true);
      const servicioSlides = await ServicioGoogleSlides.obtenerInstancia();
      if (!servicioSlides) {
        throw new Error('No se pudo inicializar el servicio de Google Slides');
      }
      
      const actualizacion: ActualizacionDiapositiva = {
        elementos: elementosActualizados,
        idDiapositiva: diapositivaSeleccionada.id
      };
      
      const resultado = await servicioSlides.actualizarElementos(idPresentacion, actualizacion);
      
      if (resultado.exito) {
        // Actualizar el estado local
        setElementos(elementosActualizados);
        
        // Actualizar la vista previa de la diapositiva
        const nuevasDiapositivas = diapositivas.map(d => 
          d.id === diapositivaSeleccionada.id 
            ? { ...d, elementos: elementosActualizados }
            : d
        );
        setDiapositivas(nuevasDiapositivas);
        
        setCambiosPendientes(false);
        setMostrarVistaPrevia(false);
        
        // Recargar la diapositiva para asegurar que tenemos los últimos cambios
        await manejarSeleccionDiapositiva(diapositivaSeleccionada.id, null);
        
        toast({
          title: "Cambios guardados",
          description: "Los cambios se han guardado correctamente en la diapositiva.",
        });
      } else {
        throw new Error(resultado.error || 'Error al guardar los cambios');
      }
    } catch (error) {
      console.error('Error al actualizar elementos:', error);
      toast({
        variant: "destructive",
        title: "Error al guardar cambios",
        description: error instanceof Error ? error.message : 'Error desconocido al guardar los cambios',
      });
      throw error;
    } finally {
      setGuardandoCambios(false);
    }
  };

  const actualizarFila = async (fila: FilaHoja) => {
    try {
      const servicioSheets = await ServicioGoogleSheets.obtenerInstancia()
      if (!servicioSheets) {
        throw new Error('No se pudo inicializar el servicio de Google Sheets')
      }

      // Aquí iría la lógica para actualizar la fila en Google Sheets
      // Por ahora solo actualizamos el estado local
      setFilas(prev => prev.map(f => f.id === fila.id ? fila : f))
      
      toast({
        title: "Fila actualizada",
        description: "Los cambios se han guardado correctamente.",
      })
    } catch (error) {
      console.error('Error al actualizar fila:', error)
      toast({
        variant: "destructive",
        title: "Error al actualizar fila",
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    }
  }

  const manejarActualizacionElemento = (elementoActualizado: ElementoDiapositiva) => {
    const nuevosElementos = elementos.map(elemento =>
      elemento.id === elementoActualizado.id ? elementoActualizado : elemento
    )
    setElementos(nuevosElementos)
    previsualizarCambios(nuevosElementos)
  }

  if (status === 'loading' || cargando) {
    return (
      <div className="min-h-screen bg-background">
        <EncabezadoSitio />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!idPresentacion || !idHojaCalculo) {
    return (
      <div className="min-h-screen bg-background">
        <EncabezadoSitio />
        <main className="container mx-auto py-8 px-4">
          <div className="flex items-center mb-8">
            <Button variant="outline" onClick={() => router.push('/proyectos')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Proyectos
            </Button>
            <h1 className="ml-4 text-2xl font-bold">Editor de Sincronización</h1>
          </div>
          
          <div className="max-w-3xl mx-auto mt-12">
            <Alert className="mb-6">
              <AlertDescription>
                <div className="flex flex-col gap-4">
                  <p>Para usar el editor de sincronización, necesitas conectar una presentación de Google Slides y una hoja de cálculo de Google Sheets.</p>
                  <Button asChild>
                    <Link href={`/proyectos/${idProyecto}/conectar`}>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Conectar documentos ahora
                    </Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EncabezadoSitio />
      
      <main className="container mx-auto py-8 px-4">
        <div className="flex flex-col space-y-4">
          {/* Encabezado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => router.push('/proyectos')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <h1 className="text-2xl font-bold">Editor de Sincronización</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Selecciona datos de la hoja de cálculo y edita los elementos de las diapositivas
            </p>
          </div>

          {/* Mensajes de error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Tabla de hojas */}
          <TablaHojas
            columnas={columnas}
            filas={filas}
            cargando={cargando}
            filaSeleccionada={filaSeleccionada}
            onSeleccionarFila={manejarSeleccionFila}
            onActualizarFila={actualizarFila}
          />
          
          {/* Sidebar con diapositivas */}
          <Sheet open={sidebarAbierto} onOpenChange={setSidebarAbierto}>
            <SheetContent side="right" className="w-[600px] p-0 overflow-hidden">
              <div className="flex flex-col h-full">
                <SheetHeader className="p-4 pb-2">
                  <SheetTitle>Editor de Diapositiva</SheetTitle>
                </SheetHeader>
                
                {cargandoDiapositivas ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
                    {/* Contenedor de diapositivas (60% del alto) */}
                    <div className="h-[60%] overflow-hidden p-4 pb-2">
                      <h3 className="text-lg font-semibold mb-2">Diapositivas</h3>
                      <div className="h-[calc(100%-30px)] border rounded-md overflow-hidden">
                        <ScrollArea className="h-full">
                          <div className="grid grid-cols-2 gap-3 p-3">
                            {diapositivas.map((diapositiva) => (
                              <div
                                key={diapositiva.id}
                                className={`cursor-pointer transition-all border rounded-md overflow-hidden hover:ring-2 hover:ring-primary ${
                                  diapositivaSeleccionada?.id === diapositiva.id ? 'ring-2 ring-primary bg-accent/20' : ''
                                }`}
                                onClick={() => manejarSeleccionDiapositiva(diapositiva.id, null)}
                              >
                                <div className="aspect-video relative overflow-hidden">
                                  <img
                                    src={diapositiva.urlImagen}
                                    alt={diapositiva.titulo}
                                    className="w-full h-full object-contain bg-white"
                                  />
                                </div>
                                <div className="p-2">
                                  <p className="text-xs font-medium truncate">{diapositiva.titulo}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                    
                    {/* Contenedor de elementos (40% del alto) */}
                    <div className="h-[40%] overflow-hidden p-4 pt-2">
                      <EditorElementos
                        token={session?.accessToken || ''}
                        diapositivaSeleccionada={diapositivaSeleccionada}
                        elementos={elementos}
                        elementosSeleccionados={elementosSeleccionados}
                        alSeleccionarDiapositiva={manejarSeleccionDiapositiva}
                        alActualizarElementos={actualizarElementos}
                        alActualizarElementosDiapositiva={previsualizarCambios}
                        filaSeleccionada={filaSeleccionada}
                        abierto={sidebarAbierto}
                        alCambiarApertura={setSidebarAbierto}
                        diapositivas={diapositivas}
                        onEditarElemento={(elemento) => {
                          setElementoEditando(elemento)
                          setPopupAbierto(true)
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Popup de edición de elemento */}
          {elementoEditando && filaSeleccionada && (
            <EditorElementoPopup
              elemento={elementoEditando}
              filaSeleccionada={filaSeleccionada}
              abierto={popupAbierto}
              alCerrar={() => {
                setPopupAbierto(false)
                setElementoEditando(null)
              }}
              alGuardar={manejarActualizacionElemento}
            />
          )}
        </div>
      </main>
    </div>
  );
} 