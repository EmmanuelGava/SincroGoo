"use client"

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/componentes/ui/use-toast';
import { ServicioGoogleSheets } from '@/servicios/google/googleSheets';
import { ServicioGoogleSlides } from '@/servicios/google/googleSlides';
import { SincronizacionAPI, SlidesAPI, ElementosAPI, CeldasAPI, SheetsAPI } from '@/servicios/supabase/globales/index-service';
import { SincroGooAPI } from '@/servicios/supabase/globales/sincroGooAPI';
import { Celda, Sheet, Slide, Diapositiva } from '@/servicios/supabase/globales/tipos';
import { FilaHoja } from '@/tipos/hojas';
import { VistaPreviaDiapositiva } from '@/tipos/diapositivas';
import { syncSupabaseSession, supabase } from '@/servicios/supabase/globales/index';
import { ProyectosService } from '@/servicios/supabase/tablas/proyectos-service';

interface UseInicializacionProps {
  onDatosHojaCargados?: (columnas: string[], filas: FilaHoja[]) => void;
  onDatosPresentacionCargados?: (presentacion: any, diapositivas: any[]) => void;
  onDiapositivaSeleccionada?: (diapositiva: any, elementos: any[]) => void;
  onError?: (error: string) => void;
}

interface UseInicializacionResult {
  idProyecto: string;
  idPresentacion: string;
  idHojaCalculo: string;
  cargando: boolean;
  error: string | null;
  recargarDatos: () => Promise<void>;
  operacionesEnSegundoPlano: boolean;
}

