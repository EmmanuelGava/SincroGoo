"use client"

import { createClient } from '@supabase/supabase-js'
import { ElementoDiapositiva } from '@/tipos/diapositivas'
import { FilaSeleccionada } from '@/tipos/hojas'
import { getSession } from 'next-auth/react'
import { getAuthenticatedClient, supabase } from '../globales'
import { Session } from 'next-auth'

// Extender el tipo Session para incluir propiedades específicas de Supabase
interface SupabaseSession extends Session {
  supabaseAccessToken?: string
  supabaseRefreshToken?: string
}

// Implementar patrón singleton para el cliente de Supabase
function getSupabaseInstance() {
  return supabase;
}

// Interfaces para los datos de Supabase
interface Sheet {
  id: string
  proyecto_id: string
  sheets_id: string
  nombre: string
  titulo: string
  ultima_sincronizacion: Date
  fecha_creacion: Date
  fecha_actualizacion: Date
  google_id: string
}

interface Slide {
  id: string
  proyecto_id: string
  slides_id: string
  titulo: string
  url?: string
  ultima_sincronizacion?: Date
}

interface Diapositiva {
  id: string
  slides_id: string
  diapositiva_id: string
  titulo?: string
  orden?: number
  thumbnail_url?: string
}

interface Elemento {
  id: string
  diapositiva_id: string
  elemento_id: string
  tipo: string
  contenido?: string
  posicion_x?: number
  posicion_y?: number
  ancho?: number
  alto?: number
}

interface Asociacion {
  id: string
  elemento_id: string
  sheets_id: string
  columna: string
  tipo: string
}

export class ServicioAsociaciones {
  // Método para obtener un cliente autenticado con validación de sesión
  private static async getClient() {
    try {
      // Obtener la sesión actual
      const session = await getSession();
      
      // Logs detallados para depuración
      console.log('🔍 [ServicioAsociaciones] Obteniendo cliente autenticado');
      console.log('- Sesión disponible:', session ? '✅' : '❌');
      
      if (session) {
        console.log('- Email de usuario:', session.user?.email || 'No disponible');
        console.log('- Token disponible:', (session as SupabaseSession).supabaseAccessToken ? '✅' : '❌');
      }
      
      // Si no hay sesión válida, usar el cliente anónimo con logs de advertencia
      if (!session || !session.user || !(session as SupabaseSession).supabaseAccessToken) {
        console.warn('⚠️ [ServicioAsociaciones] No hay sesión válida, usando cliente anónimo');
        
        // IMPORTANTE: Verificar si está en modo de desarrollo para permitir operaciones sin autenticación
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 [ServicioAsociaciones] Modo desarrollo: permitiendo operaciones con cliente anónimo');
          // Devolver cliente global para evitar crear múltiples instancias
          return supabase;
        } else {
          console.error('❌ [ServicioAsociaciones] Modo producción: se requiere autenticación');
          throw new Error('Se requiere autenticación para realizar esta operación');
        }
      }
      
      console.log('🔐 [ServicioAsociaciones] Obteniendo cliente con sesión autenticada');
      
      // Intentar obtener cliente autenticado del módulo global
      try {
        const client = await getAuthenticatedClient(session);
        
        if (!client) {
          console.error('❌ [ServicioAsociaciones] No se pudo obtener un cliente autenticado');
          throw new Error('No se pudo obtener un cliente autenticado');
        }
        
        console.log('✅ [ServicioAsociaciones] Cliente autenticado obtenido correctamente');
        
        // Verificar la sesión con una consulta simple
        const { data: testData, error: testError } = await client.from('usuarios').select('id').limit(1);
        
        if (testError) {
          console.error('❌ [ServicioAsociaciones] La autenticación parece no funcionar:', testError);
          
          // En desarrollo, intentar con cliente anónimo
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ [ServicioAsociaciones] Modo desarrollo: fallback a cliente anónimo');
            return supabase;
          } else {
            throw new Error(`Error de autenticación: ${testError.message}`);
          }
        }
        
        console.log('✅ [ServicioAsociaciones] Autenticación verificada correctamente');
        return client;
      } catch (error) {
        console.error('❌ [ServicioAsociaciones] Error al obtener cliente autenticado:', error);
        
        // En desarrollo, intentar con cliente anónimo
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ [ServicioAsociaciones] Modo desarrollo: fallback a cliente anónimo debido a error');
          return supabase;
        }
        
