"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Card as MUICard, 
  CardContent as MUICardContent, 
  CardHeader as MUICardHeader, 
  Divider,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  styled
} from '@mui/material';
import type { Theme } from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { 
  Save as SaveIcon,
  Refresh as RefreshIcon, 
  RemoveRedEye as EyeIcon, 
  Link as LinkIcon, 
  Edit as EditIcon, 
  Close as CloseIcon, 
  Warning as WarningIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import Image from "next/image"
import { ElementoDiapositiva, VistaPreviaDiapositiva } from "@/tipos/diapositivas"
import { FilaSeleccionada } from "@/tipos/hojas"
import { toast } from "sonner"
import { VistaPreviaCambios } from "./VistaPreviaCambios"
import { CambioPrevio } from "@/tipos/diapositivas"
import { useEditor } from "../../contexto/EditorContext"
import { BotonEnlazar } from '../BotonEnlazar'
import { EditorElementoPopup } from "./EditorElementoPopup"
import { HistorialCambios } from "./HistorialCambios"
import { BotonGuardarElementos } from "./BotonGuardarElementos"
import { BotonCancelarElementos } from "./BotonCancelarElementos"
import { useAsociaciones } from "../../hooks/useAsociaciones"

interface EditorElementosProps {
  token: string;
  diapositivaSeleccionada?: VistaPreviaDiapositiva | null;
  elementos: ElementoDiapositiva[];
  elementosSeleccionados: string[];
  alSeleccionarDiapositiva: (idDiapositiva: string, idElemento: string | null) => Promise<void>;
  alActualizarElementos: (elementos: ElementoDiapositiva[]) => Promise<void>;
  alActualizarElementosDiapositiva: (elementos: ElementoDiapositiva[]) => void;
  filaSeleccionada: FilaSeleccionada | null;
  abierto: boolean;
  alCambiarApertura: (abierto: boolean) => void;
  diapositivas: VistaPreviaDiapositiva[];
  onEditarElemento: (elemento: ElementoDiapositiva) => void;
  className?: string;
  idPresentacion?: string;
  idHoja?: string;
}

// Clave para el almacenamiento local de miniaturas
const THUMBNAIL_CACHE_KEY = 'thumbnail_cache';
const THUMBNAIL_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

// Función para obtener la caché de miniaturas
const getThumbnailCache = () => {
  if (typeof window === 'undefined') return {};
  
  try {
    const cache = localStorage.getItem(THUMBNAIL_CACHE_KEY);
    if (cache) {
      const parsedCache = JSON.parse(cache);
      // Limpiar entradas expiradas
      const now = Date.now();
      Object.keys(parsedCache).forEach(key => {
        if (now - parsedCache[key].timestamp > THUMBNAIL_CACHE_DURATION) {
          delete parsedCache[key];
        }
      });
      return parsedCache;
    }
  } catch (error) {
    console.error('Error al obtener caché de miniaturas:', error);
  }
  
  return {};
};

// Función para guardar en la caché de miniaturas
const saveThumbnailCache = (key: string, dataUrl: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    const cache = getThumbnailCache();
    cache[key] = {
      dataUrl,
      timestamp: Date.now()
    };
    localStorage.setItem(THUMBNAIL_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error al guardar en caché de miniaturas:', error);
  }
};

// Componentes estilizados para Material UI
const ElementCard = styled(Paper)<{ theme?: Theme }>(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme?.spacing(1),
  padding: theme?.spacing(1.5),
  marginBottom: theme?.spacing(1.5),
  borderRadius: theme?.shape.borderRadius,
  border: `1px solid ${theme?.palette.divider}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme?.palette.primary.main,
    boxShadow: theme?.shadows[2],
    background: theme?.palette.mode === 'dark' 
      ? `rgba(255, 255, 255, 0.05)` 
      : `rgba(0, 0, 0, 0.02)`
  }
}));

const ElementContent = styled(Box)<{ theme?: Theme }>(({ theme }) => ({
  flex: 1,
  overflow: 'hidden',
  cursor: 'pointer',
  padding: theme?.spacing(1.5),
  borderRadius: theme?.shape.borderRadius,
  '&:hover': {
    backgroundColor: theme?.palette.mode === 'dark' 
      ? `rgba(255, 255, 255, 0.05)` 
      : `rgba(0, 0, 0, 0.04)`
  }
}));

const ScrollContainer = styled(Box)<{ theme?: Theme }>(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme?.spacing(0, 2),
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px'
  },
  '&::-webkit-scrollbar-track': {
    background: theme?.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.05)',
    borderRadius: '4px',
    margin: theme?.spacing(1, 0)
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme?.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    '&:hover': {
      background: theme?.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.3)' 
        : 'rgba(0, 0, 0, 0.3)'
    }
  },
  // Estilos para Firefox
  scrollbarWidth: 'thin',
  scrollbarColor: theme?.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)' 
    : 'rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)'
}));

export function EditorElementos({
  token,
  diapositivaSeleccionada,
  elementos,
  elementosSeleccionados,
  alSeleccionarDiapositiva,
  alActualizarElementos,
  alActualizarElementosDiapositiva,
  filaSeleccionada,
  abierto,
  alCambiarApertura,
  diapositivas,
  onEditarElemento,
  className = "",
  idPresentacion,
  idHoja
}: EditorElementosProps) {
  const theme = useTheme();
  const { theme: nextTheme } = useNextTheme();

  // Obtener funciones del contexto
  const { actualizarElementosAsociadosEnTabla, setElementoSeleccionadoPopup } = useEditor();

  console.log('🔍 [EditorElementos] Renderizando EditorElementos');
  console.log('🔍 [EditorElementos] Elementos recibidos:', elementos?.length || 0);
  console.log('🔍 [EditorElementos] Muestra de elementos:', elementos?.slice(0, 2).map(e => ({
    id: e.id,
    tipo: e.tipo,
    contenido: e.contenido,
    columnaAsociada: e.columnaAsociada
  })));
  
  console.log('🔍 [EditorElementos] Diapositiva seleccionada:', diapositivaSeleccionada?.id || 'ninguna');
  console.log('🔍 [EditorElementos] Fila seleccionada:', filaSeleccionada?.id || 'ninguna');

  // Estado para los elementos editados
  const [elementosEditados, setElementosEditados] = useState<ElementoDiapositiva[]>([]);
  const [hayElementosModificados, setHayElementosModificados] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrandoVistaPreviaCambios, setMostrandoVistaPreviaCambios] = useState(false);
  const [elementoAbierto, setElementoAbierto] = useState<string | null>(null);
  const [thumbnailCache, setThumbnailCache] = useState<{[key: string]: {dataUrl: string, timestamp: number}}>({});
  const ultimoHashRef = useRef<string>('');
  const [ignorarProximaActualizacion, setIgnorarProximaActualizacion] = useState(false);
  
  // Estado para el elemento seleccionado para el popover
  const [elementoSeleccionadoPopover, setElementoSeleccionadoPopover] = useState<ElementoDiapositiva | null>(null);
  
  // Estado para el popup de edición
  const [elementoPopup, setElementoPopup] = useState<ElementoDiapositiva | null>(null);

  // Usar el hook de asociaciones
  const { 
    guardarAsociaciones, 
    marcarCambiosAsociaciones, 
    hayAsociacionesCambiadas,
    setAsociacionesCambiadas
  } = useAsociaciones(
    idPresentacion || '', 
    idHoja || '', 
    diapositivaSeleccionada?.id || '', 
    filaSeleccionada
  );
  
  // Actualizar los elementos cuando cambien los elementos recibidos por props
  useEffect(() => {
    console.log('🔄 [EditorElementos] Actualizando elementosEditados desde props');
    console.log('🔄 [EditorElementos] Elementos recibidos:', elementos?.length || 0);
    
    // Solo actualizar si hay elementos y son diferentes a los actuales
    if (elementos && elementos.length > 0) {
      const hash = JSON.stringify(elementos.map(e => e.id + e.contenido));
      
      if (hash !== ultimoHashRef.current) {
        console.log('✅ [EditorElementos] Hash diferente, actualizando elementos');
        console.log('✅ [EditorElementos] Muestra de elementos:', elementos.slice(0, 2).map(e => ({
          id: e.id,
          tipo: e.tipo,
          contenido: e.contenido || "(Sin contenido real)",
          columnaAsociada: e.columnaAsociada
        })));
        
        setElementosEditados(elementos);
        ultimoHashRef.current = hash;
        setHayElementosModificados(false);
      } else {
        console.log('ℹ️ [EditorElementos] Hash igual, no se actualizan elementos');
      }
    } else {
      console.log('⚠️ [EditorElementos] No hay elementos para actualizar o la lista está vacía');
      setElementosEditados([]);
      ultimoHashRef.current = '';
    }
  }, [elementos]);

  // Cargar caché de miniaturas al montar el componente
  useEffect(() => {
    setThumbnailCache(getThumbnailCache());
  }, []);

  // Función para generar un hash simple de los elementos
  const generarHashElementos = (elementos: ElementoDiapositiva[]): string => {
    return elementos.map(e => `${e.id}:${e.contenido}`).join('|');
  };

  // Efecto para sincronizar los elementos cuando cambian desde las props
  useEffect(() => {
    // Generar hash para comparar si realmente hay cambios
    const hashActual = generarHashElementos(elementos);
    
    // Solo actualizar si el hash ha cambiado
    if (hashActual !== ultimoHashRef.current) {
      console.log('Hash de elementos ha cambiado, actualizando estado local');
      
      // Si hay elementos y son diferentes a los actuales
      if (elementos.length > 0) {
        // Actualizar el estado local solo si no estamos ignorando la próxima actualización
        if (!ignorarProximaActualizacion) {
          console.log('Actualizando elementos editados desde props');
          setElementosEditados([...elementos]);
          
          // Verificar si hay elementos modificados
          verificarCambios(elementos);
        } else {
          console.log('Ignorando actualización de props debido a bandera');
        }
      } else if (elementos.length === 0 && elementosEditados.length > 0) {
        // Si se vacían los elementos, actualizar el estado local
        setElementosEditados([]);
        setHayElementosModificados(false);
        setAsociacionesCambiadas(false);
      }
      
      // Actualizar el hash de referencia
      ultimoHashRef.current = hashActual;
    }
  }, [elementos, ignorarProximaActualizacion]);

  // Memorizar las diapositivas para evitar re-renderizaciones innecesarias
  const diapositivasMemoizadas = useMemo(() => {
    return diapositivas.map(diapositiva => {
      // Verificar si la miniatura está en caché
      const cacheKey = diapositiva.urlImagen || '';
      const cachedThumbnail = cacheKey ? thumbnailCache[cacheKey] : undefined;
      
      return {
        ...diapositiva,
        // Usar la versión en caché si está disponible
        urlImagenCached: cachedThumbnail?.dataUrl || diapositiva.urlImagen
      };
    });
  }, [diapositivas, thumbnailCache]);

  // Función para manejar la carga de imágenes
  const manejarCargaImagen = (id: string, url: string) => {
    // Solo registrar la carga exitosa sin actualizar el estado para evitar re-renderizaciones
    console.log(`Imagen cargada correctamente: ${id}`);
    
    // Guardar en caché local si es una URL de API
    if (url.startsWith('/api/thumbnails')) {
      const canvas = document.createElement('canvas');
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const dataUrl = canvas.toDataURL('image/png');
            saveThumbnailCache(url, dataUrl);
          } catch (error) {
            console.error('Error al convertir imagen a dataURL:', error);
          }
        }
      };
      img.src = url;
    }
  }

  // Función para manejar errores de carga de imágenes
  const manejarErrorImagen = (e: React.SyntheticEvent<HTMLImageElement, Event>, id: string) => {
    console.warn(`Error al cargar la imagen para la diapositiva ${id}`);
    // Establecer una imagen de fallback sin actualizar el estado
    const target = e.target as HTMLImageElement;
    if (target.src !== '/placeholder-slide.png') {
      target.src = '/placeholder-slide.png';
    }
  }

  // Función para guardar cambios (ahora delegada al componente BotonGuardarElementos)
  const guardarCambios = async () => {
    // Esta función ahora está implementada en BotonGuardarElementos
    console.log("Esta función ha sido delegada a BotonGuardarElementos");
  };

  // Función para restaurar originales (ahora delegada al componente BotonCancelarElementos)
  const restaurarOriginales = () => {
    // Esta función ahora está implementada en BotonCancelarElementos
    console.log("Esta función ha sido delegada a BotonCancelarElementos");
  };

  const extraerVariables = (contenido: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const coincidencias = contenido.match(regex);
    return coincidencias ? coincidencias.map(match => match.slice(2, -2)) : [];
  };

  const generarCambiosPrevios = (): CambioPrevio[] => {
    if (!diapositivaSeleccionada) return []
    
    return elementosEditados.map((elementoEditado) => {
      const elementoOriginal = elementos.find(e => e.id === elementoEditado.id)
      
      return {
        idElemento: elementoEditado.id,
        idDiapositiva: diapositivaSeleccionada.id,
        contenidoAnterior: elementoOriginal?.contenido || '',
        contenidoNuevo: elementoEditado.contenido || '',
        variables: extraerVariables(elementoEditado.contenido || '')
      }
    }).filter(cambio => cambio.contenidoAnterior !== cambio.contenidoNuevo)
  }

  const mostrarVistaPreviaCambios = () => {
    setMostrandoVistaPreviaCambios(true)
  }

  // Función para manejar la actualización de un elemento desde el popup
  const manejarActualizacionElementoPopup = (elementoActualizado: ElementoDiapositiva) => {
    console.log("Actualizando elemento desde popup:", elementoActualizado);
    
    // Obtener el elemento original para preservar su asociación
    const elementoOriginal = elementosEditados.find(e => e.id === elementoActualizado.id);
    if (!elementoOriginal) return;
    
    // Preservar la asociación original si existe
    const elementoFinal = {
      ...elementoActualizado,
      columnaAsociada: elementoOriginal.columnaAsociada,
      tipoAsociacion: elementoOriginal.tipoAsociacion
    };
    
    // Actualizar el elemento en el estado local
    const nuevosElementos = elementosEditados.map(elem => 
      elem.id === elementoFinal.id ? elementoFinal : elem
    );
    
    // Actualizar el estado
    setElementosEditados(nuevosElementos);
    setHayElementosModificados(true);
    alActualizarElementosDiapositiva(nuevosElementos);
    
    // Si hay cambios en asociaciones, marcarlos
    if (elementoFinal.columnaAsociada !== elementoOriginal.columnaAsociada) {
      marcarCambiosAsociaciones();
    }
    
    // Mostrar notificación de éxito
    toast.success(`Contenido del elemento actualizado`, {
      duration: 3000
    });
    
    // Cerrar el popup
    setElementoPopup(null);
  };

  // Función para verificar si hay elementos modificados
  const verificarCambios = (elementosActuales: ElementoDiapositiva[]) => {
    // Verificar cambios en contenido
    const modificadosContenido = elementosActuales.some(elemento => elemento.modificado === true);
    
    // Verificar cambios en asociaciones comparando con los elementos originales
    const modificadosAsociaciones = elementosActuales.some(elemento => {
      const elementoOriginal = elementos.find(e => e.id === elemento.id);
      return elemento.columnaAsociada !== elementoOriginal?.columnaAsociada;
    });
    
    console.log('Verificando cambios:', {
      modificadosContenido,
      modificadosAsociaciones
    });
    
    return modificadosContenido || modificadosAsociaciones;
  }

  // Efecto para actualizar hayElementosModificados cuando cambien los elementos editados
  useEffect(() => {
    const tieneModificaciones = verificarCambios(elementosEditados);
    setHayElementosModificados(tieneModificaciones);
  }, [elementosEditados, elementos]);

  // Actualizar el botón guardar
  const botonGuardarDeshabilitado = useMemo(() => {
    return !verificarCambios(elementosEditados) || guardando;
  }, [elementosEditados, elementos, guardando]);

  // Función para manejar la selección de valor desde el popover
  const manejarSeleccionValorPopover = (valor: string, columna: string) => {
    if (elementoSeleccionadoPopover && filaSeleccionada) {
      // Actualizar solo el contenido del elemento, sin asociarlo a la columna
      manejarCambioContenido(elementoSeleccionadoPopover.id, valor);
      
      // Cerrar el popover
      setElementoAbierto(null);
      
      // Mostrar notificación
      toast.success("Contenido actualizado", { duration: 2000 });
    }
  };

  // Escuchar eventos de cambio de asociación
  useEffect(() => {
    if (idPresentacion && idHoja) {
      console.log('🔍 [EditorElementos] Configurando listener para eventos de cambio de asociación');
      
      // Listener para cambios de asociación
      const handleCambioAsociacion = (event: CustomEvent) => {
        console.log('🔍 [EditorElementos] Evento de cambio de asociación detectado:', event.detail);
        
        // Verificar si el evento corresponde a esta presentación y hoja
        if (
          event.detail.idPresentacion === idPresentacion && 
          event.detail.idHoja === idHoja
        ) {
          console.log('✅ [EditorElementos] Evento corresponde a esta presentación y hoja, marcando cambios');
          marcarCambiosAsociaciones();
        }
      };
      
      // Añadir listener para el evento personalizado
      document.addEventListener('cambio-asociacion', handleCambioAsociacion as EventListener);
      
      // Limpiar listener al desmontar
      return () => {
        document.removeEventListener('cambio-asociacion', handleCambioAsociacion as EventListener);
      };
    }
  }, [idPresentacion, idHoja, marcarCambiosAsociaciones]);

  const manejarCambioContenido = (id: string, nuevoContenido: string) => {
    const elementoOriginal = elementosEditados.find(e => e.id === id);
    if (!elementoOriginal) return;
    
    // Verificar si el contenido ha cambiado realmente
    if (elementoOriginal.contenido === nuevoContenido) {
      console.log(`El contenido del elemento ${id} no ha cambiado, ignorando actualización`);
      return;
    }
    
    console.log(`Actualizando contenido del elemento ${id}: "${elementoOriginal.contenido}" -> "${nuevoContenido}"`);
    
    // Actualizar el elemento en el estado local
    const nuevosElementos = elementosEditados.map(elemento => 
      elemento.id === id 
        ? { ...elemento, contenido: nuevoContenido, modificado: true } 
        : elemento
    );
    
    setElementosEditados(nuevosElementos);
    setHayElementosModificados(true);
    alActualizarElementosDiapositiva(nuevosElementos);
  };

  // Función para manejar la selección de celda
  const manejarSeleccionCelda = (elementoId: string, columna: string) => {
    const elemento = elementosEditados.find(e => e.id === elementoId);
    if (!elemento) return;
    
    // Establecer el elemento seleccionado para el popover
    setElementoSeleccionadoPopover(elemento);
    
    // Abrir el popover
    setElementoAbierto(elementoId);
  };

  // Función para manejar cuando se cambia un elemento desde el popup
  const handleElementoActualizado = (elementoActualizado: ElementoDiapositiva) => {
    console.log('🔍 [EditorElementos] Elemento actualizado desde popup:', elementoActualizado);
    
    // Buscar el elemento anterior para comprobar si había una columna asociada antes
    const elementoAnterior = elementosEditados.find(el => el.id === elementoActualizado.id);
    const teniaAsociacionAntes = elementoAnterior?.columnaAsociada;
    const tieneAsociacionAhora = elementoActualizado.columnaAsociada;
    
    // Actualizar el elemento en la lista
    const nuevosElementos = elementosEditados.map(el => 
      el.id === elementoActualizado.id ? elementoActualizado : el
    );
    
    console.log('🔍 [EditorElementos] Lista de elementos actualizada');
    setElementosEditados(nuevosElementos);
    setHayElementosModificados(true);
    
    // Determinar si hubo cambios en asociaciones (columna agregada, cambiada o eliminada)
    const hayModificacionAsociacion = 
      teniaAsociacionAntes !== tieneAsociacionAhora || 
      (teniaAsociacionAntes && tieneAsociacionAhora && teniaAsociacionAntes !== tieneAsociacionAhora);
    
    console.log('🔍 [EditorElementos] Estado de asociaciones:');
    console.log(`- Asociación anterior: ${teniaAsociacionAntes || 'ninguna'}`);
    console.log(`- Asociación actual: ${tieneAsociacionAhora || 'ninguna'}`);
    console.log(`- Hay modificación: ${hayModificacionAsociacion ? 'Sí' : 'No'}`);
    
    // Verificar si hay cambios en las asociaciones (columna agregada, cambiada o eliminada)
    if (hayModificacionAsociacion) {
      console.log('🔍 [EditorElementos] Hay cambio en asociaciones, marcando estado');
      if (marcarCambiosAsociaciones) {
        marcarCambiosAsociaciones(true);
      }
      
      // Disparar evento para notificar el cambio de asociación con todos los datos necesarios
      const evento = new CustomEvent('cambio-asociacion', {
        detail: {
          elemento: elementoActualizado,
          columnaNueva: tieneAsociacionAhora || null,
          columnaAnterior: teniaAsociacionAntes || null,
          tipoAccion: tieneAsociacionAhora ? (teniaAsociacionAntes ? 'modificar' : 'asociar') : 'desasociar',
          idPresentacion,
          idHoja
        }
      });
      document.dispatchEvent(evento);
      console.log('✅ [EditorElementos] Evento cambio-asociacion disparado');
    } else {
      console.log('ℹ️ [EditorElementos] No hubo cambios en asociaciones');
      
      // Incluso si no detectamos cambios en asociaciones, podemos tener situaciones donde
      // el elemento fue modificado en otros aspectos que podrían afectar asociaciones
      // indirectamente. Por ejemplo, cambios de texto en un elemento que ya tiene asociación.
      // Marcar como modificado para garantizar correcta sincronización.
      if (teniaAsociacionAntes || tieneAsociacionAhora) {
        console.log('🔍 [EditorElementos] Elemento tiene o tenía asociación, marcando cambios por precaución');
        if (marcarCambiosAsociaciones) {
          marcarCambiosAsociaciones(true);
        }
      }
    }
  };
  
  // Configurar un listener para eventos de cambio de asociación
  useEffect(() => {
    console.log('🔍 [EditorElementos] Configurando listener para eventos de cambio de asociación');
    
    const handleCambioAsociacion = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { elemento, tipoAccion } = customEvent.detail;
      
      console.log('🔍 [EditorElementos] Evento cambio-asociacion recibido:', customEvent.detail);
      
      // Actualizar el elemento en la lista
      const nuevosElementos = elementosEditados.map(el => 
        el.id === elemento.id ? elemento : el
      );
      
      console.log('🔍 [EditorElementos] Lista de elementos actualizada por evento');
      setElementosEditados(nuevosElementos);
      setHayElementosModificados(true);
      
      // Marcar cambios en asociaciones
      if (marcarCambiosAsociaciones) {
        console.log('🔍 [EditorElementos] Marcando cambios en asociaciones por evento');
        marcarCambiosAsociaciones();
      }
    };
    
    document.addEventListener('cambio-asociacion', handleCambioAsociacion);
    
    return () => {
      document.removeEventListener('cambio-asociacion', handleCambioAsociacion);
    };
  }, [elementosEditados, marcarCambiosAsociaciones]);

  return (
    <Box className={`${className}`} sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      borderRadius: 1,
      overflow: 'hidden'
    }}>
      {/* Panel de editor de elementos */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1
      }}>
        {/* Cabecera */}
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6">Editor de Elementos</Typography>
          {diapositivaSeleccionada && (
            <Typography variant="body2" color="text.secondary">
              Diapositiva: {diapositivaSeleccionada.titulo}
            </Typography>
          )}
        </Box>

        {/* Lista de elementos */}
        <ScrollContainer sx={{ flex: 1 }}>
          <Box sx={{ p: 2 }}>
            {elementosEditados.length > 0 ? (
              elementosEditados.map((elemento) => (
                <ElementCard 
                  key={elemento.id} 
                  elevation={0}
                  sx={{
                    borderLeft: elemento.columnaAsociada 
                      ? '3px solid' 
                      : 'none',
                    borderLeftColor: elemento.columnaAsociada 
                      ? 'primary.main' 
                      : 'transparent',
                    bgcolor: elemento.modificado 
                      ? (theme: any) => theme.palette.mode === 'dark' 
                        ? 'rgba(144, 202, 249, 0.12)' 
                        : 'rgba(66, 165, 245, 0.08)'
                      : 'background.paper'
                  }}
                >
                  <ElementContent
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      console.log('Abriendo popup para editar elemento:', elemento);
                      console.log('Fila seleccionada:', filaSeleccionada);
                      
                      if (filaSeleccionada) {
                        // Capturar la posición del clic
                        const rect = e.currentTarget.getBoundingClientRect();
                        const position = {
                          x: rect.left + window.scrollX,
                          y: rect.top + window.scrollY
                        };
                        
                        console.log('Posición del elemento clickeado:', position);
                        
                        // Pasar la posición al contexto
                        setElementoSeleccionadoPopup(elemento, position);
                        
                        // Notificar al componente padre (para compatibilidad)
                        onEditarElemento(elemento);
                      } else {
                        toast.error("Selecciona primero una fila de la hoja de cálculo");
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Typography 
                        variant="subtitle2" 
                        color={elemento.modificado ? "primary" : "text.primary"} 
                        sx={{ 
                          mb: 0.5,
                          fontWeight: elemento.modificado ? 600 : 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        {elemento.tipo === 'texto' ? 'Texto' : 
                         elemento.tipo === 'forma' ? 'Forma' : 
                         elemento.tipo === 'tabla' ? 'Tabla' : 
                         elemento.tipo === 'imagen' ? 'Imagen' : 
                         elemento.tipo === 'titulo' ? 'Título' : 
                         elemento.tipo === 'subtitulo' ? 'Subtítulo' : 
                         elemento.tipo === 'lista' ? 'Lista' : 'Elemento'}
                        {elemento.modificado && (
                          <Box 
                            component="span" 
                            sx={{ 
                              fontSize: '0.7rem', 
                              bgcolor: 'primary.main', 
                              color: 'primary.contrastText',
                              px: 0.7,
                              py: 0.1,
                              borderRadius: '4px',
                              ml: 0.5
                            }}
                          >
                            Modificado
                          </Box>
                        )}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {elemento.contenido || "(Sin contenido)"}
                      </Typography>
                      {elemento.columnaAsociada && (
                        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" color="primary.main" sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                            <LinkIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                            Enlazado a: {elemento.columnaAsociada}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </ElementContent>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BotonEnlazar 
                      elemento={elemento}
                      filaSeleccionada={filaSeleccionada}
                      className="ml-auto"
                      marcarCambiosAsociaciones={marcarCambiosAsociaciones}
                      idPresentacion={idPresentacion}
                      idHoja={idHoja}
                    />
                    
                    <IconButton
                      size="small"
                      color="primary"
                      sx={{ 
                        opacity: 0.7, 
                        '&:hover': { 
                          opacity: 1,
                          backgroundColor: 'rgba(66, 165, 245, 0.12)'
                        } 
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Abriendo popup de edición para elemento:', elemento);
                        console.log('Fila seleccionada:', filaSeleccionada);
                        if (filaSeleccionada) {
                          // Abrir el popup directamente
                          setElementoPopup(elemento);
                          // Notificar al componente padre (para compatibilidad)
                          onEditarElemento(elemento);
                        } else {
                          toast.error("Selecciona primero una fila de la hoja de cálculo");
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ElementCard>
              ))
            ) : (
              <Box sx={{ 
                textAlign: 'center', 
                p: 4, 
                color: 'text.secondary',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                my: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1
              }}>
                <WarningIcon sx={{ fontSize: 32, color: 'text.secondary', opacity: 0.7 }} />
                <Typography variant="body1">
                  No hay elementos en esta diapositiva
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecciona una diapositiva con elementos para editar
                </Typography>
              </Box>
            )}
          </Box>
        </ScrollContainer>

        {/* Botones de acción */}
        <Box sx={{ 
          p: 1.5, 
          borderTop: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EyeIcon />}
              onClick={mostrarVistaPreviaCambios}
              disabled={!hayElementosModificados && !hayAsociacionesCambiadas()}
            >
              Vista Previa
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BotonCancelarElementos
              elementos={elementosEditados}
              elementosOriginales={elementos}
              hayElementosModificados={hayElementosModificados}
              onRestaurar={(elementosRestaurados) => {
                setElementosEditados(elementosRestaurados);
                setHayElementosModificados(false);
                alActualizarElementosDiapositiva(elementosRestaurados);
                setElementoAbierto(null);
                setAsociacionesCambiadas(false);
              }}
              setAsociacionesCambiadas={setAsociacionesCambiadas}
            />
            <BotonGuardarElementos
              elementos={elementosEditados}
              elementosOriginales={elementos}
              hayElementosModificados={hayElementosModificados}
              alGuardar={alActualizarElementos}
              onReset={() => {
                setHayElementosModificados(false);
              }}
              idPresentacion={idPresentacion}
              idHoja={idHoja}
              idDiapositiva={diapositivaSeleccionada?.id || ''}
              filaSeleccionada={filaSeleccionada}
              setSidebarAbierto={alCambiarApertura}
            />
          </Box>
        </Box>
      </Box>

      {/* Diálogo de vista previa de cambios */}
      {mostrandoVistaPreviaCambios && (
        <VistaPreviaCambios
          cambios={generarCambiosPrevios()}
          abierto={mostrandoVistaPreviaCambios}
          onCerrar={() => setMostrandoVistaPreviaCambios(false)}
          onConfirmar={() => {
            setMostrandoVistaPreviaCambios(false);
            guardarCambios();
          }}
        />
      )}

      {/* Popup de edición de elemento - Renderizado dentro del componente */}
      {elementoPopup && filaSeleccionada && (
        <EditorElementoPopup 
          elemento={elementoPopup}
          filaSeleccionada={filaSeleccionada}
          abierto={!!elementoPopup}
          alCerrar={() => {
            console.log("Cerrando popup de edición de elemento");
            setElementoPopup(null);
          }}
          alGuardar={manejarActualizacionElementoPopup}
        />
      )}
    </Box>
  )
} 