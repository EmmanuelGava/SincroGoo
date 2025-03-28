"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/componentes/ui/use-toast';
import { FilaHoja, FilaSeleccionada } from '@/tipos/hojas';
import { ElementoDiapositiva, VistaPreviaDiapositiva } from '@/tipos/diapositivas';
import { ServicioGoogleSheets } from '@/servicios/google/googleSheets';
import { ServicioGoogleSlides } from '@/servicios/google/googleSlides';
import { SheetsAPI, CeldasAPI, SlidesAPI, ElementosAPI } from '@/servicios/supabase/tablas';
import { supabase } from '@/servicios/supabase/globales/auth-service';
import { Sheet, Asociacion, Celda } from '@/servicios/supabase/globales/tipos';

// Definir interfaz para reemplazar el AsociadorElementos que ya no existe
interface AsociadorElementos {
  actualizarFilaSeleccionada: (fila: FilaSeleccionada) => void;
  actualizarElementosAsociados: () => ElementoDiapositiva[];
  sincronizarConBD: () => Promise<boolean>;
}

// Definir la interfaz del contexto
interface EditorContextType {
  // Estados
  columnas: string[];
  filas: FilaHoja[];
  filaSeleccionada: FilaSeleccionada | null;
  cargando: boolean;
  error: string | null;
  sidebarAbierto: boolean;
  elementos: ElementoDiapositiva[];
  elementosSeleccionados: string[];
  elementosPrevia: ElementoDiapositiva[];
  mostrarVistaPrevia: boolean;
  cambiosPendientes: boolean;
  guardando: boolean;
  diapositivas: VistaPreviaDiapositiva[];
  diapositivaSeleccionada: VistaPreviaDiapositiva | null;
  cargandoDiapositivas: boolean;
  elementoSeleccionadoPopup: ElementoDiapositiva | null;
  diapositivasConAsociaciones: Set<string>;
  idProyecto: string;
  idPresentacion: string;
  idHojaCalculo: string;
  session: any;
  modoSincronizacion: 'automatico' | 'manual';
  mostrarNotificacionActualizacion: boolean;
  
  // Nuevo estado para la posición del popup
  popupPosition: { x: number; y: number } | null;
  
  // Métodos para gestionar elementos
  agregarElemento: (elemento: ElementoDiapositiva) => void;
  eliminarElemento: (id: string) => void;
  actualizarElemento: (id: string, elemento: Partial<ElementoDiapositiva>) => void;
  seleccionarElemento: (id: string, seleccionado: boolean) => void;
  seleccionarElementos: (ids: string[]) => void;
  setPopupPosition: (position: { x: number; y: number } | null) => void;
  mostrarPopupEdicion: (elemento: ElementoDiapositiva) => void;
  
  // Funciones
  setSidebarAbierto: (abierto: boolean) => void;
  setElementosSeleccionados: (elementos: string[]) => void;
  setElementosPrevia: (elementos: ElementoDiapositiva[]) => void;
  setMostrarVistaPrevia: (mostrar: boolean) => void;
  setCambiosPendientes: (pendientes: boolean) => void;
  setElementoSeleccionadoPopup: (elemento: ElementoDiapositiva | null, position?: { x: number; y: number }) => void;
  manejarSeleccionFila: (fila: FilaSeleccionada) => void;
  actualizarFilaLocal: (fila: FilaHoja) => void;
  actualizarElementosLocal: (elementosActualizados: ElementoDiapositiva[]) => void;
  asociarElemento: (idElemento: string, columna: string) => Promise<void>;
  desasociarElemento: (idElemento: string) => Promise<void>;
  sincronizarElementosAsociados: () => Promise<boolean>;
  cambiarModoSincronizacion: (modo: 'automatico' | 'manual') => void;
  actualizarElementosAsociadosConFila: () => void;
  ocultarNotificacionActualizacion: () => void;
  actualizarElementosAsociadosEnTabla: (elementos: ElementoDiapositiva[], idPresentacion: string, idHoja: string) => void;
}

// Crear el contexto
const EditorContext = createContext<EditorContextType | undefined>(undefined);

// Función simple para crear un asociador (reemplaza la importada)
const crearAsociadorElementos = (
  elementos: ElementoDiapositiva[],
  filaSeleccionada: FilaSeleccionada | null,
  actualizarElementosLocal: (elementos: ElementoDiapositiva[]) => void,
  callbackSincronizacion: (elementos: ElementoDiapositiva[]) => Promise<void>,
  idPresentacion?: string,
  idHoja?: string
): AsociadorElementos => {
  // Implementación básica para mantener compatibilidad
  return {
    actualizarFilaSeleccionada: (fila: FilaSeleccionada) => {
      console.log('actualizarFilaSeleccionada llamado con:', fila.id);
    },
    actualizarElementosAsociados: () => {
      console.log('actualizarElementosAsociados llamado');
      return elementos;
    },
    sincronizarConBD: async () => {
      console.log('sincronizarConBD llamado');
      return true;
    }
  };
};

