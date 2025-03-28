import { SupabaseService } from '@/servicios/supabase/globales/supabase-service';

// Constantes
const THUMBNAIL_CACHE_KEY = 'thumbnailCache';
const THUMBNAIL_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
const API_THUMBNAILS_ENDPOINT = '/api/thumbnails';
const MAX_CACHE_SIZE = 50; // Número máximo de entradas en caché
const MAX_DATAURL_SIZE = 100000; // Tamaño máximo aproximado de un dataURL (100KB)
const QUOTA_EXCEEDED_FLAG = 'thumbnailCacheQuotaExceeded';
const STORAGE_BUCKET = 'thumbnails'; // Bucket de Supabase Storage para miniaturas

// Interfaz para la caché de miniaturas
interface ThumbnailCacheEntry {
  dataUrl: string;
  timestamp: number;
  size?: number; // Tamaño aproximado en bytes
}

interface ThumbnailCache {
  [key: string]: ThumbnailCacheEntry;
}

// Caché en memoria para evitar múltiples lecturas de localStorage
let memoryCache: ThumbnailCache = {};
let quotaExceeded = false;

/**
 * Verifica si se ha excedido la cuota de localStorage
 */
const isQuotaExceeded = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Verificar si ya sabemos que se ha excedido la cuota
  if (quotaExceeded) return true;
  
  // Verificar si hay una bandera guardada
  const flag = localStorage.getItem(QUOTA_EXCEEDED_FLAG);
  if (flag === 'true') {
    quotaExceeded = true;
    return true;
  }
  
  return false;
};

/**
 * Marca que se ha excedido la cuota de localStorage
 */
const markQuotaExceeded = (): void => {
  if (typeof window === 'undefined') return;
  
  quotaExceeded = true;
  
  try {
    localStorage.setItem(QUOTA_EXCEEDED_FLAG, 'true');
  } catch (error) {
    console.error('Error al marcar cuota excedida:', error);
  }
};

/**
 * Calcula el tamaño aproximado de un dataURL en bytes
 */
const calculateDataUrlSize = (dataUrl: string): number => {
  // Un dataURL base64 ocupa aproximadamente 4/3 de su longitud en bytes
  return Math.ceil(dataUrl.length * 0.75);
};

/**
 * Limpia la caché para hacer espacio para nuevas entradas
 */
const cleanupCache = (cache: ThumbnailCache): ThumbnailCache => {
  // Si hay menos entradas que el máximo, no hacer nada
  if (Object.keys(cache).length <= MAX_CACHE_SIZE) {
    return cache;
  }
  
  // Ordenar las entradas por timestamp (más antiguas primero)
  const entries = Object.entries(cache).sort(
    ([, a], [, b]) => a.timestamp - b.timestamp
  );
  
  // Eliminar las entradas más antiguas hasta que queden MAX_CACHE_SIZE
  const newCache: ThumbnailCache = {};
  entries.slice(-MAX_CACHE_SIZE).forEach(([key, value]) => {
    newCache[key] = value;
  });
  
  console.log(`Caché limpiada: ${Object.keys(cache).length} -> ${Object.keys(newCache).length} entradas`);
  return newCache;
};

/**
 * Comprime un dataURL reduciendo su calidad
 */
const compressDataUrl = (dataUrl: string, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('No se pudo obtener el contexto del canvas'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Comprimir la imagen reduciendo su calidad
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    
    img.onerror = () => {
      reject(new Error('Error al cargar la imagen para compresión'));
    };
    
    img.src = dataUrl;
  });
};

/**
 * Obtiene la caché de miniaturas desde localStorage
 */
export const getThumbnailCache = (): ThumbnailCache => {
  // Si ya tenemos la caché en memoria, devolverla
  if (Object.keys(memoryCache).length > 0) {
    return memoryCache;
  }
  
  if (typeof window === 'undefined') return {} as ThumbnailCache;
  
  // Si se ha excedido la cuota, devolver la caché en memoria
  if (isQuotaExceeded()) {
    return memoryCache;
  }
  
  try {
    const cache = localStorage.getItem(THUMBNAIL_CACHE_KEY);
    if (cache) {
      const parsedCache = JSON.parse(cache) as ThumbnailCache;
      // Limpiar entradas expiradas
      const now = Date.now();
      Object.keys(parsedCache).forEach(key => {
        if (now - parsedCache[key].timestamp > THUMBNAIL_CACHE_DURATION) {
          delete parsedCache[key];
        }
      });
      
      // Limpiar caché si hay demasiadas entradas
      const cleanedCache = cleanupCache(parsedCache);
      
      // Guardar en memoria
      memoryCache = cleanedCache;
      
      // Guardar la caché limpia en localStorage
      try {
        localStorage.setItem(THUMBNAIL_CACHE_KEY, JSON.stringify(cleanedCache));
      } catch (error) {
        console.error('Error al guardar caché limpia en localStorage:', error);
        markQuotaExceeded();
      }
      
      return cleanedCache;
    }
  } catch (error) {
    console.error('Error al obtener caché de miniaturas:', error);
    markQuotaExceeded();
  }
  
  return {} as ThumbnailCache;
};