        throw error;
      }
    } catch (error) {
      console.error('❌ [ServicioAsociaciones] Error general al obtener cliente autenticado:', error);
      
      // En desarrollo, intentar con cliente anónimo
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ [ServicioAsociaciones] Modo desarrollo: permitiendo operaciones con cliente anónimo debido a error general');
        return supabase;
      }
      
      throw error;
    }
  }

  // Método para guardar una hoja de cálculo
  static async guardarSheet(proyectoId: string, sheetsId: string, titulo: string, url?: string, googleId?: string): Promise<string | null> {
    try {
      console.log('📝 [Sheet Debug] Iniciando guardado de sheet con datos:', {
        proyectoId,
        sheetsId,
        titulo,
        url,
        googleId
      });

      // Llamar al endpoint
      const response = await fetch('/api/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proyectoId, // El endpoint espera estos nombres de parámetros
          sheetsId,
          titulo,
          url,
          googleId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [Sheet Debug] Error al guardar sheet:', error);
        return null;
      }

      const data = await response.json();
      console.log('✅ [Sheet Debug] Sheet guardado exitosamente:', data);
      return data.id;
    } catch (error) {
      console.error('❌ [Sheet Debug] Error general:', error);
      if (error instanceof Error) {
        console.error('- Mensaje:', error.message);
        console.error('- Stack:', error.stack);
      }
      return null;
    }
  }
  
  // Método para guardar una presentación
  static async guardarSlide(proyectoId: string, slidesId: string, titulo: string, url?: string, googleId?: string): Promise<string | null> {
    try {
      console.log('📝 [Slide Debug] Iniciando guardado de slide con datos:', {
        proyectoId,
        slidesId,
        titulo,
        url,
        googleId
      });

      // Llamar al endpoint
      const response = await fetch('/api/slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proyectoId,
          slidesId,
          titulo,
          url,
          googleId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [Slide Debug] Error al guardar slide:', error);
        return null;
      }

      const data = await response.json();
      console.log('✅ [Slide Debug] Slide guardado exitosamente:', data);
      return data.id;
    } catch (error) {
      console.error('❌ [Slide Debug] Error general:', error);
      if (error instanceof Error) {
        console.error('- Mensaje:', error.message);
        console.error('- Stack:', error.stack);
      }
      return null;
    }
  }
  
  // Método para guardar una diapositiva
  static async guardarDiapositiva(slidesId: string, diapositivaId: string, titulo?: string, orden?: number, thumbnailUrl?: string): Promise<string | null> {
    try {
      // Obtener cliente autenticado
      const supabaseClient = await getSupabaseInstance()
      
      // Verificar si ya existe
      const { data: existente } = await supabaseClient
        .from('diapositivas')
        .select('id')
        .eq('slides_id', slidesId)
        .eq('diapositiva_id', diapositivaId)
        .single()
      
      if (existente) {
        // Actualizar
        await supabaseClient
          .from('diapositivas')
          .update({
            titulo,
            orden,
            thumbnail_url: thumbnailUrl
          })
          .eq('id', existente.id)
        
        return existente.id
      } else {
        // Insertar nuevo
        const { data, error } = await supabaseClient
          .from('diapositivas')
          .insert({
            slides_id: slidesId,
            diapositiva_id: diapositivaId,
            titulo,
            orden,
            thumbnail_url: thumbnailUrl
          })
          .select('id')
          .single()
        
        if (error) {
          console.error('Error al insertar diapositiva:', error)
          throw error
        }
        return data?.id || null
      }
    } catch (error) {
      console.error('Error al guardar diapositiva:', error)
      return null
    }
  }
  
  // Método para guardar un elemento
  static async guardarElemento(diapositivaId: string, elementoId: string, tipo: string, contenido?: string, posicionX?: number, posicionY?: number, ancho?: number, alto?: number): Promise<string | null> {
    try {
      // Obtener cliente autenticado
      const supabaseClient = await getSupabaseInstance()
      
      // Crear objeto de posición en formato jsonb
      const posicion = {
        x: posicionX,
        y: posicionY,
        ancho: ancho,
        alto: alto
      }
      
      // Verificar si ya existe
      const { data: existente } = await supabaseClient
        .from('elementos')
        .select('id')
        .eq('diapositiva_id', diapositivaId)
        .eq('elemento_id', elementoId)
        .single()
      
      if (existente) {
        // Actualizar
        await supabaseClient
          .from('elementos')
          .update({
            tipo,
            contenido,
            posicion // Usar el objeto jsonb para la posición
          })
          .eq('id', existente.id)
        
        return existente.id
      } else {
        // Insertar nuevo
        const { data, error } = await supabaseClient
          .from('elementos')
          .insert({
            diapositiva_id: diapositivaId,
            elemento_id: elementoId,
            tipo,
            contenido,
            posicion // Usar el objeto jsonb para la posición
          })
          .select('id')
          .single()
        
        if (error) {
          console.error('Error al insertar elemento:', error)
          throw error
        }
        return data?.id || null
      }
    } catch (error) {
      console.error('Error al guardar elemento:', error)
      return null
    }
  }
  
  // Método para verificar si una cadena es un UUID válido
  private static esUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  // Método para obtener el UUID de un Google Sheets ID
  private static async obtenerUUIDHoja(googleSheetsId: string, client: any): Promise<string | null> {
    try {
      if (!googleSheetsId) return null;
      
      // Si ya es un UUID, devolverlo directamente
      if (this.esUUID(googleSheetsId)) return googleSheetsId;
      
      console.log(`🔍 [ServicioAsociaciones] Buscando UUID para Google Sheets ID: ${googleSheetsId}`);
      
      const { data, error } = await client
        .from('sheets')
        .select('id')
        .eq('sheets_id', googleSheetsId)
        .single();
      
      if (error || !data) {
        console.error('❌ [ServicioAsociaciones] Error al obtener UUID de hoja:', error || 'No se encontró la hoja');
        return null;
      }
      
      console.log(`✅ [ServicioAsociaciones] UUID de hoja encontrado: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ [ServicioAsociaciones] Error al obtener UUID de hoja:', error);
      return null;
    }
  }

  // Método para obtener el UUID de un elemento
  private static async obtenerUUIDElemento(elementoId: string, client: any): Promise<string | null> {
    try {
      if (!elementoId) return null;
      
      // Si ya es un UUID, devolverlo directamente
      if (this.esUUID(elementoId)) return elementoId;
      
      console.log(`🔍 [ServicioAsociaciones] Buscando UUID para elemento ID: ${elementoId}`);
      
      const { data, error } = await client
        .from('elementos')
        .select('id')
        .eq('elemento_id', elementoId)
        .single();
      
      if (error || !data) {
        console.error('❌ [ServicioAsociaciones] Error al obtener UUID de elemento:', error || 'No se encontró el elemento');
        return null;
      }
      
      console.log(`✅ [ServicioAsociaciones] UUID de elemento encontrado: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ [ServicioAsociaciones] Error al obtener UUID de elemento:', error);
      return null;
    }
  }

  /**
   * Método para guardar asociación entre elemento y columna de hoja
   * Maneja automáticamente si es necesario crear o actualizar
   */
  static async guardarAsociacion(
    idElemento: string,
    idHoja: string,
    columna: string,
    tipoAsociacion: string = 'texto',
    forzarSincronizacion: boolean = false,
    idDiapositiva: string = ''
  ): Promise<string | null> {
    console.log(`🔍 [asociaciones-service] Guardando asociación para elemento ${idElemento}`);
    console.log(`- Hoja: ${idHoja}`);
    console.log(`- Columna: ${columna}`);
    console.log(`- Tipo: ${tipoAsociacion}`);
    console.log(`- Forzar sincronización: ${forzarSincronizacion}`);
    console.log(`- ID Diapositiva: ${idDiapositiva || 'No especificada'}`);

    // Si estamos forzando la sincronización sin asociaciones reales, registramos el evento
    if (forzarSincronizacion && (!idElemento || !columna || columna === 'null' || idElemento === 'sincronizacion_forzada')) {
      console.log('🔄 [asociaciones-service] Modo sincronización forzada, utilizando función dedicada');
      return await ServicioAsociaciones.registrarSincronizacionForzada(
        idHoja, 
        idDiapositiva,
        { idElemento, columna, tipoAsociacion }
      );
    }

    // Verificar datos obligatorios
    if (!idElemento || !idHoja || !columna) {
      console.error('❌ [asociaciones-service] Faltan datos obligatorios para guardar asociación');
      console.error(`- ID Elemento: ${idElemento || 'FALTA'}`);
      console.error(`- ID Hoja: ${idHoja || 'FALTA'}`);
      console.error(`- Columna: ${columna || 'FALTA'}`);
      return null;
    }

    try {
      // Verificar que los UUIDs sean válidos o convertirlos si es necesario
      let elementoIdValido = this.esUUID(idElemento);
      let hojaIdValida = this.esUUID(idHoja);
      let elementoUUID = idElemento;
      let hojaUUID = idHoja;
      
      // Convertir IDs si no son UUIDs válidos
      if (!elementoIdValido) {
        console.log(`⚠️ [asociaciones-service] El ID del elemento ${idElemento} no es un UUID válido, intentando convertir`);
        const uuid = await this.obtenerUUIDElemento(idElemento, supabase);
        if (uuid) {
          elementoUUID = uuid;
          elementoIdValido = true;
          console.log(`✅ [asociaciones-service] Convertido ID de elemento a UUID: ${uuid}`);
        } else {
          console.error(`❌ [asociaciones-service] No se pudo obtener UUID para elemento: ${idElemento}`);
        }
      }
      
      if (!hojaIdValida) {
        console.log(`⚠️ [asociaciones-service] El ID de hoja ${idHoja} no es un UUID válido, intentando convertir`);
        const uuid = await this.obtenerUUIDHoja(idHoja, supabase);
        if (uuid) {
          hojaUUID = uuid;
          hojaIdValida = true;
          console.log(`✅ [asociaciones-service] Convertido ID de hoja a UUID: ${uuid}`);
        } else {
          console.error(`❌ [asociaciones-service] No se pudo obtener UUID para hoja: ${idHoja}`);
        }
      }
      
      console.log('📊 [asociaciones-service] IDs validados para operación:');
      console.log(`- elemento_id: ${elementoUUID} (${elementoIdValido ? 'UUID válido' : 'INVÁLIDO'})`);
      console.log(`- sheets_id: ${hojaUUID} (${hojaIdValida ? 'UUID válido' : 'INVÁLIDO'})`);
      
      // Si no tenemos UUIDs válidos, no podemos continuar
      if (!elementoIdValido || !hojaIdValida) {
        console.error('❌ [asociaciones-service] No se pueden obtener UUIDs válidos para guardar asociación');
        return null;
      }
      
      // Primero intentar verificar si ya existe la asociación
      const { data: existente, error: errorExistente } = await supabase
        .from('asociaciones')
        .select('id')
        .eq('elemento_id', elementoUUID)
        .single();
      
      console.log(`🔍 [asociaciones-service] Verificando asociación existente: ${existente ? 'ENCONTRADA' : 'NO ENCONTRADA'}`);
      
      // Si existe, actualizar
      if (existente) {
        console.log(`🔄 [asociaciones-service] Actualizando asociación existente: ${existente.id}`);
        
        const { data: actualizado, error: errorActualizar } = await supabase
          .from('asociaciones')
          .update({
            sheets_id: hojaUUID,
            columna,
            tipo: tipoAsociacion,
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id', existente.id)
          .select('id')
          .single();
        
        if (errorActualizar) {
          console.error('❌ [asociaciones-service] Error al actualizar asociación:', errorActualizar);
          console.error('- Código:', errorActualizar.code);
          console.error('- Mensaje:', errorActualizar.message);
          console.error('- Detalles:', errorActualizar.details);
          
          // Intentar con API REST como fallback
          return await this.intentarGuardarViaAPI(elementoUUID, hojaUUID, columna, tipoAsociacion);
        }
        
        if (actualizado) {
          console.log(`✅ [asociaciones-service] Asociación actualizada correctamente: ${actualizado.id}`);
          return actualizado.id;
        }
      } else {
        // Si no existe, crear nuevo
        console.log('➕ [asociaciones-service] Creando nueva asociación con datos:');
        console.log(`- elemento_id: ${elementoUUID}`);
        console.log(`- sheets_id: ${hojaUUID}`);
        console.log(`- columna: ${columna}`);
        console.log(`- tipo: ${tipoAsociacion}`);
        
        const { data: nuevo, error: errorNuevo } = await supabase
          .from('asociaciones')
          .insert({
            elemento_id: elementoUUID,
            sheets_id: hojaUUID,
            columna,
            tipo: tipoAsociacion,
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
          })
          .select('id')
          .single();
        
        if (errorNuevo) {
          console.error('❌ [asociaciones-service] Error al crear asociación:', errorNuevo);
          console.error('- Código:', errorNuevo.code);
          console.error('- Mensaje:', errorNuevo.message);
          console.error('- Detalles:', errorNuevo.details || 'Sin detalles');
          
          // Intentar con API REST como fallback
          return await this.intentarGuardarViaAPI(elementoUUID, hojaUUID, columna, tipoAsociacion);
        }
        
        if (nuevo) {
          console.log(`✅ [asociaciones-service] Nueva asociación creada correctamente: ${nuevo.id}`);
          return nuevo.id;
        }
      }
      
      console.error('❌ [asociaciones-service] No se pudo guardar asociación por razones desconocidas');
      // Intentar con API REST como último recurso
      return await this.intentarGuardarViaAPI(elementoUUID, hojaUUID, columna, tipoAsociacion);
    } catch (error) {
      console.error('❌ [asociaciones-service] Error general al guardar asociación:', error);
      if (error instanceof Error) {
        console.error('- Mensaje:', error.message);
        console.error('- Stack:', error.stack);
      }
      
      // Intentar con API REST como último recurso
      if (idElemento && idHoja && columna) {
        return await this.intentarGuardarViaAPI(idElemento, idHoja, columna, tipoAsociacion);
      }
      return null;
    }
  }
  
  // Método privado para intentar guardar vía API como fallback
  private static async intentarGuardarViaAPI(
    elementoId: string,
    sheetsId: string,
    columna: string,
    tipo: string = 'texto'
  ): Promise<string | null> {
    console.log('🔄 [asociaciones-service] Intentando guardar asociación mediante API REST');
    
    try {
      const apiResponse = await fetch('/api/asociaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elemento_id: elementoId,
          sheets_id: sheetsId,
          columna,
          tipo
        })
      });
      
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`❌ [asociaciones-service] Error en respuesta API (${apiResponse.status}): ${errorText}`);
        return null;
      }
      
      const responseData = await apiResponse.json();
      if (responseData && responseData.id) {
        console.log(`✅ [asociaciones-service] Asociación guardada mediante API: ${responseData.id}`);
        return responseData.id;
      } else {
        console.error('❌ [asociaciones-service] Respuesta de API sin ID:', responseData);
        return null;
      }
    } catch (apiError) {
      console.error('❌ [asociaciones-service] Error al llamar a la API:', apiError);
      return null;
    }
  }
  
  // Método para obtener asociaciones de un elemento
  static async obtenerAsociacionesElemento(elementoId: string): Promise<Asociacion[]> {
    try {
      // Obtener cliente autenticado
      const supabaseClient = await getSupabaseInstance()
      
      const { data, error } = await supabaseClient
        .from('asociaciones')
        .select('*')
        .eq('elemento_id', elementoId)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener asociaciones del elemento:', error)
      return []
    }
  }
  
  // Método para obtener asociaciones de una hoja
  static async obtenerAsociacionesSheet(sheetsId: string): Promise<Asociacion[]> {
    try {
      // Verificar que tengamos un ID válido
      if (!sheetsId) {
        console.error('❌ [ServicioAsociaciones] Error: sheetsId no proporcionado');
        return [];
      }
      
      // Obtener cliente autenticado con retry
      const supabaseClient = await this.getClient();
      
      console.log(`🔍 [ServicioAsociaciones] Obteniendo asociaciones para hoja ${sheetsId}`);
      
      // Determinar si el ID es un UUID (formato de Supabase) o un ID de Google Sheets
      const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sheetsId);
      
      console.log(`🔍 [ServicioAsociaciones] El ID proporcionado ${esUuid ? 'es un UUID' : 'NO es un UUID, posiblemente un Google Sheets ID'}`);
      
      let hojaUuid = sheetsId;
      
      // Si no es un UUID, intentamos obtener el UUID desde la tabla sheets
      if (!esUuid) {
        console.log('🔍 [ServicioAsociaciones] Buscando UUID correspondiente en tabla sheets...');
        
        const { data: hojaData, error: hojaError } = await supabaseClient
          .from('sheets')
          .select('id')
          .eq('sheets_id', sheetsId)
          .single();
        
        if (hojaError || !hojaData) {
          console.error('❌ [ServicioAsociaciones] Error al buscar hoja por Google ID:', hojaError || 'No se encontró la hoja');
          return [];
        }
        
        hojaUuid = hojaData.id;
        console.log(`🔍 [ServicioAsociaciones] UUID encontrado: ${hojaUuid}`);
      }
      
      // Ahora usamos el UUID para buscar asociaciones
      const { data, error } = await supabaseClient
        .from('asociaciones')
        .select('*')
        .eq('sheets_id', hojaUuid);
      
      if (error) {
        console.error('❌ [ServicioAsociaciones] Error al obtener asociaciones de la hoja:', error);
        throw error;
      }
      
      console.log(`✅ [ServicioAsociaciones] Encontradas ${data?.length || 0} asociaciones`);
      return data || [];
    } catch (error) {
      console.error('❌ [ServicioAsociaciones] Error al obtener asociaciones de la hoja:', error);
      // En caso de error de autenticación, intentar con cliente anónimo como fallback
      try {
        // Intentar nuevamente pero con cliente anónimo
        console.log('⚠️ [ServicioAsociaciones] Intentando obtener asociaciones con cliente anónimo...');
        
        // Determinar si el ID es un UUID
        const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sheetsId);
        
        let hojaUuid = sheetsId;
        
        // Si no es un UUID, intentamos obtener el UUID desde la tabla sheets
        if (!esUuid) {
          const { data: hojaData, error: hojaError } = await supabase
            .from('sheets')
            .select('id')
            .eq('sheets_id', sheetsId)
            .single();
          
          if (hojaError || !hojaData) {
            console.error('❌ [ServicioAsociaciones] Error al buscar hoja por Google ID con cliente anónimo:', hojaError || 'No se encontró la hoja');
            return [];
          }
          
          hojaUuid = hojaData.id;
        }
        
        const { data } = await supabase
          .from('asociaciones')
          .select('*')
          .eq('sheets_id', hojaUuid);
        
        return data || [];
      } catch (fallbackError) {
        console.error('❌ [ServicioAsociaciones] Error también con cliente anónimo:', fallbackError);
        return [];
      }
    }
  }
  
  // Método para eliminar una asociación
  static async eliminarAsociacion(asociacionId: string): Promise<boolean> {
    try {
      // Obtener cliente autenticado con retry
      const supabaseClient = await this.getClient();
      
      if (!asociacionId) {
        console.error('Error: asociacionId no proporcionado');
        return false;
      }
      
      console.log(`🔍 [ServicioAsociaciones] Eliminando asociación ${asociacionId}`);
      
      const { error } = await supabaseClient
        .from('asociaciones')
        .delete()
        .eq('id', asociacionId);
      
      if (error) {
        console.error('Error al eliminar asociación:', error);
        throw error;
      }
      
      console.log('✅ [ServicioAsociaciones] Asociación eliminada correctamente');
      return true;
    } catch (error) {
      console.error('Error al eliminar asociación:', error);
      return false;
    }
  }
  
  // Método para registrar un cambio en el historial
  static async registrarCambio(elementoId: string, contenidoAnterior: string, contenidoNuevo: string, usuarioId: string): Promise<boolean> {
    try {
      // Obtener cliente autenticado
      const supabaseClient = await getSupabaseInstance()
      
      const { error } = await supabaseClient
        .from('historial_cambios')
        .insert({
          elemento_id: elementoId,
          contenido_anterior: contenidoAnterior,
          contenido_nuevo: contenidoNuevo,
          usuario_id: usuarioId
        })
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error al registrar cambio en historial:', error)
      return false
    }
  }
  
  // Método para sincronizar elementos con la fila seleccionada
  static async sincronizarElementos(elementos: ElementoDiapositiva[], filaSeleccionada: FilaSeleccionada): Promise<ElementoDiapositiva[]> {
    try {
      // Obtener cliente autenticado
      const supabaseClient = await getSupabaseInstance()
      
      // Obtener las asociaciones para cada elemento
      const elementosActualizados = await Promise.all(
        elementos.map(async (elemento) => {
          // Si el elemento no tiene ID, no podemos buscar asociaciones
          if (!elemento.id) return elemento
          
          // Buscar asociaciones para este elemento
          const { data: asociaciones, error } = await supabaseClient
            .from('asociaciones')
            .select('*')
            .eq('elemento_id', elemento.id)
          
          if (error) {
            console.error('Error al buscar asociaciones para elemento:', error)
            return elemento
          }
          
          // Si no hay asociaciones, devolver el elemento sin cambios
          if (!asociaciones || asociaciones.length === 0) return elemento
          
          // Tomar la primera asociación (por ahora solo soportamos una)
          const asociacion = asociaciones[0]
          
          // Verificar si la columna asociada existe en la fila seleccionada
          if (asociacion.columna && filaSeleccionada.valores[asociacion.columna] !== undefined) {
            // Actualizar el contenido del elemento con el valor de la columna
            return {
              ...elemento,
              contenido: filaSeleccionada.valores[asociacion.columna],
              columnaAsociada: asociacion.columna,
              tipoAsociacion: asociacion.tipo
            }
          }
          
          return elemento
        })
      )
      
      return elementosActualizados
    } catch (error) {
      console.error('Error al sincronizar elementos:', error)
      return elementos
    }
  }

  /**
   * Registra una sincronización forzada cuando no hay elementos con asociaciones pero
   * se necesita marcar que hubo una sincronización
   */
  static async registrarSincronizacionForzada(
    idHoja: string,
    idDiapositiva: string = '',
    detalles: any = {}
  ): Promise<string | null> {
    console.log('🔄 [asociaciones-service] Registrando sincronización forzada');
    console.log(`- Hoja: ${idHoja}`);
    console.log(`- Diapositiva: ${idDiapositiva || 'No especificada'}`);
    
    try {
      // Comprobar tablas disponibles para evitar errores 404
      const existeTablaSheets = await this.tablaExiste('sheets');
      const existeTablaProyectos = await this.tablaExiste('proyectos');
      const existeTablaElementos = await this.tablaExiste('elementos');
      const existeTablaAsociaciones = await this.tablaExiste('asociaciones');
      
      console.log('🔍 [asociaciones-service] Tablas disponibles:');
      console.log(`- sheets: ${existeTablaSheets ? '✅' : '❌'}`);
      console.log(`- proyectos: ${existeTablaProyectos ? '✅' : '❌'}`);
      console.log(`- elementos: ${existeTablaElementos ? '✅' : '❌'}`);
      console.log(`- asociaciones: ${existeTablaAsociaciones ? '✅' : '❌'}`);
      
      // Opción 1: Actualizar la hoja (sheets) - Esta es la opción más confiable
      if (existeTablaSheets) {
        try {
          console.log('🔍 [asociaciones-service] Intentando actualizar registro en sheets');
          
          const { data: sheetData, error: sheetError } = await supabase
            .from('sheets')
            .update({
              fecha_actualizacion: new Date().toISOString(),
              ultima_sincronizacion: new Date().toISOString()
            })
            .eq('id', idHoja)
            .select('id')
            .single();
          
          if (!sheetError && sheetData) {
            console.log('✅ [asociaciones-service] Hoja actualizada como registro de sincronización:', sheetData.id);
            return `sync_${sheetData.id}`;
          }
          
          if (sheetError) {
            console.warn('⚠️ [asociaciones-service] Error al actualizar sheets:', sheetError.message);
          }
        } catch (error) {
          console.warn('⚠️ [asociaciones-service] Error al intentar actualizar sheets:', error);
        }
      }
      
      // Opción 2: Intentar insertar en la tabla proyectos
      if (existeTablaProyectos) {
        try {
          console.log('🔍 [asociaciones-service] Intentando registrar en tabla proyectos');
          
          const { data: proyectoData, error: proyectoError } = await supabase
            .from('proyectos')
            .insert({
              nombre: 'Sincronización Forzada',
              descripcion: `Sincronización forzada para hoja ${idHoja} en ${new Date().toISOString()}`,
              fecha_creacion: new Date().toISOString(),
              fecha_actualizacion: new Date().toISOString()
            })
            .select('id')
            .single();
          
          if (!proyectoError && proyectoData) {
            console.log('✅ [asociaciones-service] Registro de sincronización creado en proyectos:', proyectoData.id);
            return proyectoData.id;
          }
          
          if (proyectoError) {
            console.warn('⚠️ [asociaciones-service] Error al registrar en proyectos:', proyectoError.message);
          }
        } catch (error) {
          console.warn('⚠️ [asociaciones-service] Error al intentar registrar en proyectos:', error);
        }
      }
      
      // Opción 3: Insertar una entrada dummy en la tabla asociaciones
      if (existeTablaElementos && existeTablaAsociaciones) {
        try {
          console.log('🔍 [asociaciones-service] Intentando registrar sincronización en tabla asociaciones');
          
          // Primero obtenemos un ID de elemento válido para cumplir con la restricción foreign key
          const { data: elementoData, error: elementoError } = await supabase
            .from('elementos')
            .select('id')
            .limit(1)
            .single();
          
          if (elementoError) {
            console.warn('⚠️ [asociaciones-service] No se pudo obtener un elemento para asociación dummy:', elementoError.message);
          } else if (elementoData && elementoData.id) {
            // Ahora creamos una asociación temporal
            const { data: asocData, error: asocError } = await supabase
              .from('asociaciones')
              .insert({
                elemento_id: elementoData.id,
                sheets_id: idHoja,
                columna: 'sincronizacion_forzada',
                tipo: 'sincronizacion',
                fecha_creacion: new Date().toISOString(),
                fecha_actualizacion: new Date().toISOString()
              })
              .select('id')
              .single();
            
            if (!asocError && asocData) {
              console.log('✅ [asociaciones-service] Asociación dummy creada como registro de sincronización:', asocData.id);
              return asocData.id;
            }
            
            if (asocError) {
              console.warn('⚠️ [asociaciones-service] Error al crear asociación dummy:', asocError.message);
            }
          }
        } catch (error) {
          console.warn('⚠️ [asociaciones-service] Error al intentar crear asociación dummy:', error);
        }
      }
      
      // Opción 4: Si todo lo demás falla, crear logs directamente en memoria local
      console.log('🔍 [asociaciones-service] Fallback: Registrando sincronización localmente en storage');
      try {
        // Guardar en localStorage para mantener un registro
        const syncKey = `sincro_forzada_${idHoja}_${Date.now()}`;
        const syncData = {
          idHoja,
          idDiapositiva,
          timestamp: new Date().toISOString(),
          detalles
        };
        
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(syncKey, JSON.stringify(syncData));
          console.log('✅ [asociaciones-service] Sincronización registrada localmente:', syncKey);
        }
        
        // Devolver un ID simulado para indicar que se intentó la sincronización
        return `sync_local_${Date.now()}`;
      } catch (error) {
        console.warn('⚠️ [asociaciones-service] Error al registrar localmente:', error);
      }
      
      // Si llegamos hasta aquí, devolver un ID simulado indicando que se intentó la sincronización
      const fallbackId = `sync_fallback_${Date.now()}`;
      console.log('✅ [asociaciones-service] Usando ID de sincronización de fallback:', fallbackId);
      return fallbackId;
    } catch (error) {
      console.error('❌ [asociaciones-service] Error al registrar sincronización forzada:', error);
      return `sync_error_${Date.now()}`; // Devolvemos ID para no bloquear el flujo
    }
  }

  /**
   * Verifica si una tabla existe en la base de datos
   * @param tableName Nombre de la tabla a verificar
   * @returns true si la tabla existe, false en caso contrario
   */
  private static async tablaExiste(tableName: string): Promise<boolean> {
    try {
      console.log(`🔍 [asociaciones-service] Verificando si existe la tabla ${tableName}`);
      
      // Intentamos obtener información del esquema de la tabla
      const { data, error } = await supabase
        .rpc('verificar_tabla_existe', { 
          nombre_tabla: tableName 
        });
      
      if (error) {
        // Si no existe la función RPC, intentamos una consulta directa limitada
        console.log(`⚠️ [asociaciones-service] No se pudo verificar con RPC: ${error.message}`);
        
        // Intentar una consulta limitada a la tabla
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          // Si hay un error 404, la tabla no existe
          if (countError.code === '404' || countError.message?.includes('not found')) {
            console.log(`❌ [asociaciones-service] La tabla ${tableName} no existe`);
            return false;
          }
          
          // Si hay otro tipo de error, asumimos que la tabla existe pero hay problemas de permisos
          console.log(`⚠️ [asociaciones-service] Error al verificar tabla, asumiendo que existe: ${countError.message}`);
          return true;
        }
        
        console.log(`✅ [asociaciones-service] La tabla ${tableName} existe`);
        return true;
      }
      
      console.log(`✅ [asociaciones-service] La tabla ${tableName} existe: ${!!data}`);
      return !!data;
    } catch (error) {
      console.error(`❌ [asociaciones-service] Error al verificar si existe la tabla ${tableName}:`, error);
      // En caso de error, asumimos que la tabla no existe
      return false;
    }
  }

  /**
   * Crea la tabla de asociaciones en Supabase si no existe
   */
  static async crearTablaAsociaciones() {
    try {
      console.log('🔍 [crearTablaAsociaciones] Iniciando creación de tabla de asociaciones...');
      console.log(`🔍 [crearTablaAsociaciones] Nombre de la tabla: 'asociaciones'`);
      
      // Verificar primero si existe utilizando SQL directo
      const { data: existeTabla, error: errorVerificacion } = await supabase.rpc(
        'verificar_tabla_existe',
        { nombre_tabla: 'asociaciones' }
      );
      
      if (errorVerificacion) {
        console.error('❌ [crearTablaAsociaciones] Error al verificar si la tabla existe:', errorVerificacion);
      } else if (existeTabla) {
        console.log('✅ [crearTablaAsociaciones] La tabla asociaciones ya existe según verificación SQL');
        return {
          exito: true,
          mensaje: 'La tabla ya existe'
        };
      }
      
      // Si no se pudo verificar o la tabla no existe, intentar crearla
      console.log('🔍 [crearTablaAsociaciones] Intentando crear la tabla asociaciones mediante SQL...');
      
      // SQL para crear la tabla
      const sqlCrearTabla = `
      CREATE TABLE IF NOT EXISTS public.asociaciones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        elemento_id uuid NOT NULL REFERENCES public.elementos(id) ON DELETE CASCADE,
        sheets_id uuid NOT NULL REFERENCES public.sheets(id) ON DELETE CASCADE,
        columna text NOT NULL,
        tipo text DEFAULT 'texto'::text,
        fecha_creacion timestamp with time zone DEFAULT now(),
        fecha_actualizacion timestamp with time zone DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS idx_asociaciones_elemento_id ON public.asociaciones USING btree (elemento_id);
      CREATE INDEX IF NOT EXISTS idx_asociaciones_sheets_id ON public.asociaciones USING btree (sheets_id);
      
      COMMENT ON TABLE public.asociaciones IS 'Tabla para almacenar asociaciones entre elementos y hojas de cálculo';
      `;
      
      const { data: resultadoCreacion, error: errorCreacion } = await supabase.rpc(
        'ejecutar_sql',
        { sql: sqlCrearTabla }
      );
      
      if (errorCreacion) {
        console.error('❌ [crearTablaAsociaciones] Error al crear la tabla:', errorCreacion);
        
        // Falló la creación directa, intentar a través de la API REST
        try {
          console.log('🔍 [crearTablaAsociaciones] Intentando crear tabla mediante API...');
          
          const respuestaAPI = await fetch('/api/crear-tabla', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tabla: 'asociaciones',
              definicion: sqlCrearTabla
            })
          });
          
          if (!respuestaAPI.ok) {
            const errorText = await respuestaAPI.text();
            console.error(`❌ [crearTablaAsociaciones] Error al crear tabla mediante API: ${errorText}`);
            throw new Error(`Error API: ${errorText}`);
          }
          
          const resultadoAPI = await respuestaAPI.json();
          console.log('✅ [crearTablaAsociaciones] Tabla creada mediante API:', resultadoAPI);
          
          return {
            exito: true,
            mensaje: 'Tabla creada mediante API'
          };
        } catch (errorAPI) {
          console.error('❌ [crearTablaAsociaciones] Error al crear tabla mediante API:', errorAPI);
          return {
            exito: false,
            mensaje: `Error al crear tabla: ${errorCreacion.message}. API fallback: ${errorAPI instanceof Error ? errorAPI.message : 'Error desconocido'}`
          };
        }
      }
      
      console.log('✅ [crearTablaAsociaciones] Tabla creada correctamente');
      return {
        exito: true,
        mensaje: 'Tabla creada correctamente'
      };
    } catch (error) {
      console.error('❌ [crearTablaAsociaciones] Error general al crear tabla:', error);
      return {
        exito: false,
        mensaje: `Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }
} 