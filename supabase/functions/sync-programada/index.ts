/**
 * Edge Function: sync-programada
 * 
 * Ejecutada periódicamente por pg_cron.
 * Lee proyectos con sync_automatica=true cuya frecuencia se ha cumplido,
 * y ejecuta la sincronización Sheet → Slides para cada uno.
 * 
 * Configuración pg_cron (ejecutar en SQL Editor de Supabase):
 * 
 *   SELECT cron.schedule(
 *     'sync-programada-hourly',
 *     '0 * * * *',  -- cada hora
 *     $$
 *     SELECT net.http_post(
 *       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-programada',
 *       headers := jsonb_build_object(
 *         'Content-Type', 'application/json',
 *         'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
 *       ),
 *       body := '{}'::jsonb
 *     );
 *     $$
 *   );
 * 
 * Variables de entorno requeridas:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - KLOSYNC_BASE_URL (URL base de la app, ej: https://klosync.com)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
const BASE_URL = Deno.env.get('KLOSYNC_BASE_URL') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface ProyectoSync {
  id: string
  usuario_id: string
  slides_id: string
  sheets_id: string
  sync_frecuencia: string
  ultima_sync: string | null
  sync_notificacion: { email?: boolean; whatsapp?: boolean } | null
}

function shouldSync(frecuencia: string, ultimaSync: string | null): boolean {
  if (!ultimaSync) return true

  const ahora = Date.now()
  const ultima = new Date(ultimaSync).getTime()
  const diff = ahora - ultima

  switch (frecuencia) {
    case 'hora':
      return diff >= 60 * 60 * 1000
    case 'dia':
      return diff >= 24 * 60 * 60 * 1000
    case 'semana':
      return diff >= 7 * 24 * 60 * 60 * 1000
    default:
      return false
  }
}

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token || null
  } catch {
    return null
  }
}

async function ejecutarSync(proyecto: ProyectoSync, accessToken: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // TODO: Implementar la llamada real al proceso de sync.
    // Esto debería llamar a la misma lógica que plantilla/generate + plantilla/process
    // o al endpoint de sync manual existente.
    //
    // Por ahora registra el intento en generacion_jobs:
    const { error } = await supabase.from('generacion_jobs').insert({
      proyecto_id: proyecto.id,
      usuario_id: proyecto.usuario_id,
      estado: 'pendiente',
      spreadsheet_id: proyecto.sheets_id,
      presentation_id: proyecto.slides_id,
      total_filas: 0,
      filas_procesadas: 0,
      filas_error: 0,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    await supabase
      .from('proyectos')
      .update({ ultima_sync: new Date().toISOString() })
      .eq('id', proyecto.id)

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

Deno.serve(async (req) => {
  try {
    const { data: proyectos, error } = await supabase
      .from('proyectos')
      .select('id, usuario_id, slides_id, sheets_id, sync_frecuencia, ultima_sync, sync_notificacion')
      .eq('sync_automatica', true)
      .not('slides_id', 'is', null)
      .not('sheets_id', 'is', null)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    const candidatos = (proyectos || []).filter((p: ProyectoSync) =>
      shouldSync(p.sync_frecuencia, p.ultima_sync)
    )

    const resultados: { id: string; ok: boolean; error?: string }[] = []

    for (const proyecto of candidatos) {
      // Obtener refresh_token del usuario
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('google_refresh_token')
        .eq('id', proyecto.usuario_id)
        .single()

      if (!usuario?.google_refresh_token) {
        resultados.push({ id: proyecto.id, ok: false, error: 'Sin refresh_token' })
        continue
      }

      const accessToken = await refreshGoogleToken(usuario.google_refresh_token)
      if (!accessToken) {
        resultados.push({ id: proyecto.id, ok: false, error: 'No se pudo refrescar el token' })
        continue
      }

      const resultado = await ejecutarSync(proyecto, accessToken)
      resultados.push({ id: proyecto.id, ...resultado })
    }

    return new Response(
      JSON.stringify({
        total: proyectos?.length || 0,
        candidatos: candidatos.length,
        resultados,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Error desconocido' }),
      { status: 500 }
    )
  }
})