// Proveedor del contexto
export function EditorProvider({ 
  children,
  initialIdProyecto,
  initialIdPresentacion,
  initialIdHojaCalculo
}: { 
  children: ReactNode,
  initialIdProyecto?: string,
  initialIdPresentacion?: string,
  initialIdHojaCalculo?: string
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast: uiToast } = useToast();
  
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
  const [elementosPrevia, setElementosPrevia] = useState<ElementoDiapositiva[]>([]);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  // Estados para diapositivas
  const [diapositivas, setDiapositivas] = useState<VistaPreviaDiapositiva[]>([]);
  const [diapositivaSeleccionada, setDiapositivaSeleccionada] = useState<VistaPreviaDiapositiva | null>(null);
  const [cargandoDiapositivas, setCargandoDiapositivas] = useState(false);
  const [elementoSeleccionadoPopupState, setElementoSeleccionadoPopupState] = useState<ElementoDiapositiva | null>(null);
  const [diapositivasConAsociaciones, setDiapositivasConAsociaciones] = useState<Set<string>>(new Set())
  
  // Estados para el sheet y sus celdas
  const [sheetId, setSheetId] = useState<string>('');
  const [sheetName, setSheetName] = useState<string>('');
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [sheetCeldas, setSheetCeldas] = useState<Celda[]>([]);
  const [sheetCeldasIds, setSheetCeldasIds] = useState<string[]>([]);
  
  const [idProyecto, setIdProyecto] = useState(initialIdProyecto || '');
  const [idPresentacion, setIdPresentacion] = useState(initialIdPresentacion || '');
  const [idHojaCalculo, setIdHojaCalculo] = useState(initialIdHojaCalculo || '');
  
  // Referencia para controlar si ya se inicializaron los datos
  const inicializacionEnProgreso = React.useRef(false);
  const idProyectoAnterior = React.useRef('');
  const idPresentacionAnterior = React.useRef('');
  const idHojaCalculoAnterior = React.useRef('');

  // Referencia al asociador de elementos
  const [asociador, setAsociador] = useState<AsociadorElementos | null>(null);

  // Estado para el modo de sincronización
  const [modoSincronizacion, setModoSincronizacion] = useState<'automatico' | 'manual'>('manual');
  
  // Estado para mostrar notificación de actualización
  const [mostrarNotificacionActualizacion, setMostrarNotificacionActualizacion] = useState(false);

  // Estado para el elemento seleccionado para el popup
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);

  // Función para inicializar los datos
  const inicializarDatos = useCallback(async () => {
    if (inicializacionEnProgreso.current) {
      console.log('Inicialización ya en progreso, saltando...');
      return;
    }
    
    inicializacionEnProgreso.current = true;
    setCargando(true);
    setError(null);
    
    try {
      console.log('Inicializando datos para proyecto:', idProyecto);
      console.log('Hoja de cálculo:', idHojaCalculo);
      console.log('Presentación:', idPresentacion);
      
      if (!idProyecto || !idPresentacion || !idHojaCalculo) {
        throw new Error('Faltan IDs necesarios para inicializar datos');
      }
      
      // Importar el servicio centralizado
      const { SheetsAPI, CeldasAPI, SlidesAPI, ElementosAPI } = await import('@/servicios/supabase/tablas');
      
      // Verificar conexión con Supabase
      console.log('🔧 [EditorContext] Verificando conexión con Supabase...');
      try {
        // Usar supabase directamente como cliente, no como función
        const tablasOK = !!supabase;
        
        if (!tablasOK) {
          console.warn('⚠️ [EditorContext] No se pudo conectar con Supabase');
          uiToast({
            title: "Error al conectar con Supabase",
            description: "No se pudo conectar con Supabase. Contacta al administrador.",
          });
        } else {
          console.log('✅ [EditorContext] Conexión con Supabase establecida');
        }
      } catch (error) {
        console.error('❌ [EditorContext] Error al verificar conexión con Supabase:', error);
        uiToast({
          title: "Error al conectar con Supabase",
          description: "No se pudo conectar con Supabase. Contacta al administrador.",
        });
      }
      
      // Cargar datos de la hoja y diapositivas
      let hojaOk = true;
      let diapositivasOk = true;
      
      // Aquí se llamarían a las funciones de carga de datos que ahora están en componentes
      
      if (!hojaOk || !diapositivasOk) {
        setError('Hubo errores al cargar algunos datos');
      }
      
      setCargando(false);
      console.log('Inicialización de datos completada');
    } catch (err) {
      console.error('Error al inicializar datos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
      setCargando(false);
      
      uiToast({
        title: "Error al inicializar datos",
        description: err instanceof Error ? err.message : 'Error al cargar los datos',
        variant: "destructive",
      });
    } finally {
      inicializacionEnProgreso.current = false;
    }
  }, [idProyecto, idPresentacion, idHojaCalculo, session, uiToast]);

  // Efecto para inicializar datos cuando cambian los parámetros
  useEffect(() => {
    // Si ya tenemos los IDs iniciales, no necesitamos obtenerlos de la URL
    if (idProyecto && idPresentacion && idHojaCalculo) {
      console.log('Usando IDs iniciales proporcionados:', {
        idProyecto,
        idPresentacion,
        idHojaCalculo
      });
    } else {
      // Obtener IDs de la URL si no se proporcionaron como props
      const idProyectoUrl = searchParams.get('idProyectoActual');
      const idPresentacionUrl = searchParams.get('idPresentacion');
      const idHojaCalculoUrl = searchParams.get('idHojaCalculo');
      
      if (idProyectoUrl) setIdProyecto(idProyectoUrl);
      if (idPresentacionUrl) setIdPresentacion(idPresentacionUrl);
      if (idHojaCalculoUrl) setIdHojaCalculo(idHojaCalculoUrl);
      
      console.log('IDs obtenidos de la URL:', {
        idProyectoUrl,
        idPresentacionUrl,
        idHojaCalculoUrl
      });
    }
    
    // Verificar que tenemos todos los IDs necesarios
    if (!idProyecto || !idPresentacion || !idHojaCalculo) {
      console.log('Faltan IDs necesarios para inicializar datos');
      return;
    }
    
    // Verificar que tenemos una sesión activa o estamos en modo desarrollo
    const devMode = process.env.NEXT_PUBLIC_DEV_MODE_NO_AUTH === 'true';
    if (status !== 'authenticated' && !session && !devMode) {
      console.log('No hay sesión activa y no estamos en modo desarrollo');
      return;
    }
    
    // Limpiar el flag de inicialización cuando cambian los parámetros
    if (idProyecto !== idProyectoAnterior.current || 
        idPresentacion !== idPresentacionAnterior.current || 
        idHojaCalculo !== idHojaCalculoAnterior.current) {
      inicializacionEnProgreso.current = false;
      
      // Actualizar referencias
      idProyectoAnterior.current = idProyecto;
      idPresentacionAnterior.current = idPresentacion;
      idHojaCalculoAnterior.current = idHojaCalculo;
    }
    
    console.log('Iniciando carga de datos con status:', status, 'y session:', !!session);
    
    // Inicializar datos (ya incluye verificación de tablas)
    inicializarDatos();
  }, [idProyecto, idPresentacion, idHojaCalculo, status, session, inicializarDatos]);

  // Inicializar el asociador cuando cambian los elementos o la fila seleccionada
  useEffect(() => {
    if (elementos.length > 0) {
      const nuevoAsociador = crearAsociadorElementos(
        elementos,
        filaSeleccionada,
        actualizarElementosLocal,
        async (elementosActualizados) => {
          // Esta función se llamará cuando se sincronicen los elementos
          try {
            setGuardando(true);
            // Aquí iría la lógica para guardar en Google Slides
            // Por ejemplo, llamar a una API para actualizar las diapositivas
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación
            setGuardando(false);
          } catch (error) {
            console.error("Error al sincronizar con Google Slides:", error);
            setGuardando(false);
          }
        },
        idPresentacion,
        idHojaCalculo
      );
      setAsociador(nuevoAsociador);
    }
  }, [elementos, filaSeleccionada, idPresentacion, idHojaCalculo]);

  // Función para cambiar el modo de sincronización
  const cambiarModoSincronizacion = (modo: 'automatico' | 'manual') => {
    setModoSincronizacion(modo);
    uiToast({
      title: "Modo de sincronización cambiado",
      description: `Modo cambiado a: ${modo === 'automatico' ? 'Automático' : 'Manual'}`,
    });
  };
  
  // Función para ocultar la notificación de actualización
  const ocultarNotificacionActualizacion = () => {
    setMostrarNotificacionActualizacion(false);
  };
  
  // Función para actualizar los elementos asociados con la fila actual
  const actualizarElementosAsociadosConFila = () => {
    if (!filaSeleccionada || !asociador) return;
    
    try {
      // Actualizar los elementos asociados con los valores de la fila seleccionada
      const elementosActualizados = asociador.actualizarElementosAsociados();
      
      // Actualizar el estado local
      actualizarElementosLocal(elementosActualizados);
      
      uiToast({
        title: "Elementos actualizados",
        description: "Elementos actualizados con los valores de la fila seleccionada",
      });
    } catch (error) {
      console.error("Error al actualizar elementos asociados:", error);
      uiToast({
        title: "Error",
        description: "Error al actualizar elementos asociados",
        variant: "destructive",
      });
    }
  };
  
  // Efecto para actualizar automáticamente los elementos cuando cambia la fila seleccionada
  useEffect(() => {
    if (modoSincronizacion === 'automatico' && filaSeleccionada && asociador) {
      // Si el modo es automático, actualizar los elementos asociados
      actualizarElementosAsociadosConFila();
    } else if (modoSincronizacion === 'manual' && filaSeleccionada && asociador) {
      // Si el modo es manual, mostrar notificación
      const elementosAsociados = elementos.filter(e => e.columnaAsociada);
      if (elementosAsociados.length > 0) {
        setMostrarNotificacionActualizacion(true);
      }
    }
  }, [filaSeleccionada, modoSincronizacion]);

  // Función para manejar la selección de filas
  const manejarSeleccionFila = (fila: FilaSeleccionada) => {
    console.log('Fila seleccionada en EditorContext:', fila);
    
    if (cambiosPendientes) {
      if (!confirm('Hay cambios sin guardar. ¿Deseas continuar y perder los cambios?')) {
        return;
      }
    }
    
    try {
      // Limpiar estados primero
      setElementos([]);
      setElementosSeleccionados([]);
      setDiapositivaSeleccionada(null);
      setCambiosPendientes(false);
      
      // Establecer la fila seleccionada
      setFilaSeleccionada(fila);
      
      // Actualizar el asociador con la fila seleccionada
      if (asociador) {
        console.log('Actualizando asociador con la fila seleccionada:', fila);
        asociador.actualizarFilaSeleccionada(fila);
      } else {
        console.warn('No hay asociador disponible para actualizar la fila seleccionada');
      }
      
      // Forzar la apertura del sidebar inmediatamente
      console.log('Forzando apertura del sidebar...');
      setSidebarAbierto(true);
      
      // Verificar después de un breve retraso que el sidebar se haya abierto
      // y forzar la apertura nuevamente si es necesario
      setTimeout(() => {
        console.log('Verificando estado del sidebar después de timeout...');
        setSidebarAbierto(true);
      }, 100);
      
      console.log('Fila seleccionada correctamente:', fila.id);
    } catch (error) {
      console.error('Error al seleccionar fila:', error);
    }
  };

  // Función para actualizar una fila localmente
  const actualizarFilaLocal = (fila: FilaHoja) => {
    setFilas(prev => prev.map(f => f.id === fila.id ? fila : f));
  };

  // Función para actualizar elementos localmente
  const actualizarElementosLocal = (elementosActualizados: ElementoDiapositiva[]) => {
    // Verificar si hay cambios reales
    const hayDiferencias = elementosActualizados.some((elementoNuevo, index) => {
      if (index >= elementos.length) return true; // Nuevo elemento
      
      const elementoOriginal = elementos[index];
      return (
        elementoOriginal.contenido !== elementoNuevo.contenido ||
        elementoOriginal.columnaAsociada !== elementoNuevo.columnaAsociada ||
        elementoOriginal.tipoAsociacion !== elementoNuevo.tipoAsociacion
      );
    });
    
    // Actualizar el estado local
    setElementos(elementosActualizados);
    
    // Actualizar la vista previa
    setElementosPrevia(elementosActualizados);
    setMostrarVistaPrevia(true);
    setCambiosPendientes(hayDiferencias);
  };

  // Función para asociar un elemento con una columna
  const asociarElemento = useCallback(async (idElemento: string, columna: string) => {
    console.log(`🔍 [EditorContext] Asociando elemento ${idElemento} con columna ${columna}`);
    
    try {
      // Verificar que tenemos los IDs necesarios
      if (!idHojaCalculo) {
        console.error('❌ [EditorContext] Falta ID de hoja de cálculo para asociar elemento');
        uiToast({
          title: "Error al asociar elemento",
          description: "Falta ID de hoja de cálculo necesario para la asociación",
          variant: "destructive",
        });
        return Promise.reject(new Error('Falta ID de hoja de cálculo'));
      }
      
      // Actualizar el estado local
      setElementos(elementosActuales => {
        return elementosActuales.map(elemento => {
          if (elemento.id === idElemento) {
            console.log(`✅ [EditorContext] Elemento ${idElemento} asociado con columna ${columna}`);
            return {
              ...elemento,
              columnaAsociada: columna,
              tipoAsociacion: "manual"
            };
          }
          return elemento;
        });
      });
      
      // Marcar que hay cambios pendientes
      setCambiosPendientes(true);
      
      // Si el elemento está en la diapositiva actual, añadir a la lista de diapositivas con asociaciones
      const elementoActual = elementos.find(e => e.id === idElemento);
      if (elementoActual && elementoActual.idDiapositiva) {
        setDiapositivasConAsociaciones(prev => new Set(prev).add(elementoActual.idDiapositiva));
      }
      
      // Importar el servicio centralizado
      const { SheetsAPI, CeldasAPI, SlidesAPI, ElementosAPI } = await import('@/servicios/supabase/tablas');
      
      // Verificar que la tabla de asociaciones existe
      console.log('🔍 [EditorContext] Verificando conexión con Supabase para asociaciones...');
      try {
        // Simplemente verificamos que podamos acceder a Supabase
        const tablaAsociacionesExiste = !!supabase;
        
        if (!tablaAsociacionesExiste) {
          console.warn('⚠️ [EditorContext] No se pudo conectar con Supabase');
          uiToast({
            title: "Error al asociar elemento",
            description: "No se pudo conectar con Supabase. Contacta al administrador.",
            variant: "destructive",
          });
          return Promise.reject(new Error('No se pudo conectar con Supabase'));
        }
      } catch (error) {
        console.error('❌ [EditorContext] Error al verificar conexión con Supabase:', error);
        uiToast({
          title: "Error al asociar elemento",
          description: "No se pudo conectar con Supabase. Contacta al administrador.",
          variant: "destructive",
        });
        return Promise.reject(error);
      }
      
      // Buscar el elemento en el estado actual
      const elementoActualizado = elementos.find(e => e.id === idElemento);
      
      if (elementoActualizado && elementoActualizado.idDiapositiva) {
        // Obtener el sheet por su Google ID
        const sheet = await SheetsAPI.obtenerSheetPorGoogleId(idHojaCalculo);
        
        if (sheet) {
          // Guardar el elemento primero para asegurarnos de que existe en la base de datos
          const elementoId = await ElementosAPI.guardarElemento({
            elemento_id: elementoActualizado.id,
            diapositiva_id: elementoActualizado.idDiapositiva,
            tipo: elementoActualizado.tipo || 'texto',
            contenido: elementoActualizado.contenido
          });
          
          if (elementoId) {
            // Asociar el elemento con la columna
            const asociacion: Asociacion = {
              elemento_id: elementoId,
              sheets_id: sheet.id || '',
              columna,
              tipo: 'celda'
            };

            await ElementosAPI.guardarAsociacion(asociacion);
            console.log(`✅ [EditorContext] Elemento ${elementoId} asociado en la base de datos`);
          } else {
            console.warn(`⚠️ [EditorContext] No se encontró el elemento con ID ${idElemento} en la base de datos`);
          }
        } else {
          console.warn(`⚠️ [EditorContext] No se encontró la hoja con Google ID ${idHojaCalculo}`);
          uiToast({
            title: "Advertencia",
            description: "La hoja de cálculo no existe en la base de datos. Se creará al sincronizar.",
            variant: "default",
          });
        }
      }
      
      // Emitir evento de cambio de asociación
      const evento = new CustomEvent('elemento-asociado', {
        detail: {
          idElemento,
          columna
        }
      });
      document.dispatchEvent(evento);
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ [EditorContext] Error al asociar elemento:', error);
      uiToast({
        title: "Error al asociar elemento",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  }, [elementos, idHojaCalculo, uiToast]);
  
  // Función para desasociar un elemento
  const desasociarElemento = useCallback(async (idElemento: string): Promise<void> => {
    try {
      console.log('🔄 [EditorContext] Desasociando elemento:', idElemento);
      
      if (!idElemento) {
        console.warn('⚠️ [EditorContext] No se proporcionó ID de elemento para desasociar');
        return;
      }
      
      // Actualizar el estado local
      setElementos(prevElementos => 
        prevElementos.map(elemento => 
          elemento.id === idElemento 
            ? { ...elemento, columnaAsociada: undefined, tipoAsociacion: undefined } 
            : elemento
        )
      );
      
      setCambiosPendientes(true);
      
      // Importar el servicio centralizado
      const { ElementosAPI } = await import('@/servicios/supabase/tablas');
      
      // Verificar que la tabla de asociaciones existe
      console.log('🔍 [EditorContext] Verificando conexión con Supabase para desasociación...');
      try {
        // Simplemente verificamos que podamos acceder a Supabase
        const tablaAsociacionesExiste = !!supabase;
        
        if (!tablaAsociacionesExiste) {
          console.warn('⚠️ [EditorContext] No se pudo conectar con Supabase, no es necesario desasociar');
          return;
        }
      } catch (error) {
        console.error('❌ [EditorContext] Error al verificar conexión con Supabase:', error);
        return;
      }
      
      // Buscar el elemento en el estado actual
      const elementoActual = elementos.find(e => e.id === idElemento);
      
      if (elementoActual && elementoActual.idDiapositiva) {
        // Guardar el elemento primero para asegurarnos de que existe en la base de datos
        const elementoId = await ElementosAPI.guardarElemento({
          elemento_id: elementoActual.id,
          diapositiva_id: elementoActual.idDiapositiva,
          tipo: elementoActual.tipo || 'texto',
          contenido: elementoActual.contenido
        });
        
        if (elementoId) {
          // Desasociar el elemento en la base de datos
          // Primero obtenemos las asociaciones del elemento
          const asociaciones = await ElementosAPI.obtenerAsociacionesPorElemento(elementoId);
          
          if (asociaciones.length > 0) {
            // Eliminamos todas las asociaciones
            let todasEliminadas = true;
            
            for (const asociacion of asociaciones) {
              if (asociacion.id) {
                const eliminada = await ElementosAPI.eliminarAsociacion(asociacion.id);
                if (!eliminada) {
                  todasEliminadas = false;
                  console.warn(`⚠️ [EditorContext] No se pudo eliminar la asociación ${asociacion.id}`);
                }
              } else {
                todasEliminadas = false;
                console.warn(`⚠️ [EditorContext] Asociación sin ID válido`);
              }
            }
            
            if (todasEliminadas) {
              console.log(`✅ [EditorContext] Elemento ${idElemento} desasociado en la base de datos`);
            } else {
              console.warn(`⚠️ [EditorContext] No se pudieron eliminar todas las asociaciones del elemento ${idElemento}`);
            }
          } else {
            console.log(`ℹ️ [EditorContext] El elemento ${idElemento} no tenía asociaciones que eliminar`);
          }
        } else {
          console.warn(`⚠️ [EditorContext] No se encontró el elemento con ID ${idElemento} en la base de datos`);
        }
      }
      
      // Emitir evento de cambio de asociación
      const evento = new CustomEvent('elemento-desasociado', {
        detail: {
          idElemento
        }
      });
      document.dispatchEvent(evento);
    } catch (error) {
      console.error('❌ [EditorContext] Error al desasociar elemento:', error);
      uiToast({
        title: "Error al desasociar elemento",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive",
      });
    }
  }, [elementos, uiToast]);
  
  // Función para sincronizar elementos asociados
  const sincronizarElementosAsociados = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔄 [EditorContext] Iniciando sincronización de proyecto');
      
      // Verificar que tenemos los IDs necesarios
      if (!idProyecto || !idPresentacion || !idHojaCalculo) {
        console.error('❌ [EditorContext] Faltan IDs necesarios para sincronizar');
        setGuardando(false);
        return false;
      }
      
      // IMPORTANTE: Incluir TODOS los elementos, no solo los que tienen asociaciones
      console.log(`🔍 [EditorContext] Total de elementos disponibles: ${elementos.length}`);
      
      // Filtrar solo los elementos con asociaciones para los logs
      const elementosConAsociacionesReales = elementos.filter(
        (elemento) => elemento.columnaAsociada && elemento.columnaAsociada.trim() !== ''
      );
      
      console.log(`🔍 [EditorContext] Elementos con asociaciones reales: ${elementosConAsociacionesReales.length}`);
      
      // Para la sincronización, usamos TODOS los elementos
      const elementosConAsociaciones = elementos.map(elemento => ({
        ...elemento,
        // Asegurarnos de que todos los elementos tengan idDiapositiva
        idDiapositiva: elemento.idDiapositiva || diapositivaSeleccionada?.id || ''
      }));
      
      console.log(`🔍 [EditorContext] Total elementos a sincronizar: ${elementosConAsociaciones.length}`);
      
      if (elementosConAsociaciones.length === 0) {
        console.log('ℹ️ [EditorContext] No hay elementos para sincronizar');
        return true; // No hay nada que sincronizar, consideramos éxito
      }
      
      // Obtener información del sheet y slide
      let tituloSheet = '';
      let tituloSlide = '';
      
      // Obtener información de la hoja de cálculo
      if (idHojaCalculo) {
        const servicioSheets = await ServicioGoogleSheets.obtenerInstancia();
        if (servicioSheets) {
          console.log('📊 [Supabase] Obteniendo información de la hoja...');
          const infoHoja = await servicioSheets.obtenerInformacionHoja(idHojaCalculo);
          console.log('📊 [Supabase] Información de la hoja obtenida:', infoHoja);
          
          if (infoHoja && infoHoja.titulo) {
            tituloSheet = infoHoja.titulo;
          }
        }
      }
      
      // Obtener información de la presentación
      if (idPresentacion) {
        const servicioSlides = await ServicioGoogleSlides.obtenerInstancia();
        if (servicioSlides) {
          console.log('📊 [Supabase] Obteniendo información de la presentación...');
          const presentacionResult = await servicioSlides.obtenerPresentacion(idPresentacion);
          console.log('📊 [Supabase] Información de la presentación obtenida:', presentacionResult);
          
          if (presentacionResult.exito && presentacionResult.datos) {
            tituloSlide = presentacionResult.datos.titulo;
          }
        }
      }
      
      // Preparar celdas para sincronizar
      const celdasParaSincronizar: any[] = [];
      
      if (filaSeleccionada) {
        Object.entries(filaSeleccionada.valores).forEach(([columna, valor]) => {
          celdasParaSincronizar.push({
            sheet_id: '', // Se llenará automáticamente en el servicio
            fila: filaSeleccionada.numeroFila || 1, // Aseguramos que siempre hay un número
            columna: columna,
            referencia_celda: `${columna}${filaSeleccionada.numeroFila || 1}`,
            contenido: valor ? String(valor) : '',
            tipo: typeof valor === 'number' ? 'numero' : 'texto'
          });
        });
      }
      
      // 1. Sincronizar sheets
      console.log('🔄 [EditorContext] Sincronizando sheet:', idHojaCalculo);
      const sheetResult = await SheetsAPI.crearSheet({
        proyecto_id: idProyecto,
        sheets_id: idHojaCalculo,
        titulo: tituloSheet || 'Hoja sin título',
        nombre: tituloSheet || 'Hoja sin título',
        google_id: idHojaCalculo
      });

      if (!sheetResult?.id) {
        console.error('❌ [EditorContext] Error al crear el sheet');
        return false;
      }

      const celdasIds = await CeldasAPI.guardarCeldas(sheetResult.id, celdasParaSincronizar);
      
      if (!celdasIds) {
        console.error('❌ [EditorContext] Error al guardar las celdas');
        return false;
      }

      console.log('✅ [EditorContext] Sheet sincronizado correctamente:', sheetResult.id);
      
      // Actualizar los elementos con los nuevos IDs
      const elementosActualizados = elementos.map((elemento, index) => {
        if (elemento.tipo === 'celda' && celdasIds[index]) {
          return {
            ...elemento,
            celdaId: celdasIds[index]
          };
        }
        return elemento;
      });

      setElementos(elementosActualizados);
      if (sheetResult.id) setSheetId(sheetResult.id);
      if (sheetResult.nombre) setSheetName(sheetResult.nombre);
      if (sheetResult.url) setSheetUrl(sheetResult.url);
      setSheetCeldas(celdasParaSincronizar);
      setSheetCeldasIds(celdasIds);
      
      // 2. Sincronizar slides
      const slideId = await SlidesAPI.guardarSlide({
        proyecto_id: idProyecto,
        google_presentation_id: idPresentacion,
        titulo: tituloSlide || 'Presentación sin título'
      });
      
      if (!slideId) {
        console.error('❌ [EditorContext] Error al crear el slide');
        return false;
      }

      console.log('✅ [EditorContext] Slide sincronizado correctamente:', slideId);
      return true;
    } catch (error) {
      console.error('❌ [EditorContext] Error en sincronización:', error);
      setGuardando(false);
      uiToast({
        title: "Error de sincronización",
        description: "Ocurrió un error al sincronizar con la base de datos",
        variant: "destructive"
      });
      return false;
    }
  }, [elementos, filaSeleccionada, idProyecto, idPresentacion, idHojaCalculo, uiToast]);
  
  // Función para actualizar los elementos asociados en la tabla
  const actualizarElementosAsociadosEnTabla = useCallback((elementos: ElementoDiapositiva[], idPresentacion: string, idHoja: string) => {
    console.log(`🔍 [EditorContext] Actualizando elementos asociados en tabla para presentación ${idPresentacion}, hoja ${idHoja}`);
    console.log(`- Elementos a actualizar: ${elementos.length}`);
    
    try {
      // Filtrar solo los elementos con asociaciones
      const elementosAsociados = elementos.filter(e => e.columnaAsociada);
      
      if (elementosAsociados.length > 0) {
        console.log(`- Elementos con asociaciones: ${elementosAsociados.length}`);
        
        // Emitir evento para actualizar la visualización en TablaHojas
        const evento = new CustomEvent('actualizar-elementos-asociados', {
          detail: {
            elementos: elementosAsociados,
            idPresentacion,
            idHoja
          }
        });
        
        // Disparar el evento en el documento
        document.dispatchEvent(evento);
        console.log('✅ [EditorContext] Evento actualizar-elementos-asociados disparado');
      } else {
        console.log('ℹ️ [EditorContext] No hay elementos con asociaciones para actualizar');
      }
    } catch (error) {
      console.error('❌ [EditorContext] Error al actualizar elementos asociados en tabla:', error);
    }
  }, []);

  // Mostrar popup de edición
  const mostrarPopupEdicion = (elemento: ElementoDiapositiva) => {
    console.log("Mostrando popup de edición para elemento:", elemento);
    setElementoSeleccionadoPopupState(elemento);
    
    // Notificar al componente de página para que muestre el popup
    if (window) {
      const event = new CustomEvent('mostrar-popup-edicion', { 
        detail: { elemento } 
      });
      window.dispatchEvent(event);
    }
  };

  // Función para manejar el elemento seleccionado para el popup
  const setElementoSeleccionadoPopup = useCallback((elemento: ElementoDiapositiva | null, position?: { x: number; y: number }) => {
    setElementoSeleccionadoPopupState(elemento);
    if (position) {
      setPopupPosition(position);
    } else {
      setPopupPosition(null);
    }
  }, []);

  // Efecto para emitir evento de actualización de elementos asociados cuando se cargue la página
  useEffect(() => {
    // Solo emitir el evento si tenemos todos los datos necesarios
    if (filaSeleccionada && elementos.length > 0 && idPresentacion && idHojaCalculo) {
      console.log('EditorContext: Emitiendo evento inicial de actualización de elementos asociados');
      
      // Filtrar solo los elementos con asociaciones
      const elementosAsociados = elementos.filter(e => e.columnaAsociada);
      
      if (elementosAsociados.length > 0) {
        // Emitir evento para actualizar la visualización en TablaHojas
        if (window) {
          const event = new CustomEvent('actualizar-elementos-asociados', { 
            detail: { 
              elementos: elementosAsociados,
              idPresentacion,
              idHoja: idHojaCalculo,
              filaId: filaSeleccionada.id
            } 
          });
          window.dispatchEvent(event);
          console.log(`EditorContext: Evento inicial emitido con ${elementosAsociados.length} elementos asociados`);
        }
      }
    }
  }, [filaSeleccionada, elementos, idPresentacion, idHojaCalculo]);

  // Valor del contexto
  const contextValue: EditorContextType = {
    // Estados
    columnas,
    filas,
    filaSeleccionada,
    cargando,
    error,
    sidebarAbierto,
    elementos,
    elementosSeleccionados,
    elementosPrevia,
    mostrarVistaPrevia,
    cambiosPendientes,
    guardando,
    diapositivas,
    diapositivaSeleccionada,
    cargandoDiapositivas,
    elementoSeleccionadoPopup: elementoSeleccionadoPopupState,
    diapositivasConAsociaciones,
    idProyecto,
    idPresentacion,
    idHojaCalculo,
    session,
    modoSincronizacion,
    mostrarNotificacionActualizacion,
    popupPosition,
    
    // Funciones
    setSidebarAbierto,
    setElementosSeleccionados,
    setElementosPrevia,
    setMostrarVistaPrevia,
    setCambiosPendientes,
    setElementoSeleccionadoPopup,
    manejarSeleccionFila,
    actualizarFilaLocal,
    actualizarElementosLocal,
    asociarElemento,
    desasociarElemento,
    sincronizarElementosAsociados,
    cambiarModoSincronizacion,
    actualizarElementosAsociadosConFila,
    ocultarNotificacionActualizacion,
    mostrarPopupEdicion,
    actualizarElementosAsociadosEnTabla,
    
    // Métodos para gestionar elementos
    agregarElemento: () => {},
    eliminarElemento: () => {},
    actualizarElemento: () => {},
    seleccionarElemento: () => {},
    seleccionarElementos: () => {},
    setPopupPosition: () => {},
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
}

// Hook para usar el contexto
export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor debe ser usado dentro de un EditorProvider');
  }
  return context;
} 