/**
 * Guarda una miniatura en la caché local
 */
export const saveThumbnailCache = async (key: string, dataUrl: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  // Si se ha excedido la cuota, solo guardar en memoria
  if (isQuotaExceeded()) {
    try {
      // Calcular el tamaño del dataURL
      const size = calculateDataUrlSize(dataUrl);
      
      // Si el dataURL es demasiado grande, intentar comprimirlo
      let finalDataUrl = dataUrl;
      if (size > MAX_DATAURL_SIZE) {
        try {
          finalDataUrl = await compressDataUrl(dataUrl, 0.5);
          console.log(`Imagen comprimida: ${size} -> ${calculateDataUrlSize(finalDataUrl)} bytes`);
        } catch (error) {
          console.error('Error al comprimir imagen:', error);
        }
      }
      
      // Actualizar la caché en memoria
      memoryCache[key] = {
        dataUrl: finalDataUrl,
        timestamp: Date.now(),
        size: calculateDataUrlSize(finalDataUrl)
      };
      
      // Limpiar caché si hay demasiadas entradas
      memoryCache = cleanupCache(memoryCache);
    } catch (error) {
      console.error('Error al guardar en caché de memoria:', error);
    }
    return;
  }
  
  try {
    const cache = getThumbnailCache();
    
    // Calcular el tamaño del dataURL
    const size = calculateDataUrlSize(dataUrl);
    
    // Si el dataURL es demasiado grande, intentar comprimirlo
    let finalDataUrl = dataUrl;
    if (size > MAX_DATAURL_SIZE) {
      try {
        finalDataUrl = await compressDataUrl(dataUrl, 0.5);
        console.log(`Imagen comprimida: ${size} -> ${calculateDataUrlSize(finalDataUrl)} bytes`);
      } catch (error) {
        console.error('Error al comprimir imagen:', error);
      }
    }
    
    cache[key] = {
      dataUrl: finalDataUrl,
      timestamp: Date.now(),
      size: calculateDataUrlSize(finalDataUrl)
    };
    
    // Limpiar caché si hay demasiadas entradas
    const cleanedCache = cleanupCache(cache);
    
    // Actualizar la caché en memoria
    memoryCache = cleanedCache;
    
    // Guardar en localStorage
    try {
      localStorage.setItem(THUMBNAIL_CACHE_KEY, JSON.stringify(cleanedCache));
    } catch (error) {
      console.error('Error al guardar en caché de miniaturas:', error);
      markQuotaExceeded();
      
      // Si se excede la cuota, mantener solo en memoria
      console.log('Cambiando a modo de caché en memoria debido a cuota excedida');
    }
  } catch (error) {
    console.error('Error al guardar en caché de miniaturas:', error);
  }
};

/**
 * Convierte una URL de imagen a dataURL para guardar en caché
 */
export const convertImageToDataUrl = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
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
          resolve(dataUrl);
        } catch (error) {
          console.error('Error al convertir imagen a dataURL:', error);
          reject(error);
        }
      } else {
        reject(new Error('No se pudo obtener el contexto del canvas'));
      }
    };
    
    img.onerror = (error) => {
      console.error('Error al cargar la imagen:', error);
      reject(error);
    };
    
    img.src = url;
  });
};

/**
 * Maneja la carga de una imagen y la guarda en caché
 */
export const handleImageLoad = async (id: string, url: string): Promise<void> => {
  console.log(`Imagen cargada correctamente: ${id}`);
  
  // Guardar en caché local si es una URL de API
  if (url.startsWith('/api/thumbnails')) {
    try {
      const dataUrl = await convertImageToDataUrl(url);
      saveThumbnailCache(url, dataUrl);
    } catch (error) {
      console.error('Error al manejar carga de imagen:', error);
    }
  }
};

