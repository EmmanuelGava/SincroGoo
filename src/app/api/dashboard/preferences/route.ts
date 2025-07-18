// API para gestión de preferencias del dashboard
// Fecha: 2025-01-17

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// GET - Obtener preferencias del usuario
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('dashboard_preferences')
      .select('*')
      .eq('usuario_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No se encontraron preferencias
        return NextResponse.json(
          { error: 'Preferencias no encontradas' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard preferences:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Crear o actualizar preferencias
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validar datos requeridos
    const preferencesData = {
      usuario_id: session.user.id,
      layout_type: body.layout_type || 'expanded',
      visible_sections: body.visible_sections || ['metrics', 'conversations', 'tasks', 'notifications'],
      refresh_interval: body.refresh_interval || 30,
      notification_settings: body.notification_settings || {
        browser_notifications: true,
        sound_alerts: true,
        priority_only: false,
        quiet_hours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      },
      focus_mode: body.focus_mode || false,
      custom_objectives: body.custom_objectives || {
        response_time_target: 120,
        daily_conversations_target: 50,
        conversion_rate_target: 15
      },
      theme_preferences: body.theme_preferences || {
        color_scheme: 'light',
        compact_view: false,
        show_animations: true
      },
      updated_at: new Date().toISOString()
    };

    // Intentar actualizar primero
    const { data: updateData, error: updateError } = await supabase
      .from('dashboard_preferences')
      .update(preferencesData)
      .eq('usuario_id', session.user.id)
      .select()
      .single();

    if (updateError && updateError.code === 'PGRST116') {
      // No existe, crear nuevo registro
      const { data: insertData, error: insertError } = await supabase
        .from('dashboard_preferences')
        .insert({
          ...preferencesData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return NextResponse.json(insertData, { status: 201 });
    } else if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updateData);
  } catch (error) {
    console.error('Error saving dashboard preferences:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Restablecer preferencias (eliminar registro)
// =====================================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('dashboard_preferences')
      .delete()
      .eq('usuario_id', session.user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard preferences:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}