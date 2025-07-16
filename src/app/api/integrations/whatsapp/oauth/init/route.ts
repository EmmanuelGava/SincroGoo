import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Configuración de OAuth para WhatsApp Business
    const clientId = process.env.WHATSAPP_APP_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/oauth/callback`;
    
    if (!clientId) {
      return NextResponse.json({
        error: 'WhatsApp App ID no configurado'
      }, { status: 500 });
    }

    // Generar estado único para seguridad
    const state = `${session.user.id}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Guardar estado en la sesión/base de datos para verificación posterior
    await supabase
      .from('oauth_states')
      .insert({
        state,
        user_id: session.user.id,
        provider: 'whatsapp',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutos
      });

    // URL de autorización de WhatsApp Business
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'whatsapp_business_management,whatsapp_business_messaging');
    authUrl.searchParams.set('response_type', 'code');

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString()
    });

  } catch (error) {
    console.error('Error iniciando OAuth de WhatsApp:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}