/**
 * Maneja errores de carga de imágenes
 */
export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, id: string): void => {
  console.warn(`Error al cargar la imagen para la diapositiva ${id}`);
  // Establecer una imagen de fallback
  const target = e.target as HTMLImageElement;
  if (target.src !== '/placeholder-slide.png') {
    target.src = '/placeholder-slide.png';
  }
};

/**
 * Convierte un dataURL a un Blob
 */
const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
};

/**
 * Guarda una miniatura en Supabase Storage
 */
export const saveThumbnailToSupabaseStorage = async (
  presentationId: string,
  slideId: string,
  dataUrl: string
): Promise<string | null> => {
  try {
    // Verificar si el bucket existe, si no, intentar usarlo de todos modos
    let bucketExists = false;
    try {
      const { data: buckets } = await SupabaseService.listBuckets();
      bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET) || false;
      
      if (!bucketExists) {
        try {
          const { error } = await SupabaseService.createBucket(STORAGE_BUCKET, {
            public: true // Hacer el bucket público para que las imágenes sean accesibles
          });
          
          if (error) {
            console.log('No se pudo crear el bucket, intentando usar uno existente:', error.message);
            // No retornamos null aquí, intentamos continuar
          } else {
            bucketExists = true;
          }
        } catch (bucketError) {
          console.log('Error al crear bucket, intentando usar uno existente:', bucketError);
          // No retornamos null aquí, intentamos continuar
        }
      }
    } catch (listError) {
      console.log('Error al listar buckets, intentando usar uno predeterminado:', listError);
      // No retornamos null aquí, intentamos continuar
    }
    
    // Convertir dataURL a Blob
    const blob = dataURLtoBlob(dataUrl);
    
    // Crear un nombre de archivo único
    const fileName = `${presentationId}/${slideId}.jpg`;
    
    // Intentar subir el archivo incluso si no pudimos verificar el bucket
    try {
      // Convertir Blob a File para cumplir con la interfaz
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      
      const { data, error } = await SupabaseService.uploadFile(
        STORAGE_BUCKET,
        fileName,
        file,
        { upsert: true }
      );
      
      if (error) {
        console.log('No se pudo guardar la miniatura en Storage:', error.message);
        return null;
      }
      
      // Obtener la URL pública
      const publicUrl = await SupabaseService.getPublicUrl(STORAGE_BUCKET, fileName);
      
      console.log(`Miniatura guardada en Supabase Storage: ${publicUrl}`);
      return publicUrl;
    } catch (uploadError) {
      console.log('Error al subir la miniatura:', uploadError);
      return null;
    }
  } catch (error) {
    console.log('Error general al guardar miniatura:', error);
    return null;
  }
};

/**
 * Obtiene una miniatura desde Supabase Storage
 */
export const getThumbnailFromSupabaseStorage = async (
  presentationId: string,
  slideId: string
): Promise<string | null> => {
  try {
    // Crear el nombre de archivo
    const fileName = `${presentationId}/${slideId}.jpg`;
    
    // Verificar si el archivo existe
    const publicUrl = await SupabaseService.getPublicUrl(STORAGE_BUCKET, fileName);
    
    if (!publicUrl) {
      return null;
    }
    
    return publicUrl;
  } catch (error) {
    console.log('Error al obtener miniatura desde Storage:', error);
    return null;
  }
};

/**
 * Guarda una miniatura en Supabase
 * @deprecated Usar saveThumbnailToSupabaseStorage en su lugar
 */
export const saveThumbnailToSupabase = async (
  diapositivaId: string,
  thumbnailUrl: string
): Promise<boolean> => {
  console.warn('saveThumbnailToSupabase está obsoleto. Usar saveThumbnailToSupabaseStorage en su lugar.');
  return false;
};

/**
 * Obtiene una miniatura desde Supabase
 * @deprecated Usar getThumbnailFromSupabaseStorage en su lugar
 */
export const getThumbnailFromSupabase = async (diapositivaId: string): Promise<string | null> => {
  console.warn('getThumbnailFromSupabase está obsoleto. Usar getThumbnailFromSupabaseStorage en su lugar.');
  return null;
};

/**
 * Obtiene la URL de la miniatura, intentando primero desde la caché local,
 * luego desde Supabase Storage y finalmente usando la URL original
 */
