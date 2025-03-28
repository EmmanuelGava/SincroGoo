import React, { useContext, useEffect, useState } from 'react';
import { 
  IconButton, 
  Tooltip, 
  useTheme 
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { ElementoDiapositiva } from '@/tipos/diapositivas';
import { FilaSeleccionada } from '@/tipos/hojas';
import { useEditor } from '../contexto/EditorContext';
import { useThemeMode } from '@/lib/theme';
import { toast } from 'sonner';

interface BotonEnlazarProps {
  elemento: ElementoDiapositiva;
  filaSeleccionada: FilaSeleccionada | null;
  className?: string;
  marcarCambiosAsociaciones?: () => void;
  idPresentacion?: string;
  idHoja?: string;
}

export function BotonEnlazar({ 
  elemento, 
  filaSeleccionada, 
  className = "", 
  marcarCambiosAsociaciones,
  idPresentacion,
  idHoja
}: BotonEnlazarProps) {
  // Estado local para controlar el estado visualmente
  const [enlazado, setEnlazado] = useState(Boolean(elemento.columnaAsociada));
  
  // Obtener el tema
  const theme = useTheme();
  const { mode } = useThemeMode();
  
  // Obtener el contexto completo
  const context = useEditor();
  
  // Extraer los valores necesarios del contexto
  const { 
    asociarElemento, 
    desasociarElemento,
    setElementoSeleccionadoPopup,
    elementoSeleccionadoPopup,
  } = context;
  
  // Función para emitir evento de cambio de asociación
  const emitirEventoCambioAsociacion = (tipoAccion: 'asociar' | 'desasociar', columnaAnterior?: string, columnaNueva?: string) => {
    console.log('🔍 [BotonEnlazar] Emitiendo evento de cambio de asociación');
    console.log('- Elemento ID:', elemento.id);
    console.log('- Tipo de acción:', tipoAccion);
    console.log('- Columna anterior:', columnaAnterior || 'ninguna');
    console.log('- Columna nueva:', columnaNueva || 'ninguna');
    console.log('- idPresentacion:', idPresentacion);
    console.log('- idHoja:', idHoja);
    
    // Emitir evento personalizado para que otros componentes puedan escucharlo
    const eventoPersonalizado = new CustomEvent('cambio-asociacion', {
      detail: {
        elemento,
        columnaAnterior,
        columnaNueva,
        tipoAccion,
        idPresentacion,
        idHoja
      }
    });
    
    // Disparar el evento en el documento
    console.log('🔍 [BotonEnlazar] Disparando evento cambio-asociacion en el documento');
    document.dispatchEvent(eventoPersonalizado);
    console.log('✅ [BotonEnlazar] Evento cambio-asociacion disparado correctamente');
    
    // Marcar que hay cambios en las asociaciones
    if (marcarCambiosAsociaciones) {
      console.log('🔍 [BotonEnlazar] Marcando cambios en asociaciones');
      marcarCambiosAsociaciones();
      console.log('✅ [BotonEnlazar] Cambios en asociaciones marcados correctamente');
    } else {
      console.warn('⚠️ [BotonEnlazar] No hay función marcarCambiosAsociaciones disponible');
    }
  };
  
  // Actualizar el estado local cuando cambie el elemento
  useEffect(() => {
    console.log(`🔍 [BotonEnlazar] Actualizando estado para elemento ${elemento.id}, columnaAsociada: ${elemento.columnaAsociada || 'ninguna'}`);
    setEnlazado(Boolean(elemento.columnaAsociada));
  }, [elemento.columnaAsociada, elemento.id]);
  
  // Verificar si hay fila seleccionada
  const hayFilaSeleccionada = Boolean(filaSeleccionada);
  
  // Buscar la columna que contiene el valor del elemento
  const buscarColumnaPorValor = React.useCallback(() => {
    if (!filaSeleccionada) {
      console.log('🔍 [BotonEnlazar] No hay fila seleccionada para buscar coincidencias');
      return null;
    }
    
    if (!elemento.contenido || elemento.contenido.trim() === '') {
      console.log('🔍 [BotonEnlazar] El elemento no tiene contenido para buscar coincidencias');
      return null;
    }
    
    const elementoValor = elemento.contenido.trim();
    console.log('🔍 [BotonEnlazar] Buscando coincidencia para:', elementoValor);
    
    // Buscar en la fila seleccionada una columna que tenga el mismo valor que el elemento
    const columnaCoincidente = Object.entries(filaSeleccionada.valores).find(
      ([columna, valor]) => {
        if (valor === undefined || valor === null) return false;
        
        // Convertir ambos valores a string y normalizar
        const valorCelda = String(valor).trim();
        console.log(`🔍 [BotonEnlazar] Comparando con columna "${columna}": "${valorCelda}"`);
        
        // Comparación exacta
        if (valorCelda === elementoValor) {
          console.log(`✅ [BotonEnlazar] ¡Coincidencia exacta encontrada en columna "${columna}"!`);
          return true;
        }
        
        // Comparación ignorando mayúsculas/minúsculas
        if (valorCelda.toLowerCase() === elementoValor.toLowerCase()) {
          console.log(`✅ [BotonEnlazar] ¡Coincidencia (ignorando mayúsculas/minúsculas) encontrada en columna "${columna}"!`);
          return true;
        }
        
        return false;
      }
    );
    
    if (columnaCoincidente) {
      console.log(`✅ [BotonEnlazar] Columna coincidente encontrada: "${columnaCoincidente[0]}"`);
    } else {
      console.log('ℹ️ [BotonEnlazar] No se encontró ninguna columna coincidente');
    }
    
    return columnaCoincidente ? columnaCoincidente[0] : null;
  }, [filaSeleccionada, elemento.contenido]);
  
  // Obtener la columna coincidente
  const columnaCoincidente = buscarColumnaPorValor();
  
  // Función para manejar el clic en el botón
  const manejarClick = async () => {
    console.log('🔍 [BotonEnlazar] Iniciando manejarClick');
    console.log('- Elemento ID:', elemento.id);
    console.log('- Elemento está enlazado:', enlazado);
    console.log('- Hay fila seleccionada:', hayFilaSeleccionada);
    console.log('- Columna coincidente:', columnaCoincidente || 'ninguna');
    
    try {
      if (enlazado) {
        console.log('🔍 [BotonEnlazar] Desenlazando elemento');
        // Si ya está enlazado, desenlazar
        const columnaAnterior = elemento.columnaAsociada;
        console.log('- Columna anterior:', columnaAnterior || 'ninguna');
        
        console.log('🔍 [BotonEnlazar] Llamando a desasociarElemento');
        await desasociarElemento(elemento.id);
        console.log('✅ [BotonEnlazar] Elemento desasociado correctamente');
        
        // Actualizar estado local
        setEnlazado(false);
        
        // Si el popup está abierto con este elemento, cerrarlo
        if (elementoSeleccionadoPopup?.id === elemento.id) {
          console.log('🔍 [BotonEnlazar] Cerrando popup de selección');
          setElementoSeleccionadoPopup(null);
        }
        
        // Emitir evento de cambio de asociación
        emitirEventoCambioAsociacion('desasociar', columnaAnterior);
        
        // No mostrar notificación aquí, se mostrará al guardar
      } else if (hayFilaSeleccionada) {
        console.log('🔍 [BotonEnlazar] Intentando enlazar elemento');
        // Si hay una fila seleccionada, intentar enlazar
        if (columnaCoincidente) {
          console.log(`🔍 [BotonEnlazar] Enlazando automáticamente a columna "${columnaCoincidente}"`);
          // Si hay una columna que coincide con el valor del elemento, enlazar automáticamente
          await asociarElemento(elemento.id, columnaCoincidente);
          console.log('✅ [BotonEnlazar] Elemento asociado correctamente');
          
          // Actualizar estado local
          setEnlazado(true);
          
          // Emitir evento de cambio de asociación
          emitirEventoCambioAsociacion('asociar', undefined, columnaCoincidente);
          
          // No mostrar notificación aquí, se mostrará al guardar
        } else {
          console.log('🔍 [BotonEnlazar] No hay coincidencia automática, abriendo popup para selección manual');
          
          // NUEVA IMPLEMENTACIÓN: Marcar el elemento como pendiente de asociar
          // Esto permite al BotonGuardarElementos detectar que este elemento necesita ser guardado
          console.log('🔍 [BotonEnlazar] Marcando elemento como pendiente de asociar');
          elemento.marcadoParaAsociar = true;
          
          // Emitir evento para informar que hay un cambio de asociación pendiente
          emitirEventoCambioAsociacion('asociar', undefined, filaSeleccionada?.columnaSeleccionada || '');
          
          // Si no hay coincidencia, abrir el popup para selección manual
          setElementoSeleccionadoPopup(elemento);
        }
      } else {
        console.warn('⚠️ [BotonEnlazar] No hay fila seleccionada');
        // Si no hay fila seleccionada, mostrar error
        toast.error("Selecciona primero una fila de la tabla");
      }
    } catch (error) {
      console.error("❌ [BotonEnlazar] Error al manejar clic en botón enlazar:", error);
      if (error instanceof Error) {
        console.error('- Mensaje:', error.message);
        console.error('- Stack:', error.stack);
      } else {
        console.error('- Detalles:', JSON.stringify(error, null, 2));
      }
      toast.error("Error al procesar la operación");
    }
  };
  
  // Determinar el mensaje del tooltip
  const tooltipMessage = enlazado 
    ? `Desenlazar elemento ${elemento.columnaAsociada ? `(de "${elemento.columnaAsociada}")` : ''}`
    : !hayFilaSeleccionada 
      ? "⚠️ Selecciona primero una fila de la tabla"
      : columnaCoincidente
        ? `Enlazar a columna "${columnaCoincidente}"`
        : "No hay coincidencia con ninguna celda";
  
  // Color verde para el icono activo
  const activeGreen = '#22c55e';
  
  // Determinar el estilo del botón usando sx de Material UI
  const buttonSx = {
    color: enlazado 
      ? activeGreen // verde para enlazado
      : !hayFilaSeleccionada
        ? theme.palette.text.disabled // color deshabilitado del tema
        : mode === 'dark' ? theme.palette.text.primary : undefined, // color según el tema
    opacity: (!hayFilaSeleccionada && !enlazado) ? 0.5 : 1,
    '&:hover': {
      backgroundColor: enlazado 
        ? `${activeGreen}20` // verde con transparencia para el hover
        : undefined
    }
  };
  
  return (
    <Tooltip title={tooltipMessage} arrow>
      <span>
        <IconButton
          size="small"
          className={className}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Si no hay fila seleccionada y no está enlazado, mostrar mensaje
            if (!hayFilaSeleccionada && !enlazado) {
              toast.error("Selecciona primero una fila de la tabla para enlazar");
              return;
            }
            
            // Si está enlazado, permitir desenlazar aunque no haya fila seleccionada
            if (enlazado || hayFilaSeleccionada) {
              manejarClick();
            }
          }}
          disabled={!hayFilaSeleccionada && !enlazado}
          sx={buttonSx}
        >
          {enlazado ? <LinkIcon fontSize="small" /> : <LinkOffIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
} 