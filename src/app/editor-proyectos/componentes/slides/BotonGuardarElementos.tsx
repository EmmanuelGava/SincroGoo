"use client"

import React, { useState, useEffect } from 'react';
import { Button, ButtonGroup, Tooltip, IconButton } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloudIcon from '@mui/icons-material/Cloud';
import CircularProgress from '@mui/material/CircularProgress';
import { toast } from 'sonner';
import { ElementoDiapositiva } from '@/tipos/diapositivas';
import { useEditor } from '../../contexto/EditorContext';
import { verificarConexionSupabase } from '@/servicios/supabase/globales/supabase';
import { useAsociaciones } from '../../hooks/useAsociaciones';

interface BotonGuardarElementosProps {
  elementos: ElementoDiapositiva[];
  elementosOriginales: ElementoDiapositiva[];
  hayElementosModificados: boolean;
  alGuardar: (elementos: ElementoDiapositiva[]) => Promise<void>;
  onReset: () => void;
  idPresentacion?: string;
  idHoja?: string;
  idDiapositiva?: string;
  filaSeleccionada: any; // FilaSeleccionada | null
  setSidebarAbierto?: (abierto: boolean) => void; // Añadir prop para cerrar el sidebar
}

export function BotonGuardarElementos({
  elementos,
  elementosOriginales,
  hayElementosModificados,
  alGuardar,
  onReset,
  idPresentacion = '',
  idHoja = '',
  idDiapositiva = '',
  filaSeleccionada,
  setSidebarAbierto
}: BotonGuardarElementosProps) {
  const [guardando, setGuardando] = useState(false);
  const [botonDeshabilitado, setBotonDeshabilitado] = useState(true);
  const [cambioAsociacionDetectado, setCambioAsociacionDetectado] = useState(false);
  const [verificandoConexion, setVerificandoConexion] = useState(false);
  
  // Usar el hook de asociaciones
  const { 
    guardarAsociaciones, 
    marcarCambiosAsociaciones, 
    hayAsociacionesCambiadas,
    setAsociacionesCambiadas
  } = useAsociaciones(
    idPresentacion || '', 
    idHoja || '', 
    idDiapositiva || '', 
    filaSeleccionada || null
  );
  
  // Obtener funciones del contexto
  const { 
    actualizarElementosAsociadosEnTabla 
  } = useEditor();
  
  // Función para verificar la conexión a Supabase
  const verificarConexion = async () => {
    console.log('🔍 [BotonGuardarElementos] Verificando conexión a Supabase...');
    setVerificandoConexion(true);
    
    try {
      toast.loading('Verificando conexión a Supabase...', {
        id: 'verificando-conexion',
        duration: 3000
      });
      
      const resultado = await verificarConexionSupabase();
      
      toast.dismiss('verificando-conexion');
      
      if (resultado.conectado) {
        console.log('✅ [BotonGuardarElementos] Conexión a Supabase verificada correctamente');
        toast.success('Conexión a Supabase verificada correctamente', {
          duration: 3000
        });
      } else {
        console.error('❌ [BotonGuardarElementos] Error en la conexión a Supabase:', resultado.mensaje);
        toast.error(`Error en la conexión a Supabase: ${resultado.mensaje}`, {
          duration: 5000
        });
      }
    } catch (error) {
      console.error('❌ [BotonGuardarElementos] Error al verificar la conexión:', error);
      toast.error('Error al verificar la conexión a Supabase', {
        duration: 3000
      });
    } finally {
      setVerificandoConexion(false);
    }
  };
  
  // Escuchar eventos de cambio de asociación
  useEffect(() => {
    console.log('🔍 [BotonGuardarElementos] Configurando listeners para eventos de asociaciones');
    console.log('- idPresentacion:', idPresentacion);
    console.log('- idHoja:', idHoja);
    
    // Listener para cambios de asociación
    const handleCambioAsociacion = (event: CustomEvent) => {
      console.log('🔍 [BotonGuardarElementos] Evento de cambio de asociación detectado:', event.detail);
      
      // Verificar si el evento corresponde a esta presentación y hoja
      if (
        idPresentacion && 
        idHoja && 
        event.detail.idPresentacion === idPresentacion && 
        event.detail.idHoja === idHoja
      ) {
        console.log('✅ [BotonGuardarElementos] Evento corresponde a esta presentación y hoja, activando cambioAsociacionDetectado');
        setCambioAsociacionDetectado(true);
        marcarCambiosAsociaciones();
      } else {
        console.log('ℹ️ [BotonGuardarElementos] Evento no corresponde a esta presentación/hoja');
        console.log('- Evento idPresentacion:', event.detail.idPresentacion);
        console.log('- Evento idHoja:', event.detail.idHoja);
        console.log('- Componente idPresentacion:', idPresentacion);
        console.log('- Componente idHoja:', idHoja);
      }
    };
    
    // Listener para actualizaciones de asociaciones (eliminaciones)
    const handleActualizacionAsociaciones = (event: CustomEvent) => {
      console.log('🔍 [BotonGuardarElementos] Evento de actualización de asociaciones detectado:', event.detail);
      
      // Verificar si el evento corresponde a esta presentación y hoja
      if (
        idPresentacion && 
        idHoja && 
        event.detail.idPresentacion === idPresentacion && 
        event.detail.idHoja === idHoja
      ) {
        console.log('✅ [BotonGuardarElementos] Evento de actualización corresponde a esta presentación y hoja');
        
        if (event.detail.accion === 'eliminar') {
          console.log('✅ [BotonGuardarElementos] Se eliminaron asociaciones, reseteando estado');
          setCambioAsociacionDetectado(false);
          setAsociacionesCambiadas(false);
          
          // Forzar una actualización del estado del botón
          setTimeout(() => {
            console.log('🔍 [BotonGuardarElementos] Forzando actualización del estado del botón después de eliminar asociaciones');
            setBotonDeshabilitado(!hayElementosModificados);
          }, 100);
        }
      }
    };
    
    // Añadir listeners para los eventos personalizados
    document.addEventListener('cambio-asociacion', handleCambioAsociacion as EventListener);
    document.addEventListener('actualizacion-asociaciones', handleActualizacionAsociaciones as EventListener);
    console.log('✅ [BotonGuardarElementos] Listeners para eventos de asociaciones configurados');
    
    // Limpiar listeners al desmontar
    return () => {
      console.log('🔍 [BotonGuardarElementos] Eliminando listeners para eventos de asociaciones');
      document.removeEventListener('cambio-asociacion', handleCambioAsociacion as EventListener);
      document.removeEventListener('actualizacion-asociaciones', handleActualizacionAsociaciones as EventListener);
    };
  }, [idPresentacion, idHoja, hayElementosModificados, marcarCambiosAsociaciones, setAsociacionesCambiadas]);
  
  // Verificar si hay cambios en las asociaciones, con diagnóstico mejorado
  const verificarCambiosAsociaciones = (): boolean => {
    console.log('🔍 [BotonGuardarElementos] Verificando cambios en asociaciones');
    console.log('- Elementos totales:', elementos.length);
    console.log('- Elementos originales totales:', elementosOriginales.length);
    
    // Verificar si hay elementos con asociaciones
    const elementosConAsociaciones = elementos.filter(e => e.columnaAsociada);
    console.log(`- Elementos con asociaciones: ${elementosConAsociaciones.length}`);
    
    // Verificar si hay elementos originales con asociaciones
    const elementosOriginalesConAsociaciones = elementosOriginales.filter(e => e.columnaAsociada);
    console.log(`- Elementos originales con asociaciones: ${elementosOriginalesConAsociaciones.length}`);
    
    // Si la cantidad de elementos con asociaciones es diferente, hay cambios
    if (elementosConAsociaciones.length !== elementosOriginalesConAsociaciones.length) {
      console.log('✅ [BotonGuardarElementos] Cambio detectado: diferente cantidad de elementos con asociaciones');
      
      // Caso especial: si había elementos con asociaciones originalmente pero ahora no hay ninguno
      if (elementosConAsociaciones.length === 0 && elementosOriginalesConAsociaciones.length > 0) {
        console.log('✅ [BotonGuardarElementos] Cambio importante: se desasociaron todos los elementos');
        console.log('- Este caso requiere sincronización forzada para reflejar la eliminación');
      }
      
      return true;
    }
    
    // Si no hay elementos con asociaciones en ambos casos, verificamos si hubo eliminaciones previas
    if (elementosConAsociaciones.length === 0 && elementosOriginalesConAsociaciones.length === 0) {
      console.log('ℹ️ [BotonGuardarElementos] No hay elementos con asociaciones en ningún caso');
      
      // Verificar con el hook si hay cambios pendientes (podrían haber ocurrido eliminaciones)
      const cambiosPendientes = hayAsociacionesCambiadas();
      if (cambiosPendientes) {
        console.log('⚠️ [BotonGuardarElementos] Hook indica cambios pendientes aunque no hay asociaciones visibles');
        console.log('- Esto puede ocurrir después de eliminar todas las asociaciones');
        return true;
      }
      
      return false;
    }
    
    // Comparar elemento por elemento para detectar cambios específicos
    const cambios = elementos.filter(elemento => {
      const elementoOriginal = elementosOriginales.find(e => e.id === elemento.id);
      const hayCambio = elemento.columnaAsociada !== elementoOriginal?.columnaAsociada;
      
      if (hayCambio) {
        console.log(`- Elemento ${elemento.id}: cambio detectado`);
        console.log(`  * Columna actual: ${elemento.columnaAsociada || 'ninguna'}`);
        console.log(`  * Columna original: ${elementoOriginal?.columnaAsociada || 'ninguna'}`);
        
        if (!elemento.columnaAsociada && elementoOriginal?.columnaAsociada) {
          console.log(`  * Tipo de cambio: Eliminación de asociación`);
        } else if (elemento.columnaAsociada && !elementoOriginal?.columnaAsociada) {
          console.log(`  * Tipo de cambio: Nueva asociación`);
        } else {
          console.log(`  * Tipo de cambio: Cambio de columna asociada`);
        }
      }
      
      return hayCambio;
    });
    
    const resultado = cambios.length > 0;
    console.log(`✅ [BotonGuardarElementos] Resultado verificación: ${resultado ? 'Hay cambios' : 'No hay cambios'} (${cambios.length} elementos modificados)`);
    
    return resultado;
  };
  
  // Actualizar el estado del botón cuando cambien los elementos
  useEffect(() => {
    console.log('🔍 [BotonGuardarElementos] Actualizando estado del botón');
    
    const hayAsociacionesCambiadasPorComparacion = verificarCambiosAsociaciones();
    const hayAsociacionesCambiadasEnHook = hayAsociacionesCambiadas();
    
    console.log('- hayElementosModificados:', hayElementosModificados);
    console.log('- hayAsociacionesCambiadas (comparación):', hayAsociacionesCambiadasPorComparacion);
    console.log('- hayAsociacionesCambiadas (hook):', hayAsociacionesCambiadasEnHook);
    console.log('- cambioAsociacionDetectado (evento):', cambioAsociacionDetectado);
    
    // Si cambioAsociacionDetectado es true pero no hay cambios reales, resetearlo
    if (cambioAsociacionDetectado && !hayAsociacionesCambiadasPorComparacion) {
      console.log('ℹ️ [BotonGuardarElementos] cambioAsociacionDetectado es true pero no hay cambios reales por comparación');
      
      // Verificamos si hay elementos con asociaciones ahora o previamente
      const tieneAsociacionesAhora = elementos.some(e => e.columnaAsociada);
      const teniaAsociacionesAntes = elementosOriginales.some(e => e.columnaAsociada);
      
      // Si no hay ni había asociaciones, reseteamos el flag
      if (!tieneAsociacionesAhora && !teniaAsociacionesAntes) {
        console.log('ℹ️ [BotonGuardarElementos] No hay elementos con asociaciones ahora ni antes, reseteando estado');
        setCambioAsociacionDetectado(false);
      } else {
        console.log('⚠️ [BotonGuardarElementos] Hay elementos con asociaciones, manteniendo el flag de cambios');
      }
      
      // Solo reseteamos el estado en el hook si estamos seguros que no hay cambios
      if (hayAsociacionesCambiadasEnHook && !tieneAsociacionesAhora && !teniaAsociacionesAntes) {
        console.log('ℹ️ [BotonGuardarElementos] Reseteando estado hayAsociacionesCambiadas en el hook');
        marcarCambiosAsociaciones(false);
      }
    }
    
    const hayModificaciones = hayElementosModificados || hayAsociacionesCambiadasPorComparacion || hayAsociacionesCambiadasEnHook || cambioAsociacionDetectado;
    
    // Log detallado sobre el estado de modificaciones
    if (hayAsociacionesCambiadasEnHook) {
      console.log('⚠️ [BotonGuardarElementos] Estado indica que hay cambios en asociaciones aunque comparación directa indica lo contrario');
      console.log('- Esto puede ocurrir cuando se eliminaron asociaciones o cuando hubo cambios que no son detectables por comparación simple');
    }

    console.log(`✅ [BotonGuardarElementos] Resultado: ${hayModificaciones ? 'Hay modificaciones' : 'No hay modificaciones'}`);
    setBotonDeshabilitado(!hayModificaciones || guardando);
  }, [elementos, elementosOriginales, hayElementosModificados, guardando, hayAsociacionesCambiadas, cambioAsociacionDetectado, marcarCambiosAsociaciones]);
  
  // Función para guardar cambios
  const guardarCambios = async () => {
    console.log('🔍 [BotonGuardarElementos] Iniciando guardarCambios');
    
    if (guardando || botonDeshabilitado) {
      console.log('ℹ️ [BotonGuardarElementos] Guardado cancelado: ya está en proceso o botón deshabilitado');
      return;
    }
    
    try {
      console.log('🔍 [BotonGuardarElementos] Iniciando proceso de guardado...');
      setGuardando(true);
      
      // Verificar datos necesarios para guardar asociaciones
      if (hayAsociacionesCambiadas() || cambioAsociacionDetectado) {
        console.log('🔍 [BotonGuardarElementos] Hay asociaciones cambiadas, verificando datos necesarios');
        
        const faltan: string[] = [];
        if (!idPresentacion) faltan.push('ID de presentación');
        if (!idHoja) faltan.push('ID de hoja');
        if (!idDiapositiva) faltan.push('ID de diapositiva');
        if (!filaSeleccionada) faltan.push('Fila seleccionada');
        
        if (faltan.length > 0) {
          const mensajeError = `Faltan datos para guardar asociaciones: ${faltan.join(', ')}`;
          console.error(`❌ [BotonGuardarElementos] ${mensajeError}`);
          toast.error(mensajeError);
          setGuardando(false);
          return;
        }
        
        console.log('✅ [BotonGuardarElementos] Datos necesarios para asociaciones verificados');
      }
      
      // Paso 1: Guardar elementos (contenido, posición, etc.)
      console.log('🔍 [BotonGuardarElementos] Guardando elementos...');
      toast.loading('Guardando elementos...', { id: 'guardando-elementos' });
      
      await alGuardar(elementos);
      
      console.log('✅ [BotonGuardarElementos] Elementos guardados correctamente');
      toast.success('Elementos guardados correctamente', { id: 'guardando-elementos' });
      
      // Paso 2: Guardar asociaciones si hay cambios
      if (hayAsociacionesCambiadas() || cambioAsociacionDetectado || verificarCambiosAsociaciones()) {
        console.log('🔍 [BotonGuardarElementos] Guardando asociaciones...');
        console.log('- hayAsociacionesCambiadas (hook):', hayAsociacionesCambiadas());
        console.log('- cambioAsociacionDetectado:', cambioAsociacionDetectado);
        console.log('- verificarCambiosAsociaciones:', verificarCambiosAsociaciones());
        console.log('- idPresentacion:', idPresentacion);
        console.log('- idHoja:', idHoja);
        console.log('- idDiapositiva:', idDiapositiva);
        console.log('- filaSeleccionada:', filaSeleccionada ? `ID: ${filaSeleccionada.id}` : 'null');
        
        toast.loading('Guardando asociaciones...', { id: 'guardando-asociaciones' });
        
        try {
          // Verificar si tenemos todos los datos necesarios
          if (!idPresentacion || !idHoja || !idDiapositiva) {
            console.error('❌ [BotonGuardarElementos] Faltan datos necesarios para guardar asociaciones:');
            console.error(`- idPresentacion: ${idPresentacion || 'FALTA'}`);
            console.error(`- idHoja: ${idHoja || 'FALTA'}`);
            console.error(`- idDiapositiva: ${idDiapositiva || 'FALTA'}`);
            throw new Error('Faltan datos necesarios para guardar asociaciones');
          }
          
          // Ejecutar el guardado de asociaciones con el hook
          const resultadoAsociaciones = await guardarAsociaciones(
            elementos,
            filaSeleccionada,
            idPresentacion,  // Pasar el ID de presentación explícitamente
            idHoja,          // Pasar el ID de hoja explícitamente
            idDiapositiva    // Pasar el ID de diapositiva explícitamente
          );
          
          console.log('🔍 [BotonGuardarElementos] Resultado de guardarAsociaciones:', resultadoAsociaciones);
          
          if (resultadoAsociaciones.exito) {
            console.log('✅ [BotonGuardarElementos] Asociaciones guardadas correctamente');
            toast.success('Asociaciones guardadas correctamente', { id: 'guardando-asociaciones' });
            
            // Actualizar elementos asociados en la tabla si es necesario
            if (elementos.some(e => e.columnaAsociada) && filaSeleccionada) {
              console.log('🔍 [BotonGuardarElementos] Actualizando elementos asociados en la tabla');
              actualizarElementosAsociadosEnTabla(elementos, filaSeleccionada, idDiapositiva || '');
            }
            
            // Resetear estado de cambios en asociaciones
            setCambioAsociacionDetectado(false);
            marcarCambiosAsociaciones(false);
          } else {
            console.error('❌ [BotonGuardarElementos] Error al guardar asociaciones:', resultadoAsociaciones.mensaje);
            toast.error(`Error al guardar asociaciones: ${resultadoAsociaciones.mensaje}`, { 
              id: 'guardando-asociaciones',
              duration: 5000
            });
            
            // A pesar del error en asociaciones, continuamos para considerar exitoso el guardado de elementos
          }
        } catch (error) {
          console.error('❌ [BotonGuardarElementos] Error al guardar asociaciones:', error);
          toast.error('Error al guardar asociaciones', { 
            id: 'guardando-asociaciones',
            duration: 5000
          });
          
          // A pesar del error en asociaciones, continuamos para considerar exitoso el guardado de elementos
        }
      } else {
        console.log('ℹ️ [BotonGuardarElementos] No hay cambios en asociaciones, saltando guardado');
        console.log('- hayAsociacionesCambiadas (hook):', hayAsociacionesCambiadas());
        console.log('- cambioAsociacionDetectado:', cambioAsociacionDetectado);
        console.log('- verificarCambiosAsociaciones:', verificarCambiosAsociaciones());
      }
      
      // Paso 3: Ejecutar todo lo necesario al finalizar el guardado
      console.log('✅ [BotonGuardarElementos] Proceso de guardado completado');
      
      // Llamar a la función para resetear el estado de "modificado"
      onReset();
      
      // Cerrar el sidebar si está definida la función
      if (setSidebarAbierto) {
        console.log('ℹ️ [BotonGuardarElementos] Cerrando sidebar después de guardar');
        setSidebarAbierto(false);
      }
      
      // Mostrar mensaje de éxito final
      toast.success('Cambios guardados correctamente', { duration: 3000 });
    } catch (error) {
      console.error('❌ [BotonGuardarElementos] Error general al guardar cambios:', error);
      toast.error('Error al guardar los cambios', { duration: 5000 });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={guardarCambios}
      disabled={guardando || botonDeshabilitado}
    >
      {guardando ? <CircularProgress size={24} /> : <SaveIcon />}
      Guardar Cambios
    </Button>
  );
}