export const getThumbnailUrl = async (
  presentationId: string,
  slideId: string
): Promise<string> => {
  // 1. Intentar obtener desde la caché local
  const thumbnailUrl = buildThumbnailUrl(presentationId, slideId);
  const cache = getThumbnailCache();
  
  if (cache[thumbnailUrl]?.dataUrl) {
    console.log(`Usando miniatura en caché para diapositiva ${slideId}`);
    return cache[thumbnailUrl].dataUrl;
  }
  
  // 2. Intentar obtener desde Supabase Storage
  const storageUrl = await getThumbnailFromSupabaseStorage(presentationId, slideId);
  if (storageUrl) {
    console.log(`Usando miniatura desde Supabase Storage para diapositiva ${slideId}`);
    
    try {
      // Convertir a dataURL y guardar en caché local para futuras consultas
      const dataUrl = await convertImageToDataUrl(storageUrl);
      await saveThumbnailCache(thumbnailUrl, dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('Error al convertir URL de Storage a dataURL:', error);
      // Si hay un error, devolver la URL directamente
      return storageUrl;
    }
  }
  
  // 3. Usar la URL original
  console.log(`Usando URL original para diapositiva ${slideId}`);
  return thumbnailUrl;
};

/**
 * Procesa las diapositivas para añadir URLs de miniaturas en caché
 */
export const processDiapositivasWithCachedThumbnails = (
  diapositivas: Array<{ id: string; urlImagen: string; [key: string]: any }>
): Array<{ id: string; urlImagen: string; urlImagenCached: string; [key: string]: any }> => {
  const cache = getThumbnailCache();
  
  return diapositivas.map(diapositiva => {
    const cachedThumbnail = cache[diapositiva.urlImagen];
    
    return {
      ...diapositiva,
      // Usar la versión en caché si está disponible
      urlImagenCached: cachedThumbnail?.dataUrl || diapositiva.urlImagen
    };
  });
};

/**
 * Construye la URL para solicitar una miniatura desde nuestra API
 */
export const buildThumbnailUrl = (presentationId: string, slideId: string): string => {
  return `${API_THUMBNAILS_ENDPOINT}?presentationId=${presentationId}&slideId=${slideId}`;
};

/**
 * Solicita una miniatura desde nuestra API
 */
export const fetchThumbnail = async (presentationId: string, slideId: string): Promise<string> => {
  // Primero verificamos si tenemos la imagen en caché
  const thumbnailUrl = buildThumbnailUrl(presentationId, slideId);
  const cache = getThumbnailCache();
  
  if (cache[thumbnailUrl]?.dataUrl) {
    console.log(`Usando miniatura en caché para diapositiva ${slideId}`);
    return cache[thumbnailUrl].dataUrl;
  }
  
  // Luego verificamos si está en Supabase Storage
  const storageUrl = await getThumbnailFromSupabaseStorage(presentationId, slideId);
  if (storageUrl) {
    console.log(`Usando miniatura desde Supabase Storage para diapositiva ${slideId}`);
    
    try {
      // Convertir a dataURL y guardar en caché local para futuras consultas
      const dataUrl = await convertImageToDataUrl(storageUrl);
      await saveThumbnailCache(thumbnailUrl, dataUrl);
      return dataUrl;
    } catch (error) {
      console.log('Error al convertir URL de Storage a dataURL, usando URL directa');
      
      // Si hay un error, intentar cargar la imagen directamente
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = storageUrl;
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        
        // Si la imagen se carga correctamente, devolver la URL
        return storageUrl;
      } catch (imgError) {
        console.log('Error al cargar imagen desde Storage, continuando con API');
        // Si hay un error, continuar con la API
      }
    }
  }
  
  // Si no está en caché ni en Storage, la solicitamos a la API
  try {
    console.log(`Solicitando miniatura desde API para diapositiva ${slideId}`);
    
    // Crear una promesa para convertir la imagen a dataURL una vez cargada
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Usar JPEG con calidad 0.7 para reducir tamaño
            resolve(dataUrl);
          } else {
            reject(new Error('No se pudo obtener el contexto del canvas'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error(`Error al cargar la imagen desde ${thumbnailUrl}`));
      };
      
      // Iniciar la carga de la imagen
      img.src = thumbnailUrl;
    });
    
    // Guardar en caché local
    await saveThumbnailCache(thumbnailUrl, dataUrl);
    
    // Variable para controlar si debemos intentar guardar en Supabase
    let shouldTrySupabase = true;
    
    // Verificar si ya hemos tenido errores con Supabase Storage
    try {
      const storageErrorFlag = localStorage.getItem('SUPABASE_STORAGE_ERROR');
      if (storageErrorFlag === 'true') {
        shouldTrySupabase = false;
        console.log('Omitiendo guardado en Supabase Storage debido a errores previos');
      }
    } catch (e) {
      // Ignorar errores de localStorage
    }
    
    // Guardar en Supabase Storage en segundo plano solo si no hay errores previos
    if (shouldTrySupabase) {
      saveThumbnailToSupabaseStorage(presentationId, slideId, dataUrl)
        .then(url => {
          if (url) {
            console.log(`Miniatura guardada en Supabase Storage: ${url}`);
          } else {
            // Marcar que hubo un error para futuras llamadas
            try {
              localStorage.setItem('SUPABASE_STORAGE_ERROR', 'true');
            } catch (e) {
              // Ignorar errores de localStorage
            }
          }
        })
        .catch(error => {
          console.log('Error al guardar en Supabase Storage, desactivando para futuras llamadas');
          // Marcar que hubo un error para futuras llamadas
          try {
            localStorage.setItem('SUPABASE_STORAGE_ERROR', 'true');
          } catch (e) {
            // Ignorar errores de localStorage
          }
        });
    }
    
    return dataUrl;
  } catch (error) {
    console.log('Error al solicitar miniatura, devolviendo URL original');
    return thumbnailUrl;
  }
};