export function useInicializacion({
  onDatosHojaCargados,
  onDatosPresentacionCargados,
  onDiapositivaSeleccionada,
  onError
}: UseInicializacionProps = {}): UseInicializacionResult {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [idProyecto, setIdProyecto] = useState('');
  const [idPresentacion, setIdPresentacion] = useState('');
  const [idHojaCalculo, setIdHojaCalculo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operacionesEnSegundoPlano, setOperacionesEnSegundoPlano] = useState(false);
  
  // Referencias para controlar la inicialización
  const inicializacionEnProgreso = useRef(false);
  const inicializacionCompletada = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const ultimosIdsRef = useRef({ proyecto: '', presentacion: '', hoja: '' });

  // Función para cargar datos de la hoja
  const cargarDatosHoja = async (idHoja: string): Promise<boolean> => {
    if (!session?.accessToken || !idHoja) {
      console.log('No hay token de acceso o ID de hoja de cálculo');
      return false;
    }
    
    try {
      console.log('📊 [Debug] Iniciando carga de datos de hoja:', idHoja);
      const servicioSheets = await ServicioGoogleSheets.obtenerInstancia();
      if (!servicioSheets) {
        console.error('No se pudo inicializar el servicio de Google Sheets');
        throw new Error('No se pudo inicializar el servicio de Google Sheets');
      }
      
      console.log('✅ [Debug] Servicio de Google Sheets inicializado correctamente');
      const resultado = await servicioSheets.obtenerDatosHoja(idHoja, 0);
      console.log('📊 [Debug] Resultado de obtenerDatosHoja:', resultado);
      
      if (resultado.exito && resultado.datos) {
        console.log('📊 [Debug] Procesando datos recibidos:', resultado.datos);
        
        // Obtener la primera hoja
        const hoja = resultado.datos.hojas[0];
        console.log('📊 [Debug] Primera hoja:', hoja);
        
        if (!hoja || !hoja.columnas || !hoja.filas) {
          console.error('❌ [Debug] Datos de hoja inválidos');
          throw new Error('Los datos de la hoja están incompletos o son inválidos');
        }

        // Procesar columnas
        const columnasHoja = hoja.columnas;
        console.log('📊 [Debug] Columnas encontradas:', columnasHoja);

        // Procesar filas
        const filasHoja = hoja.filas.map((fila: any, index: number) => ({
          id: `fila-${index + 1}`,
          valores: columnasHoja.reduce((acc: Record<string, any>, columna: string) => ({
            ...acc,
            [columna]: fila[columna] || ''
          }), {}),
          ultimaActualizacion: new Date(),
          numeroFila: index + 1
        }));

        console.log('📊 [Debug] Filas procesadas:', {
          cantidad: filasHoja.length,
          muestra: filasHoja.slice(0, 2)
        });

        // Llamar al callback con los datos procesados
        if (onDatosHojaCargados) {
          console.log('📊 [Debug] Notificando datos procesados:', {
            columnas: columnasHoja.length,
            filas: filasHoja.length
          });
          onDatosHojaCargados(columnasHoja, filasHoja);
        }
        
        toast({
          title: "Datos cargados",
          description: `Se cargaron ${filasHoja.length} filas de datos.`,
        });
        
        return true;
      } else {
        console.error('❌ [Debug] Error en resultado:', resultado.error);
        throw new Error(resultado.error || 'Error al cargar los datos de la hoja');
      }
    } catch (error) {
      console.error('❌ [Debug] Error al cargar datos:', error);
      const mensajeError = error instanceof Error ? error.message : 'Error desconocido al cargar los datos';
      
      if (onError) {
        onError(mensajeError);
      }
      
      setError(mensajeError);
      
      toast({
        variant: "destructive",
        title: "Error al cargar datos",
        description: mensajeError,
      });
      
      return false;
    }
  };

  // Efecto para inicializar datos cuando cambia el estado de la sesión o los IDs
  useEffect(() => {
    // Evitar ejecuciones innecesarias
    const idProyectoActual = searchParams.get('idProyectoActual');
    const idPresentacionActual = searchParams.get('idPresentacion');
    const idHojaCalculoActual = searchParams.get('idHojaCalculo');
    
    // Verificar si los IDs han cambiado realmente
    const idsCambiados = 
      idProyectoActual !== ultimosIdsRef.current.proyecto ||
      idPresentacionActual !== ultimosIdsRef.current.presentacion ||
      idHojaCalculoActual !== ultimosIdsRef.current.hoja;

    console.log('🔍 [Debug] Verificando inicialización:', {
      status,
      idProyectoActual,
      inicializacionCompletada: inicializacionCompletada.current,
      idsCambiados
    });

    // Si ya se completó la inicialización y los IDs no han cambiado, no hacer nada
    if (inicializacionCompletada.current && !idsCambiados) {
      console.log('✅ [Debug] Inicialización ya completada, omitiendo');
      return;
    }
    
    // Actualizar los IDs en el ref
    ultimosIdsRef.current = {
      proyecto: idProyectoActual || '',
      presentacion: idPresentacionActual || '',
      hoja: idHojaCalculoActual || ''
    };
    
    // Guardar los IDs en variables de estado
    setIdProyecto(idProyectoActual || '');
    setIdPresentacion(idPresentacionActual || '');
    setIdHojaCalculo(idHojaCalculoActual || '');
    
    // Verificar si tenemos todos los datos necesarios para inicializar
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') {
        console.log('❌ [Debug] Usuario no autenticado, redirigiendo a login');
        router.push('/src/auth/login');
      }
      setCargando(false);
      return;
    }
    
    if (!idProyectoActual) {
      console.log('❌ [Debug] No hay ID de proyecto, redirigiendo a proyectos');
      router.push('/proyectos');
      return;
    }
    
    // Limpiar el flag de inicialización cuando cambian los parámetros
    if (idsCambiados) {
      console.log('🔄 [Debug] IDs cambiados, reiniciando inicialización');
      inicializacionEnProgreso.current = false;
      inicializacionCompletada.current = false;
    }
    
    // Limpiar timeout anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Crear nuevo timeout
    timeoutRef.current = setTimeout(() => {
      if (!inicializacionEnProgreso.current && !inicializacionCompletada.current) {
        inicializarDatos();
      }
    }, 0);
    
    // Limpiar al desmontar
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      inicializacionEnProgreso.current = false;
    };
  }, [searchParams, status, router]);

  // Función para procesar los datos de la hoja
  const procesarDatosHoja = (datos: any) => {
    console.log('📊 [Debug] Iniciando procesamiento de datos de hoja...', datos);

    if (!datos || !datos.hojas || !datos.hojas[0]) {
      console.error('❌ [Debug] Datos de hoja inválidos o vacíos');
      return { columnas: [], filas: [] };
    }

    // Obtener la primera hoja
    const primeraHoja = datos.hojas[0];
    console.log('📊 [Debug] Primera hoja:', primeraHoja);

    // Extraer columnas
    const columnas = primeraHoja.columnas || [];
    console.log('📊 [Debug] Columnas encontradas:', columnas);

    // Procesar filas
    const filas = (primeraHoja.filas || []).map((fila: any, index: number) => {
      // Crear objeto de valores
      const valores = columnas.reduce((acc: Record<string, any>, columna: string) => {
        acc[columna] = fila[columna] || '';
        return acc;
      }, {});

      return {
        id: `fila-${index + 1}`,
        valores,
        numeroFila: index + 1,
        ultimaActualizacion: new Date()
      };
    });

    console.log('📊 [Debug] Filas procesadas:', {
      total: filas.length,
      muestra: filas.slice(0, 2)
    });

    return { columnas, filas };
  };

  // Función para inicializar los datos
  const inicializarDatos = async (): Promise<boolean> => {
    // Evitar inicializaciones duplicadas
    if (inicializacionEnProgreso.current) {
      console.log('Inicialización ya en progreso, saltando...');
      return false;
    }
    
    try {
      console.log('🔄 [Debug] Iniciando inicialización de datos...');
      inicializacionEnProgreso.current = true;
      setCargando(true);
      setError(null);
      
      const idProyectoActual = searchParams.get('idProyectoActual') || '';
      const idPresentacionActual = searchParams.get('idPresentacion') || '';
      const idHojaCalculoActual = searchParams.get('idHojaCalculo') || '';
      
      // Establecer flag de primera vez para optimizar guardado de datos
      const esRecargaPagina = true; // Considerar inicialización como recarga para optimizar
      const primeraVezGuardado = false; // No verificar existentes para mejorar rendimiento
      
      console.log('🔍 [Debug] IDs obtenidos:', {
        idProyecto: idProyectoActual,
        idPresentacion: idPresentacionActual,
        idHojaCalculo: idHojaCalculoActual,
        esRecargaPagina,
        primeraVezGuardado
      });

      if (!idProyectoActual) {
        console.log('❌ [Debug] Falta ID de proyecto');
        setError('No se ha especificado un proyecto');
        setCargando(false);
        inicializacionEnProgreso.current = false;
        return false;
      }
      
      if (!idPresentacionActual && !idHojaCalculoActual) {
        console.log('❌ [Debug] Faltan IDs de presentación y hoja de cálculo');
        setError('No se ha especificado una presentación ni una hoja de cálculo');
        setCargando(false);
        inicializacionEnProgreso.current = false;
        return false;
      }
      
      // Sincronizar la sesión de Supabase
      console.log('🔄 [Debug] Intentando sincronizar sesión de Supabase...');
      if (session) {
        console.log('✅ [Debug] Sesión disponible:', session.user?.email);
        await syncSupabaseSession(session);
        console.log('✅ [Debug] Sesión sincronizada con Supabase');
      } else {
        console.warn('⚠️ [Debug] No hay sesión disponible para sincronizar con Supabase');
        // Intentar obtener la sesión del contexto de autenticación
        try {
          console.log('🔄 [Debug] Intentando obtener sesión de Supabase...');
          const { data: { session: supabaseSession } } = await supabase.auth.getSession();
          if (supabaseSession) {
            console.log('✅ [Debug] Usando sesión de Supabase existente:', supabaseSession.user?.email);
          } else {
            console.warn('⚠️ [Debug] No se pudo obtener una sesión de Supabase');
          }
        } catch (error) {
          console.error('❌ [Debug] Error al obtener sesión de Supabase:', error);
        }
      }

      // CARGAR DATOS ESENCIALES PARA LA INTERFAZ PRIMERO
      let datosHoja: { columnas: string[], filas: any[] } | null = null;
      let datosPresentacion: any = null;
      let diapositivasData: any[] = [];

      // Cargar datos de la hoja de cálculo para mostrar primero
      if (idHojaCalculoActual) {
        try {
          console.log('🔄 [Debug] Cargando datos esenciales de la hoja de cálculo:', idHojaCalculoActual);
          const servicioSheets = await ServicioGoogleSheets.obtenerInstancia();
          if (servicioSheets) {
            const resultadoHoja = await servicioSheets.obtenerDatosHoja(idHojaCalculoActual, 0);
            if (resultadoHoja.exito && resultadoHoja.datos) {
              console.log('✅ [Debug] Datos de hoja obtenidos, procesando para UI...');
              datosHoja = procesarDatosHoja(resultadoHoja.datos);
              
              // Notificar al componente padre inmediatamente
              if (onDatosHojaCargados && datosHoja) {
                console.log('🔄 [Debug] Notificando datos de hoja a la UI...');
                onDatosHojaCargados(datosHoja.columnas, datosHoja.filas);
                console.log('✅ [Debug] UI actualizada con datos de hoja');
              }
            }
          }
        } catch (error) {
          console.error('❌ [Debug] Error al cargar datos esenciales de hoja:', error);
        }
      }

      // Cargar datos esenciales de la presentación para mostrar primero
      if (idPresentacionActual) {
        try {
          console.log('🔄 [Debug] Cargando datos esenciales de la presentación:', idPresentacionActual);
          const servicioSlides = await ServicioGoogleSlides.obtenerInstancia();
          if (servicioSlides) {
            const resultadoPresentacion = await servicioSlides.obtenerPresentacion(idPresentacionActual);
            if (resultadoPresentacion.exito && resultadoPresentacion.datos) {
              datosPresentacion = resultadoPresentacion.datos;
              
              // Obtener diapositivas
              const resultadoDiapositivas = await servicioSlides.obtenerDiapositivas(idPresentacionActual);
              if (resultadoDiapositivas.exito && resultadoDiapositivas.datos) {
                diapositivasData = resultadoDiapositivas.datos;
                
                // Notificar al componente padre inmediatamente
                if (onDatosPresentacionCargados) {
                  console.log('🔄 [Debug] Notificando datos de presentación a la UI...');
                  onDatosPresentacionCargados(datosPresentacion, diapositivasData);
                  console.log('✅ [Debug] UI actualizada con datos de presentación');
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ [Debug] Error al cargar datos esenciales de presentación:', error);
        }
      }

      // La UI ya se ha actualizado, marcar como no cargando
      setCargando(false);
      console.log('✅ [Debug] Interfaz de usuario lista - continuando con guardado en segundo plano');

      // Indicar que hay operaciones en segundo plano
      setOperacionesEnSegundoPlano(true);

      // Iniciar el guardado en segundo plano
      setTimeout(async () => {
        try {
          console.log('🔄 [Debug] Iniciando guardado en segundo plano...');
          
          // PASO 1: Verificar y guardar los datos básicos del proyecto, sheets y slides
          console.log('🔄 [Debug] Asegurando datos básicos del proyecto en Supabase...');
          
          // Guardar/actualizar sheet básico si tenemos ID de hoja de cálculo
          let sheetId: string | undefined = undefined;
          if (idHojaCalculoActual) {
            try {
              // Primero intentamos buscar si ya existe en la base de datos
              const sheetExistente = await SheetsAPI.obtenerSheetPorGoogleId(idHojaCalculoActual);
              
              if (sheetExistente) {
                console.log('✅ [Debug] Sheet ya existe en Supabase con ID:', sheetExistente.id);
                sheetId = sheetExistente.id;
              } else {
                // Si no existe, lo creamos
                const sheetData = {
                  proyecto_id: idProyectoActual,
                  google_id: idHojaCalculoActual,
                  nombre: 'Hoja de cálculo', // Nombre temporal
                  titulo: 'Hoja de cálculo',
                  sheets_id: idHojaCalculoActual // Agregamos el sheets_id requerido
                };
                
                const sheetCreado = await SheetsAPI.crearSheet(sheetData);
                
                if (sheetCreado) {
                  console.log('✅ [Debug] Sheet creado en Supabase con ID:', sheetCreado.id);
                  sheetId = sheetCreado.id;
                }
              }
            } catch (error) {
              console.error('❌ [Debug] Error al guardar datos básicos del sheet:', error);
            }
          }
          
          // Guardar/actualizar slide básico si tenemos ID de presentación
          let slideId: string | undefined = undefined;
          if (idPresentacionActual) {
            try {
              // Primero intentamos buscar si ya existe en la base de datos
              const slideExistente = await SlidesAPI.obtenerSlidePorGoogleId(idPresentacionActual);
              
              if (slideExistente) {
                console.log('✅ [Debug] Slide ya existe en Supabase con ID:', slideExistente.id);
                slideId = slideExistente.id;
              } else {
                // Si no existe, lo creamos
                const slideData = {
                  proyecto_id: idProyectoActual,
                  google_presentation_id: idPresentacionActual,
                  google_id: idPresentacionActual,
                  titulo: datosPresentacion?.titulo || 'Presentación'
                };
                
                const slideCreado = await SlidesAPI.guardarSlide(slideData);
                
                if (slideCreado) {
                  console.log('✅ [Debug] Slide creado en Supabase con ID:', slideCreado);
                  slideId = slideCreado;
                }
              }
            } catch (error) {
              console.error('❌ [Debug] Error al guardar datos básicos del slide:', error);
            }
          }

          // Actualizar el proyecto con las referencias
          if (sheetId || slideId) {
            try {
              const updateData: Record<string, string> = {};
              
              if (sheetId && idHojaCalculoActual) {
                updateData.sheets_id = idHojaCalculoActual;
              }
              
              if (slideId && idPresentacionActual) {
                updateData.slides_id = idPresentacionActual;
              }
              
              await ProyectosService.actualizarProyecto(idProyectoActual, updateData);
              console.log('✅ [Debug] Referencias actualizadas en el proyecto');
            } catch (error) {
              console.error('❌ [Debug] Error al actualizar referencias en el proyecto:', error);
            }
          }
          
          // PASO 2: Guardar celdas en base de datos
          if (datosHoja && sheetId) {
            try {
              console.log('🔄 [Debug] Guardando celdas en segundo plano...');
              
              // Verificar si ya existen celdas para este sheet
              const celdasExistentes = await CeldasAPI.obtenerCeldas(sheetId);
              const totalCeldasEsperadas = datosHoja.filas.length * datosHoja.columnas.length;
              
              // Si ya hay celdas y el número es aproximadamente el esperado, evitar guardarlas de nuevo
              if (celdasExistentes.length > 0 && celdasExistentes.length >= totalCeldasEsperadas * 0.9) {
                console.log('ℹ️ [Debug] Ya existen suficientes celdas, omitiendo guardado');
              } else {
                // Formatear celdas para guardar
                const celdasParaGuardar = datosHoja.filas.flatMap(fila => 
                  Object.entries(fila.valores).map(([columna, contenido]) => ({
                    sheet_id: sheetId,
                    fila: parseInt(fila.id),
                    columna: columna,
                    referencia_celda: `${columna}${fila.id}`,
                    contenido: contenido?.toString() || '',
                    tipo: 'texto' as 'texto' | 'numero' | 'formula' | 'fecha' | 'imagen'
                  }))
                );
                
                // Usar false en checkExistentes para optimizar (indicando que es carga inicial)
                await CeldasAPI.guardarCeldas(sheetId, celdasParaGuardar, false);
                console.log('✅ [Debug] Celdas guardadas exitosamente en segundo plano');
              }
            } catch (error) {
              console.error('❌ [Debug] Error al guardar celdas en segundo plano:', error);
            }
          }
          
          // PASO 3: Guardar diapositivas y elementos en segundo plano
          if (diapositivasData.length > 0 && slideId && idPresentacionActual) {
            try {
              console.log('🔄 [Debug] Guardando diapositivas en segundo plano...');
              const servicioSlides = await ServicioGoogleSlides.obtenerInstancia();
              
              if (!servicioSlides) {
                throw new Error('No se pudo obtener el servicio de Google Slides');
              }
              
              // Procesar cada diapositiva
              for (const diapositivaData of diapositivasData) {
                try {
                  // Verificar si la diapositiva ya existe
                  const diapositivasExistentes = await SlidesAPI.obtenerDiapositivas(slideId);
                  const diapositivaExistente = diapositivasExistentes.find(d => d.diapositiva_id === diapositivaData.id);
                  let diapositivaId: string | null | undefined = undefined;
                  
                  if (diapositivaExistente) {
                    diapositivaId = diapositivaExistente.id;
                  } else {
                    // Guardar la diapositiva
                    const diapositiva: Diapositiva = {
                      id: diapositivaData.diapositiva_id || '',
                      slides_id: diapositivaData.slides_id,
                      diapositiva_id: diapositivaData.diapositiva_id || '',
                      titulo: diapositivaData.titulo || '',
                      orden: diapositivaData.orden,
                      google_presentation_id: diapositivaData.google_presentation_id || '',
                      thumbnail_url: diapositivaData.thumbnail_url || ''
                    };
                    
                    diapositivaId = await SlidesAPI.guardarDiapositiva(diapositiva);
                  }
                  
                  // Si tenemos ID de diapositiva, guardar elementos
                  if (diapositivaId) {
                    // Cargar elementos de la diapositiva
                    const resultadoElementos = await servicioSlides.obtenerElementos(idPresentacionActual, diapositivaData.id);
                    
                    if (resultadoElementos.exito && resultadoElementos.datos) {
                      // Optimización: usar guardarElementosDiapositiva con parámetro esRecarga=true
                      await ElementosAPI.guardarElementosDiapositiva(
                        diapositivaId,
                        resultadoElementos.datos,
                        true // Usar esRecarga=true para optimizar el proceso
                      );
                    }
                  }
                } catch (error) {
                  console.error(`❌ [Debug] Error procesando diapositiva ${diapositivaData.id}:`, error);
                }
              }
              
              console.log('✅ [Debug] Diapositivas y elementos guardados exitosamente en segundo plano');
            } catch (error) {
              console.error('❌ [Debug] Error al guardar diapositivas en segundo plano:', error);
            }
          }
          
          // Guardar finalizado
          console.log('✅ [Debug] Proceso de guardado en segundo plano completado');
          inicializacionCompletada.current = true;
          inicializacionEnProgreso.current = false;
          setOperacionesEnSegundoPlano(false);
        } catch (error) {
          console.error('❌ [Debug] Error en el proceso de guardado en segundo plano:', error);
          inicializacionEnProgreso.current = false;
          setOperacionesEnSegundoPlano(false);
        }
      }, 100); // Pequeño retraso para asegurar que la UI se actualice primero
      
      return true;
    } catch (error) {
      console.error('❌ [Debug] Error en inicializarDatos:', error);
      setError(`Error al inicializar datos: ${error instanceof Error ? error.message : String(error)}`);
      setCargando(false);
      inicializacionEnProgreso.current = false;
      setOperacionesEnSegundoPlano(false);
      return false;
    }
  };

  // Función para recargar datos
  const recargarDatos = async () => {
    if (idHojaCalculo) {
      await cargarDatosHoja(idHojaCalculo);
    }
    // Aquí se llamaría a la función para recargar diapositivas si es necesario
  };

  return {
    idProyecto,
    idPresentacion,
    idHojaCalculo,
    cargando,
    error,
    recargarDatos,
    operacionesEnSegundoPlano
  };
}