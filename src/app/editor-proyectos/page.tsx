"use client"

import { useState, useEffect, ReactNode, Suspense } from 'react';
import { useSession, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Alert, 
  AlertTitle, 
  Button, 
  Box, 
  CircularProgress, 
  Container, 
  Typography, 
  Paper, 
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  Link as LinkIcon, 
  Settings as SettingsIcon, 
  Close as CloseIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import { FilaSeleccionada, FilaHoja } from '@/tipos/hojas';
import { ElementoDiapositiva, VistaPreviaDiapositiva } from '@/tipos/diapositivas';
import { EditorProvider, useEditor } from './contexto/EditorContext';
import { useInicializacion } from './hooks/useInicializacion';
import { useAsociaciones } from './hooks/useAsociaciones';
import { EncabezadoEditor } from './componentes/EncabezadoEditor';
import { PanelGuardarCambios } from './componentes/PanelGuardarCambios';
import TablaHojas from './componentes/sheets/TablaHojas';
import { SidebarSlides } from './componentes/slides/SidebarSlides';
import { EditorElementoPopup } from './componentes/slides/EditorElementoPopup';
import { 
  buildThumbnailUrl, 
  preloadThumbnails,
  handleImageLoad,
  handleImageError
} from './utils/thumbnailManager';
import { ServicioGoogleSlides } from '@/servicios/google/googleSlides';
import { useDiapositivas } from './hooks/useDiapositivas';
import { NotificacionProvider, useNotificacion } from './componentes/Notificacion';
import { HistorialCambios } from "./componentes/HistorialCambios"
import { CeldasAPI } from '@/servicios/supabase/tablas/celdas-service';
import { ElementosAPI } from '@/servicios/supabase/slides/elementos-service';
import { SlidesAPI } from '@/servicios/supabase/slides/slides-service';
import { SheetsAPI } from '@/servicios/supabase/tablas/sheets-service';
import { Celda, Elemento } from '@/servicios/supabase/globales/tipos';
import { getSupabaseClient } from '@/servicios/supabase/globales/conexion';
import { syncWithNextAuth } from "@/servicios/supabase/globales/auth-service";

// Definir el tipo del objeto
interface ObjetoConIndice {
  [key: string]: any;
}

// Usar el tipo al acceder al objeto
const objeto: ObjetoConIndice = {
  propiedad: 'valor'
};
const valor = objeto['propiedad'];

// Componente para mostrar la notificación de actualización
function NotificacionActualizacion() {
  const { 
    mostrarNotificacionActualizacion, 
    ocultarNotificacionActualizacion, 
    actualizarElementosAsociadosConFila,
    cambiarModoSincronizacion,
    modoSincronizacion
  } = useEditor();
  
  if (!mostrarNotificacionActualizacion) return null;
  
  return (
    <Paper 
      elevation={3} 
      sx={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 50,
        width: '24rem',
        p: 2,
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6">Actualización disponible</Typography>
          <Button 
            size="small" 
            onClick={ocultarNotificacionActualizacion}
            sx={{ minWidth: 'auto', p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Has seleccionado una nueva fila. ¿Deseas actualizar los elementos asociados con los valores de esta fila?
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => cambiarModoSincronizacion(modoSincronizacion === 'automatico' ? 'manual' : 'automatico')}
            startIcon={<SettingsIcon fontSize="small" />}
          >
            {modoSincronizacion === 'automatico' ? 'Modo automático' : 'Modo manual'}
          </Button>
          <Button 
            variant="contained" 
            onClick={actualizarElementosAsociadosConFila}
            startIcon={<RefreshIcon fontSize="small" />}
          >
            Actualizar
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

// Componente principal
function EditorProyectosContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { mostrarNotificacion } = useNotificacion();
  const searchParams = useSearchParams();
  
  // Estados para la tabla
  const [columnas, setColumnas] = useState<string[]>([]);
  const [filas, setFilas] = useState<FilaHoja[]>([]);
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaSeleccionada | null>(null);
  
  // Estados para el sidebar y diapositivas
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [elementos, setElementos] = useState<ElementoDiapositiva[]>([]);
  const [elementosSeleccionados, setElementosSeleccionados] = useState<string[]>([]);
  const [elementosPrevia, setElementosPrevia] = useState<ElementoDiapositiva[]>([]);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  // Añadir el estado para elementoSeleccionadoPopup que falta
  const [elementoSeleccionadoPopup, setElementoSeleccionadoPopup] = useState<ElementoDiapositiva | null>(null);

  // Añadir el estado para mostrar el historial de cambios
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  
  // Estado para controlar si las celdas ya se guardaron
  const [celdasGuardadas, setCeldasGuardadas] = useState(false);
  
  // Estado para almacenar el UUID del sheet
  const [sheetUUID, setSheetUUID] = useState<string | null>(null);

  // Estado para mostrar información de sincronización en segundo plano
  const [sincronizandoEnSegundoPlano, setSincronizandoEnSegundoPlano] = useState(false);

  // Efecto para sincronizar las sesiones
  useEffect(() => {
    const sincronizarSesiones = async () => {
      if (session) {
        console.log('📝 [EditorProyectos] Sincronizando sesiones NextAuth y Supabase...');
        const sincronizado = await syncWithNextAuth(session);
        console.log(`📝 [EditorProyectos] Sincronización ${sincronizado ? 'exitosa' : 'fallida'}`);
      }
    };
    
    sincronizarSesiones();
  }, [session]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/src/auth/login');
      return;
    }
  }, [status, router]);

  // Función para obtener el UUID del sheet
  const obtenerSheetUUID = async (googleSheetId: string): Promise<string | null> => {
    try {
      console.log('Obteniendo UUID del sheet para Google ID:', googleSheetId);
      
      const sheet = await SheetsAPI.obtenerSheetPorGoogleId(googleSheetId);
      
      if (!sheet || !sheet.id) {
        console.error('No se encontró un sheet con el Google ID:', googleSheetId);
        return null;
      }
      
      console.log('UUID del sheet obtenido:', sheet.id);
      setSheetUUID(sheet.id);
      return sheet.id;
    } catch (error) {
      console.error('Error en obtenerSheetUUID:', error);
      return null;
    }
  };

  // Usar el hook de inicialización
  const { 
    idProyecto, 
    idPresentacion, 
    idHojaCalculo, 
    cargando, 
    error, 
    recargarDatos,
    operacionesEnSegundoPlano
  } = useInicializacion({
    onDatosHojaCargados: async (columnasHoja, filasHoja) => {
      console.log('📊 [page.tsx] Datos recibidos de la hoja:', {
        columnasHoja,
        filasHoja,
        columnasLength: columnasHoja?.length || 0,
        filasLength: filasHoja?.length || 0
      });

      // Validar que los datos no sean nulos
      if (!columnasHoja || !filasHoja) {
        console.error('❌ [page.tsx] Datos de hoja inválidos');
        return;
      }

      // Validar y procesar las columnas
      const columnasValidas = Array.isArray(columnasHoja) ? columnasHoja : [];
      console.log('📊 [page.tsx] Columnas válidas:', columnasValidas);

      // Validar y procesar las filas
      const filasValidas = Array.isArray(filasHoja) ? filasHoja.map((fila, index) => ({
        ...fila,
        id: fila.id || `fila-${index + 1}`,
        valores: fila.valores || {},
        numeroFila: fila.numeroFila || index + 1,
        ultimaActualizacion: fila.ultimaActualizacion || new Date()
      })) : [];

      console.log('📊 [page.tsx] Filas procesadas:', {
        cantidad: filasValidas.length,
        muestra: filasValidas.slice(0, 2)
      });

      // Actualizar el estado solo si hay datos válidos
      if (columnasValidas.length > 0) {
        console.log('✅ [page.tsx] Actualizando columnas:', columnasValidas);
        setColumnas(columnasValidas);
      }
      if (filasValidas.length > 0) {
        console.log('✅ [page.tsx] Actualizando filas:', filasValidas);
        setFilas(filasValidas);
      }
      
      // Mostrar mensaje de sincronización en segundo plano
      setSincronizandoEnSegundoPlano(true);
      
      // Guardar las celdas en la base de datos si no se han guardado ya
      if (!celdasGuardadas && idHojaCalculo) {
        try {
          console.log('Verificando si las celdas ya existen en la base de datos...');
          
          // Verificar si las celdas ya existen en la base de datos
          const uuid = await obtenerSheetUUID(idHojaCalculo);
          if (uuid) {
            setSheetUUID(uuid);
            console.log('UUID del sheet obtenido:', uuid);
            
            // Verificar si ya existen celdas para este sheet
            const supabase = await getSupabaseClient();
            const { data: celdasExistentes } = await supabase
              .from('celdas')
              .select('count')
              .eq('sheet_id', uuid);
            
            const cantidadCeldas = celdasExistentes && celdasExistentes[0] ? celdasExistentes[0].count : 0;
            console.log(`Se encontraron ${cantidadCeldas} celdas existentes para el sheet`);
            
            // Si ya hay celdas, no es necesario guardarlas de nuevo
            if (cantidadCeldas > 0) {
              console.log('Las celdas ya existen en la base de datos, omitiendo guardado');
              setCeldasGuardadas(true);
              
              // Ocultar mensaje de sincronización después de un tiempo
              setTimeout(() => {
                setSincronizandoEnSegundoPlano(false);
              }, 2000);
              
              return;
            }
          }
          
          console.log('Guardando celdas en la base de datos...');
          setGuardando(true);
          
          // Convertir los datos de las filas a formato de celdas
          const celdas = CeldasAPI.convertirDatosGoogleSheets(
            idHojaCalculo, // Usar el ID de Google directamente
            columnasHoja,
            filasHoja.map(fila => fila.valores)
          );
          
          console.log(`Convertidas ${celdas.length} celdas para guardar`);
          
          // Guardar las celdas en la base de datos usando el ID de Google
          // y evitar operaciones duplicadas verificando si ya existen
          const resultado = await CeldasAPI.guardarCeldasEnBaseDatos(
            idHojaCalculo,
            idProyecto,
            columnasHoja,
            filasHoja,
            true // Indicar que es la primera vez para optimizar el proceso
          );
          
          if (resultado) {
            console.log(`Guardadas ${resultado.length} celdas en la base de datos`);
            setCeldasGuardadas(true);
            
            // Obtener el UUID del sheet para uso futuro si no lo tenemos ya
            if (!sheetUUID) {
              const uuid = await obtenerSheetUUID(idHojaCalculo);
              if (uuid) {
                setSheetUUID(uuid);
                console.log('UUID del sheet guardado para uso futuro:', uuid);
              }
            }
            
            mostrarNotificacion({
              tipo: 'success',
              titulo: 'Celdas guardadas',
              mensaje: `Se han guardado ${resultado.length} celdas en la base de datos.`
            });
          } else {
            console.error('Error al guardar celdas en la base de datos');
            mostrarNotificacion({
              tipo: 'error',
              titulo: 'Error',
              mensaje: 'No se pudieron guardar las celdas en la base de datos.'
            });
          }
        } catch (error) {
          console.error('Error al guardar celdas:', error);
          mostrarNotificacion({
            tipo: 'error',
            titulo: 'Error',
            mensaje: error instanceof Error ? error.message : 'Error desconocido al guardar celdas.'
          });
        } finally {
          setGuardando(false);
          
          // Ocultar mensaje de sincronización en segundo plano después de un tiempo
          setTimeout(() => {
            setSincronizandoEnSegundoPlano(false);
          }, 2000);
        }
      } else {
        // Si las celdas ya están guardadas, ocultar el mensaje de sincronización después de un tiempo
        setTimeout(() => {
          setSincronizandoEnSegundoPlano(false);
        }, 2000);
      }
    },
    onDiapositivaSeleccionada: async (diapositiva, elementosCargados) => {
      // Actualizar elementos cuando se selecciona una diapositiva
      console.log('Diapositiva seleccionada en useInicializacion:', diapositiva.id);
      setElementos(elementosCargados);
      
      // Ya no guardamos los elementos aquí, se guardan durante la inicialización
      console.log('ℹ️ [Debug] Los elementos ya se guardaron durante la inicialización');
    }
  });

  // Usar el hook useDiapositivas
  const {
    diapositivas,
    diapositivaSeleccionada,
    elementos: elementosDiapositiva,
    cargando: cargandoDiapositivas,
    error: errorDiapositivas,
    seleccionarDiapositiva: manejarSeleccionDiapositiva,
    diapositivasConAsociaciones
  } = useDiapositivas({
    idPresentacion: idPresentacion && idPresentacion.trim() !== '' ? idPresentacion : '',
    onError: (mensaje) => {
      console.warn('⚠️ [Debug] Error en useDiapositivas:', mensaje);
      // Solo mostrar notificación si es un error relevante y no estamos en la carga inicial
      if (mensaje !== 'No se encontró la diapositiva seleccionada' || idPresentacion) {
        mostrarNotificacion({
          tipo: 'error',
          titulo: 'Error al cargar diapositivas',
          mensaje
        });
      }
    },
    onDiapositivaSeleccionada: async (diapositiva, elementosCargados) => {
      // Actualizar elementos cuando se selecciona una diapositiva
      console.log('🔍 [Debug] Diapositiva seleccionada en callback:', diapositiva.id);
      console.log('🔍 [Debug] Elementos cargados en callback:', elementosCargados.length);
      setElementos(elementosCargados);
      
      // Ya no guardamos los elementos aquí, se guardan durante la inicialización
      console.log('ℹ️ [Debug] Los elementos ya se guardaron durante la inicialización');
    }
  });

  // Usar el hook useAsociaciones en el nivel superior del componente
  const {
    guardarAsociaciones,
    marcarCambiosAsociaciones,
    hayAsociacionesCambiadas,
    setAsociacionesCambiadas
  } = useAsociaciones(
    idPresentacion,
    idHojaCalculo,
    diapositivaSeleccionada?.id || null,
    filaSeleccionada
  );

  // Función para manejar la selección de filas (simplificada)
  const manejarSeleccionFila = async (fila: FilaSeleccionada) => {
    console.log('Fila seleccionada en page.tsx:', fila);
    
    if (cambiosPendientes) {
      if (!confirm('Hay cambios sin guardar. ¿Deseas continuar y perder los cambios?')) {
        return;
      }
    }
    
    try {
      // Limpiar estados primero
      setElementos([]);
      setElementosSeleccionados([]);
      setCambiosPendientes(false);
      
      // Establecer la fila seleccionada
      setFilaSeleccionada(fila);
      
      // Forzar la apertura del sidebar inmediatamente
      console.log('Forzando apertura del sidebar...');
      setSidebarAbierto(true);
      
      // Verificar después de un breve retraso que el sidebar se haya abierto
      // y forzar la apertura nuevamente si es necesario
      setTimeout(() => {
        console.log('Verificando estado del sidebar después de timeout...');
        setSidebarAbierto(true);
      }, 100);
      
      // Las asociaciones se guardarán cuando se seleccione una diapositiva
      // y se carguen los elementos, no es necesario hacerlo aquí
      
      console.log('Fila seleccionada correctamente:', fila.id);
    } catch (error) {
      console.error('Error al seleccionar fila:', error);
      mostrarNotificacion({
        tipo: 'error',
        titulo: 'Error',
        mensaje: error instanceof Error ? error.message : 'Error desconocido al seleccionar fila.'
      });
    }
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
    
    // Verificar si hay cambios en las asociaciones
    const hayCambiosAsociaciones = elementosActualizados.some((elementoNuevo, index) => {
      if (index >= elementos.length) return true; // Nuevo elemento
      
      const elementoOriginal = elementos[index];
      return (
        elementoOriginal.columnaAsociada !== elementoNuevo.columnaAsociada ||
        elementoOriginal.tipoAsociacion !== elementoNuevo.tipoAsociacion
      );
    });
    
    // Si hay cambios en las asociaciones, marcarlos
    if (hayCambiosAsociaciones) {
      console.log('Se detectaron cambios en las asociaciones');
      marcarCambiosAsociaciones(true);
    }
    
    // Actualizar el estado local
    setElementos(elementosActualizados);
    
    // Actualizar la vista previa
    setElementosPrevia(elementosActualizados);
    setMostrarVistaPrevia(true);
    setCambiosPendientes(hayDiferencias);
  };

  // Implementar la función previsualizarCambios
  const previsualizarCambios = (elementosNuevos: ElementoDiapositiva[]) => {
    console.log("Previsualizando cambios:", elementosNuevos);
    
    // Verificar si realmente hay cambios
    const hayDiferencias = elementosNuevos.some((elementoNuevo, index) => {
      if (index >= elementos.length) return true; // Nuevo elemento
      
      const elementoOriginal = elementos[index];
      return (
        elementoOriginal.contenido !== elementoNuevo.contenido ||
        elementoOriginal.columnaAsociada !== elementoNuevo.columnaAsociada ||
        elementoOriginal.tipoAsociacion !== elementoNuevo.tipoAsociacion
      );
    });
    
    // Verificar si hay cambios en las asociaciones
    const hayCambiosAsociaciones = elementosNuevos.some((elementoNuevo, index) => {
      if (index >= elementos.length) return true; // Nuevo elemento
      
      const elementoOriginal = elementos[index];
      return (
        elementoOriginal.columnaAsociada !== elementoNuevo.columnaAsociada ||
        elementoOriginal.tipoAsociacion !== elementoNuevo.tipoAsociacion
      );
    });
    
    // Si hay cambios en las asociaciones, marcarlos
    if (hayCambiosAsociaciones) {
      console.log('Se detectaron cambios en las asociaciones en previsualizarCambios');
      marcarCambiosAsociaciones(true);
    }
    
    // Actualizar la vista previa y marcar cambios pendientes solo si hay diferencias
    setElementosPrevia(elementosNuevos);
    setMostrarVistaPrevia(true);
    setCambiosPendientes(hayDiferencias);
  };

  // Implementar la función actualizarElementos
  const actualizarElementos = async (elementosActualizados: ElementoDiapositiva[]): Promise<void> => {
    try {
      // Validar que hay una sesión activa
      if (!session?.accessToken) {
        mostrarNotificacion({
          tipo: 'error',
          titulo: 'Error de autenticación',
          mensaje: 'No hay una sesión activa. Por favor, inicie sesión nuevamente.'
        });
        return;
      }
      
      // Validar que hay una presentación seleccionada
      if (!idPresentacion) {
        mostrarNotificacion({
          tipo: 'error',
          titulo: 'Error',
          mensaje: 'No hay una presentación seleccionada.'
        });
        return;
      }

      // Verificar si realmente hay cambios en los elementos
      if (elementosActualizados.length === 0) {
        console.log('🔍 [Debug] No hay elementos para actualizar, omitiendo operación');
        return;
      }
      
      // Verificar si los elementos han cambiado realmente comparando con los elementos actuales
      const cambiosDetectados = elementosActualizados.some(elem => {
        const elementoActual = elementos.find(e => e.id === elem.id);
        if (!elementoActual) return true; // Si no existe el elemento, hay cambio
        
        // Comparar contenido, posición y estilo
        return elementoActual.contenido !== elem.contenido || 
               JSON.stringify(elementoActual.posicion) !== JSON.stringify(elem.posicion) ||
               JSON.stringify(elementoActual.estilo) !== JSON.stringify(elem.estilo) ||
               elementoActual.columnaAsociada !== elem.columnaAsociada ||
               elementoActual.tipoAsociacion !== elem.tipoAsociacion;
      });
      
      if (!cambiosDetectados) {
        console.log('🔍 [Debug] No se detectaron cambios en los elementos, omitiendo actualización');
        return;
      }
      
      console.log('🔄 [Debug] Se detectaron cambios, guardando elementos modificados...');

      // Guardar cambios
      setGuardando(true);

      // Usar la función de ElementosAPI para actualizar los elementos
      const resultado = await ElementosAPI.actualizarElementosEnGoogleSlides(
        idPresentacion,
        diapositivaSeleccionada?.id || '',
        elementosActualizados,
        idHojaCalculo,
        filaSeleccionada || 0,
        sheetUUID || undefined,
        true // Indicar que es una recarga para optimizar el proceso
      );

      if (resultado.exito) {
        // Marcar los elementos como no modificados después de guardar
        const elementosActualizadosLimpios = elementosActualizados.map(elemento => ({
          ...elemento,
          modificado: false
        }));
        
        // Actualizar el estado local con los elementos actualizados
        setElementos(elementosActualizadosLimpios);

        // Actualizar la vista previa
        previsualizarCambios(elementosActualizadosLimpios);

        // Marcar que no hay cambios pendientes
        setCambiosPendientes(false);

        // Mostrar notificación de éxito
        mostrarNotificacion({
          tipo: 'success',
          titulo: 'Éxito',
          mensaje: resultado.mensaje || `Se han actualizado ${resultado.elementosGuardados} elementos correctamente.`
        });
        
        // Mostrar información adicional sobre asociaciones si es relevante
        if (resultado.asociacionesGuardadas && resultado.asociacionesGuardadas > 0) {
          console.log(`✅ Asociaciones guardadas correctamente: ${resultado.asociacionesGuardadas}`);
        }
      } else {
        console.error('Error al actualizar elementos:', resultado.error);
        
        mostrarNotificacion({
          tipo: 'error',
          titulo: 'Error al actualizar',
          mensaje: resultado.error || 'No se pudieron actualizar los elementos.'
        });
      }
    } catch (error) {
      console.error('Error en actualizarElementos:', error);
      mostrarNotificacion({
        tipo: 'error',
        titulo: 'Error',
        mensaje: error instanceof Error ? error.message : 'Error desconocido al actualizar elementos.'
      });
    } finally {
      setGuardando(false);
    }
  };

  // Función para restaurar un elemento desde el historial
  const restaurarElementoDesdeHistorial = (elementoId: string, contenido: string) => {
    // Buscar el elemento en la lista actual
    const elementoARestaurar = elementos.find(e => e.id === elementoId);
    
    if (elementoARestaurar) {
      // Crear una copia actualizada del elemento
      const elementoActualizado = {
        ...elementoARestaurar,
        contenido
      };
      
      // Actualizar la lista de elementos
      const nuevosElementos = elementos.map(elem => 
        elem.id === elementoId ? elementoActualizado : elem
      );
      
      // Actualizar el estado y guardar los cambios
      setElementos(nuevosElementos);
      actualizarElementos(nuevosElementos).then(() => {
        mostrarNotificacion({
          mensaje: "Contenido restaurado correctamente",
          tipo: "success"
        });
      });
    }
  };
  
  // Función para restaurar una celda desde el historial
  const restaurarCeldaDesdeHistorial = (filaId: string, columna: string, valor: string) => {
    // Buscar la fila en la lista actual
    const filaAActualizar = filas.find(f => f.id === filaId);
    
    if (filaAActualizar) {
      // Crear una copia actualizada de la fila
      const filaActualizada = {
        ...filaAActualizar,
        valores: {
          ...filaAActualizar.valores,
          [columna]: valor
        },
        ultimaActualizacion: new Date()
      };
      
      // Actualizar la fila en la base de datos
      actualizarFilaLocal(filaActualizada);
      
      mostrarNotificacion({
        mensaje: `Celda "${columna}" restaurada correctamente`,
        tipo: "success"
      });
    }
  };

  // Función para actualizar una fila localmente
  const actualizarFilaLocal = async (fila: FilaHoja) => {
    try {
      if (!idProyecto || !idHojaCalculo || !columnas || columnas.length === 0) {
        console.warn('Faltan datos para actualizar la fila');
        return;
      }

      // Verificar si hay cambios reales en la fila
      const filaActual = filas.find(f => f.id === fila.id);
      
      if (filaActual) {
        // Comparar contenido de celdas para detectar cambios
        let hayCambios = false;
        const celdasCambiadas: string[] = [];

        columnas.forEach(columna => {
          const valorActual = filaActual.valores[columna];
          const valorNuevo = fila.valores[columna];
          
          if (valorActual !== valorNuevo) {
            hayCambios = true;
            celdasCambiadas.push(columna);
          }
        });
        
        if (!hayCambios) {
          console.log('🔍 [Debug] No se detectaron cambios en la fila, omitiendo actualización');
          return;
        }
        
        console.log(`🔄 [Debug] Cambios detectados en las columnas: ${celdasCambiadas.join(', ')}`);
      }

      console.log('Actualizando localmente fila:', fila.id);
      
      // Actualizar el estado local
      setFilas(prev => prev.map(f => f.id === fila.id ? fila : f));
      
      // Guardar la fila actualizada en la base de datos
      if (idHojaCalculo) {
        try {
          console.log('Actualizando celdas para la fila:', fila.id);
          
          // Guardar las celdas en la base de datos usando CeldasAPI
          const resultado = await CeldasAPI.guardarCeldasEnBaseDatos(
            idHojaCalculo,
            idProyecto,
            columnas,
            [fila],
            false // Ya no es la primera vez, verificar si hay cambios
          );
          
          if (resultado) {
            console.log(`Actualizadas ${resultado.length} celdas para la fila ${fila.id}`);
            mostrarNotificacion({
              tipo: 'success',
              titulo: 'Celdas actualizadas',
              mensaje: `Se han actualizado ${resultado.length} celdas para la fila.`
            });
          } else {
            console.error('Error al actualizar celdas');
            mostrarNotificacion({
              tipo: 'error',
              titulo: 'Error',
              mensaje: 'No se pudieron actualizar las celdas.'
            });
          }
        } catch (error) {
          console.error('Error al actualizar celdas:', error);
          mostrarNotificacion({
            tipo: 'error',
            titulo: 'Error',
            mensaje: error instanceof Error ? error.message : 'Error desconocido al actualizar celdas.'
          });
        }
      }
    } catch (error) {
      console.error('Error al actualizar fila:', error);
      mostrarNotificacion({
        tipo: 'error',
        titulo: 'Error',
        mensaje: error instanceof Error ? error.message : 'Error desconocido al actualizar fila.'
      });
    }
  };

  useEffect(() => {
    const handleMostrarPopupEdicion = (event: Event) => {
      // @ts-ignore
      const { elemento } = event.detail;
      console.log("Evento recibido para mostrar popup de edición:", elemento);
      setElementoSeleccionadoPopup(elemento);
    };
    
    window.addEventListener('mostrar-popup-edicion', handleMostrarPopupEdicion);
    
    return () => {
      window.removeEventListener('mostrar-popup-edicion', handleMostrarPopupEdicion);
    };
  }, []);

  // Función para verificar la estructura de la tabla elementos
  const verificarEstructuraTablaElementos = async () => {
    try {
      console.log('Verificando estructura de la tabla elementos...');
      
      // Intentar obtener la estructura de la tabla usando una consulta directa
      const supabase = await getSupabaseClient();
      const { data: columnasInfo, error: errorColumnas } = await supabase
        .from('elementos')
        .select('*')
        .limit(1);
      
      if (errorColumnas) {
        console.error('Error al consultar tabla elementos:', errorColumnas);
        return false;
      }
      
      // Verificar si hay datos
      if (!columnasInfo || columnasInfo.length === 0) {
        console.log('No hay datos en la tabla elementos para verificar estructura');
        
        // Intentar obtener la estructura mediante consultas alternativas
        try {
          const cliente = await getSupabaseClient();
          
          // Primero intentar con la función RPC si existe
          try {
            const { data: sqlInfo, error: sqlError } = await cliente
              .rpc('get_table_info', { tabla: 'elementos' });
            
            if (sqlError) {
              console.error('Error al obtener información de la tabla mediante RPC:', sqlError);
              // La función RPC no existe, usar consulta alternativa
            } else {
              console.log('Estructura de la tabla elementos (RPC):', sqlInfo);
              return true;
            }
          } catch (rpcError) {
            console.error('Error al ejecutar RPC (posiblemente no existe):', rpcError);
          }
          
          // Si la RPC falla, usar una consulta directa a la tabla
          console.log('Intentando consulta directa a la tabla elementos...');
          const { data: metadataInfo, error: metadataError } = await cliente
            .from('elementos')
            .select('*')
            .limit(0);
          
          if (metadataError) {
            console.error('Error al consultar metadata de elementos:', metadataError);
          } else {
            // Incluso con 0 resultados, podemos obtener los nombres de columnas
            const columnasDisponibles = metadataInfo ? Object.keys(metadataInfo) : [];
            console.log('Columnas disponibles en la tabla elementos:', columnasDisponibles);
            return true;
          }
        } catch (error) {
          console.error('Error al verificar estructura de la tabla:', error);
        }
        
        return false;
      }
      
      // Obtener las columnas del primer registro
      const columnas = Object.keys(columnasInfo[0]);
      console.log('Columnas de la tabla elementos:', columnas);
      
      // Verificar tipos de datos
      const primerRegistro = columnasInfo[0];
      const tiposDatos: { [key: string]: string } = {};
      
      for (const columna of columnas) {
        const valor = primerRegistro[columna];
        tiposDatos[columna] = typeof valor;
      }
      
      console.log('Tipos de datos de las columnas:', tiposDatos);
      
      // Verificar si diapositiva_id es UUID
      if (columnas.includes('diapositiva_id')) {
        const diapositivaId = primerRegistro.diapositiva_id;
        const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(diapositivaId);
        console.log(`diapositiva_id (${diapositivaId}) es UUID: ${esUUID}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error al verificar estructura de la tabla:', error);
      return false;
    }
  };

  // Llamar a la función de verificación al cargar el componente
  useEffect(() => {
    if (session?.accessToken) {
      verificarEstructuraTablaElementos();
    }
  }, [session?.accessToken]);

  // Actualizar el hook useAsociaciones cuando cambie la diapositiva seleccionada
  useEffect(() => {
    // Verificar si tenemos todos los datos necesarios
    if (idPresentacion && idHojaCalculo) {
      console.log('Actualizando hook useAsociaciones:', {
        idDiapositiva: diapositivaSeleccionada?.id || '',
        idPresentacion,
        idHojaCalculo
      });
      
      // Actualizar el estado del hook manualmente
      // Esto es necesario porque no podemos recrear el hook con nuevos parámetros
      setAsociacionesCambiadas(true);
    }
  }, [diapositivaSeleccionada?.id, idPresentacion, idHojaCalculo, setAsociacionesCambiadas]);

  // Función para guardar elementos de diapositivas en Supabase
  const guardarElementosEnSupabase = async (diapositivaId: string, elementosList: ElementoDiapositiva[]): Promise<boolean> => {
    try {
      if (!elementosList.length) {
        console.log('No hay elementos para guardar en Supabase');
        return true;
      }

      console.log(`📝 [Debug] Delegando guardado de ${elementosList.length} elementos a ElementosAPI.guardarElementosDiapositiva`);
      
      // Usar la función de ElementosAPI para guardar los elementos
      if (idPresentacion) {
        return await ElementosAPI.guardarElementosDiapositiva(diapositivaId, elementosList);
      } else {
        console.error('❌ [Debug] No hay ID de presentación para guardar la diapositiva');
        return false;
      }
    } catch (error) {
      console.error('❌ [Debug] Error al guardar elementos en Supabase:', error);
      return false;
    }
  };

  // Cuando se selecciona una diapositiva desde el panel lateral
  const manejarSeleccionDiapositivaSidebar = async (idDiapositiva: string) => {
    console.log('🔍 [page.tsx] Seleccionando diapositiva desde sidebar:', idDiapositiva);
    
    try {
      // Obtener la diapositiva y sus elementos
      await manejarSeleccionDiapositiva(idDiapositiva, null);
      
      // Log para depuración
      console.log('✅ [page.tsx] Diapositiva seleccionada:', idDiapositiva);
      console.log('✅ [page.tsx] Elementos cargados:', elementosDiapositiva.length);
      console.log('✅ [page.tsx] Muestra de elementos:', elementosDiapositiva.slice(0, 2).map(e => ({
        id: e.id,
        tipo: e.tipo,
        contenido: e.contenido,
        columnaAsociada: e.columnaAsociada
      })));
      
    } catch (error) {
      console.error('❌ [page.tsx] Error al seleccionar diapositiva:', error);
      mostrarNotificacion({
        tipo: 'error',
        titulo: 'Error al seleccionar diapositiva',
        mensaje: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  // Actualizar elementos cuando cambia la diapositiva seleccionada
  useEffect(() => {
    if (diapositivaSeleccionada) {
      console.log('🔄 [page.tsx] Diapositiva seleccionada cambiada:', diapositivaSeleccionada.id);
      console.log('🔄 [page.tsx] Elementos disponibles:', elementosDiapositiva.length);
      setElementos(elementosDiapositiva);
    }
  }, [diapositivaSeleccionada, elementosDiapositiva]);

  // Renderizar el componente con estados apropiados
  if (status === 'loading' || cargando) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" mt={2}>Cargando editor...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error al cargar el editor</AlertTitle>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={recargarDatos}
          startIcon={<RefreshIcon />}
        >
          Reintentar
        </Button>
      </Container>
    );
  }

  return (
    <EditorProvider
      initialIdProyecto={idProyecto}
      initialIdPresentacion={idPresentacion}
      initialIdHojaCalculo={idHojaCalculo}
    >
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <EncabezadoSistema />
        
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Encabezado con título y botones */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h4" component="h1" fontWeight="bold">
                Editor de Proyecto
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Información de sincronización en segundo plano */}
                {sincronizandoEnSegundoPlano && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    bgcolor: 'primary.lighter', 
                    color: 'primary.dark',
                    px: 2,
                    py: 0.75,
                    borderRadius: 1
                  }}>
                    <CircularProgress size={16} thickness={4} color="primary" />
                    <Typography variant="body2">
                      Sincronizando datos en segundo plano...
                    </Typography>
                  </Box>
                )}

                {/* Indicador de operaciones en segundo plano */}
                {operacionesEnSegundoPlano && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    bgcolor: 'info.lighter', 
                    color: 'info.dark',
                    px: 2,
                    py: 0.75,
                    borderRadius: 1
                  }}>
                    <CircularProgress size={16} thickness={4} color="info" />
                    <Typography variant="body2">
                      Guardando elementos...
                    </Typography>
                  </Box>
                )}

                {/* Botón para mostrar el historial de cambios */}
                <Tooltip title="Historial de cambios">
                  <Button
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => setMostrarHistorial(true)}
                  >
                    Historial
                  </Button>
                </Tooltip>
                
                {/* Botón para actualizar datos */}
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={recargarDatos}
                  disabled={cargando}
                >
                  Actualizar
                </Button>
              </Box>
            </Box>
            
            {/* Resto del contenido */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Encabezado */}
              <EncabezadoEditor />
              
              {/* Mensajes de error */}
              {error && (
                <Alert severity="error">
                  <Typography>{error}</Typography>
                </Alert>
              )}
              
              {/* Tabla de hojas */}
              <Box 
                component="div" 
                sx={{ 
                  width: '100%', 
                  minHeight: 400, 
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <TablaHojas
                  columnas={columnas}
                  filas={filas}
                  cargando={cargando}
                  filaSeleccionada={filaSeleccionada}
                  onSeleccionarFila={manejarSeleccionFila}
                  onActualizarFila={async (fila: FilaHoja) => {
                    await actualizarFilaLocal(fila);
                  }}
                  elementosAsociados={elementos.filter(e => e.columnaAsociada)}
                />
              </Box>
              
              {/* Sidebar de diapositivas */}
              {sidebarAbierto && (
                <SidebarSlides
                  sidebarAbierto={sidebarAbierto}
                  setSidebarAbierto={setSidebarAbierto}
                  cambiosPendientes={cambiosPendientes}
                  elementos={elementos}
                  elementosSeleccionados={elementosSeleccionados}
                  elementosPrevia={elementosPrevia}
                  setElementosPrevia={setElementosPrevia}
                  setMostrarVistaPrevia={setMostrarVistaPrevia}
                  setCambiosPendientes={setCambiosPendientes}
                  diapositivas={diapositivas}
                  diapositivaSeleccionada={diapositivaSeleccionada}
                  cargandoDiapositivas={cargandoDiapositivas}
                  diapositivasConAsociaciones={diapositivasConAsociaciones}
                  filaSeleccionada={filaSeleccionada}
                  session={session}
                  manejarSeleccionDiapositiva={manejarSeleccionDiapositivaSidebar}
                  actualizarElementos={actualizarElementos}
                  previsualizarCambios={previsualizarCambios}
                  setElementoSeleccionadoPopup={setElementoSeleccionadoPopup}
                  token={session?.accessToken || ''}
                  idPresentacion={idPresentacion || ''}
                  idHoja={idHojaCalculo || ''}
                />
              )}
              
              {/* Botón de guardar cambios */}
              <PanelGuardarCambios
                cambiosPendientes={cambiosPendientes}
                guardando={guardando}
                onGuardarCambios={async () => {
                  // Esta función ahora debería estar en un componente
                }}
              />
            </Box>
            
            {/* Notificación de actualización */}
            <NotificacionActualizacion />
          </Container>
          
          {/* Popup de edición de elemento */}
          {elementoSeleccionadoPopup && filaSeleccionada && (
            <EditorElementoPopup
              elemento={elementoSeleccionadoPopup}
              filaSeleccionada={filaSeleccionada}
              abierto={!!elementoSeleccionadoPopup}
              alCerrar={() => {
                console.log("Cerrando popup de edición de elemento");
                setElementoSeleccionadoPopup(null);
              }}
              alGuardar={(elementoActualizado) => {
                console.log("Guardando elemento actualizado desde popup:", elementoActualizado);
                
                // Actualizar el elemento en el estado local
                const nuevosElementos = elementos.map(elem => 
                  elem.id === elementoActualizado.id ? elementoActualizado : elem
                );
                
                // Actualizar el estado
                setElementos(nuevosElementos);
                setCambiosPendientes(true);
                
                // Cerrar el popup
                setElementoSeleccionadoPopup(null);
              }}
            />
          )}

          {/* Componente de Historial de Cambios */}
          <HistorialCambios
            abierto={mostrarHistorial}
            onCerrar={() => setMostrarHistorial(false)}
            onRestaurarElemento={restaurarElementoDesdeHistorial}
            onRestaurarCelda={restaurarCeldaDesdeHistorial}
            idPresentacion={idPresentacion}
            idHojaCalculo={idHojaCalculo}
            idDiapositiva={diapositivaSeleccionada?.id}
          />
        </Box>
      </Box>
    </EditorProvider>
  );
}

// Componente de exportación con el proveedor de notificaciones
export default function EditorProyectosPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <EditorProyectosContent />
    </Suspense>
  ); 
}