/**
 * Precarga las miniaturas de todas las diapositivas
 */
export const preloadThumbnails = async (
  presentationId: string,
  slideIds: string[]
): Promise<void> => {
  // Si no hay IDs de diapositivas, no hacer nada
  if (!slideIds || slideIds.length === 0) {
    console.log('No hay diapositivas para precargar');
    return;
  }

  // Limitar el número de diapositivas a precargar para evitar sobrecarga
  const maxSlidesToPreload = 5;
  const slidesToPreload = slideIds.slice(0, maxSlidesToPreload);
  
  if (slideIds.length > maxSlidesToPreload) {
    console.log(`Limitando precarga a ${maxSlidesToPreload} de ${slideIds.length} diapositivas`);
  }
  
  console.log(`Precargando ${slidesToPreload.length} miniaturas para presentación ${presentationId}`);
  
  // Verificar si ya hemos tenido errores con Supabase Storage
  let hasStorageError = false;
  try {
    const storageErrorFlag = localStorage.getItem('SUPABASE_STORAGE_ERROR');
    if (storageErrorFlag === 'true') {
      hasStorageError = true;
      console.log('Detectados errores previos con Supabase Storage');
    }
  } catch (e) {
    // Ignorar errores de localStorage
  }
  
  // Usar Promise.allSettled para continuar incluso si algunas fallan
  const promises = slidesToPreload.map(async (slideId) => {
    try {
      // Verificar si ya está en caché antes de intentar cargarla
      const thumbnailUrl = buildThumbnailUrl(presentationId, slideId);
      const cache = getThumbnailCache();
      
      if (cache[thumbnailUrl]?.dataUrl) {
        console.log(`Usando miniatura en caché para diapositiva ${slideId}`);
        return { slideId, success: true, fromCache: true };
      }
      
      // Si hay errores de Storage y no está en caché, omitir la precarga
      if (hasStorageError) {
        console.log(`Omitiendo precarga para diapositiva ${slideId} debido a errores de Storage`);
        return { slideId, success: false, reason: 'storage_error' };
      }
      
      // Intentar obtener la miniatura
      await fetchThumbnail(presentationId, slideId);
      console.log(`Miniatura precargada para diapositiva ${slideId}`);
      return { slideId, success: true };
    } catch (error) {
      console.log(`Error al precargar miniatura para diapositiva ${slideId}`);
      return { slideId, success: false, error };
    }
  });
  
  const results = await Promise.allSettled(promises);
  
  // Contar resultados
  const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
  const fromCache = results.filter(r => r.status === 'fulfilled' && (r.value as any).fromCache).length;
  const failed = results.filter(r => r.status === 'rejected' || !(r.value as any).success).length;
  
  console.log(`Precarga de miniaturas completada: ${successful} exitosas (${fromCache} desde caché), ${failed} fallidas`);
}; 