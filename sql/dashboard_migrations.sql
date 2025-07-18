-- Dashboard Migrations - Estructura base para el dashboard mejorado
-- Fecha: 2025-01-16

-- =====================================================
-- Tabla: dashboard_preferences
-- Propósito: Almacenar preferencias personalizadas del dashboard por usuario
-- =====================================================

CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  layout_type VARCHAR(20) DEFAULT 'expanded' CHECK (layout_type IN ('compact', 'expanded', 'custom')),
  visible_sections JSONB DEFAULT '["metrics", "conversations", "tasks", "notifications"]'::jsonb,
  refresh_interval INTEGER DEFAULT 30 CHECK (refresh_interval >= 10 AND refresh_interval <= 300),
  notification_settings JSONB DEFAULT '{
    "browser_notifications": true,
    "sound_alerts": true,
    "priority_only": false,
    "quiet_hours": {
      "enabled": false,
      "start": "22:00",
      "end": "08:00"
    }
  }'::jsonb,
  focus_mode BOOLEAN DEFAULT false,
  custom_objectives JSONB DEFAULT '{
    "response_time_target": 120,
    "daily_conversations_target": 50,
    "conversion_rate_target": 15
  }'::jsonb,
  theme_preferences JSONB DEFAULT '{
    "color_scheme": "light",
    "compact_view": false,
    "show_animations": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para asegurar un solo registro por usuario
  CONSTRAINT unique_user_preferences UNIQUE (usuario_id)
);

-- Índices para dashboard_preferences
CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_usuario_id 
ON public.dashboard_preferences(usuario_id);

-- RLS para dashboard_preferences
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios solo pueden acceder a sus propias preferencias
CREATE POLICY "Users can manage their own dashboard preferences" 
ON public.dashboard_preferences
FOR ALL 
USING (usuario_id = (SELECT id FROM usuarios WHERE auth_id = auth.jwt() ->> 'sub'));

-- =====================================================
-- Tabla: tasks
-- Propósito: Sistema de tareas y seguimientos para leads
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversaciones(id) ON DELETE SET NULL,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
    'follow_up', 
    'first_response', 
    'scheduled_contact', 
    'lead_qualification',
    'proposal_followup',
    'meeting_reminder',
    'custom'
  )),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'snoozed')),
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB DEFAULT NULL, -- Estructura: {"frequency": "daily|weekly|monthly", "interval": 1, "end_date": "2024-12-31"}
  completed_at TIMESTAMP WITH TIME ZONE,
  snoozed_until TIMESTAMP WITH TIME ZONE,
  auto_generated BOOLEAN DEFAULT false, -- Para tareas creadas automáticamente por el sistema
  metadata JSONB DEFAULT '{}'::jsonb, -- Información adicional específica del tipo de tarea
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tasks
CREATE INDEX IF NOT EXISTS idx_tasks_usuario_id ON public.tasks(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON public.tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_conversation_id ON public.tasks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_type_status ON public.tasks(task_type, status);

-- RLS para tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios solo pueden acceder a sus propias tareas
CREATE POLICY "Users can manage their own tasks" 
ON public.tasks
FOR ALL 
USING (usuario_id = (SELECT id FROM usuarios WHERE auth_id = auth.jwt() ->> 'sub'));

-- =====================================================
-- Tabla: dashboard_metrics_cache
-- Propósito: Cache inteligente para métricas del dashboard
-- =====================================================

CREATE TABLE IF NOT EXISTS public.dashboard_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
    'overview_metrics',
    'platform_breakdown', 
    'conversation_metrics',
    'response_time_metrics',
    'conversion_metrics',
    'time_series_data'
  )),
  time_range VARCHAR(20) NOT NULL CHECK (time_range IN (
    'today', 
    'yesterday', 
    'last_7_days', 
    'last_30_days', 
    'this_month', 
    'last_month',
    'custom'
  )),
  filters JSONB DEFAULT '{}'::jsonb, -- Filtros aplicados (plataforma, estado, etc.)
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para dashboard_metrics_cache
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_cache_lookup 
ON public.dashboard_metrics_cache(usuario_id, metric_type, time_range, expires_at);

CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_cache_expiry 
ON public.dashboard_metrics_cache(expires_at);

-- RLS para dashboard_metrics_cache
ALTER TABLE public.dashboard_metrics_cache ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios solo pueden acceder a su propio cache
CREATE POLICY "Users can access their own metrics cache" 
ON public.dashboard_metrics_cache
FOR ALL 
USING (usuario_id = (SELECT id FROM usuarios WHERE auth_id = auth.jwt() ->> 'sub'));

-- =====================================================
-- Funciones auxiliares
-- =====================================================

-- Función para limpiar cache expirado
CREATE OR REPLACE FUNCTION clean_expired_dashboard_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM dashboard_metrics_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar fecha de modificación
CREATE OR REPLACE FUNCTION update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_dashboard_preferences_updated_at
  BEFORE UPDATE ON dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_updated_at();

-- =====================================================
-- Datos iniciales
-- =====================================================

-- Función para crear preferencias por defecto para nuevos usuarios
CREATE OR REPLACE FUNCTION create_default_dashboard_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO dashboard_preferences (usuario_id)
  VALUES (NEW.id)
  ON CONFLICT (usuario_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear preferencias automáticamente para nuevos usuarios
CREATE TRIGGER create_default_dashboard_preferences_trigger
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION create_default_dashboard_preferences();

-- =====================================================
-- Comentarios para documentación
-- =====================================================

COMMENT ON TABLE dashboard_preferences IS 'Preferencias personalizadas del dashboard por usuario';
COMMENT ON TABLE tasks IS 'Sistema de tareas y seguimientos para gestión de leads';
COMMENT ON TABLE dashboard_metrics_cache IS 'Cache inteligente para optimizar consultas de métricas del dashboard';

COMMENT ON COLUMN dashboard_preferences.layout_type IS 'Tipo de layout: compact, expanded, custom';
COMMENT ON COLUMN dashboard_preferences.visible_sections IS 'Array de secciones visibles en el dashboard';
COMMENT ON COLUMN dashboard_preferences.refresh_interval IS 'Intervalo de actualización en segundos (10-300)';
COMMENT ON COLUMN dashboard_preferences.focus_mode IS 'Modo concentración para pausar notificaciones visuales';

COMMENT ON COLUMN tasks.task_type IS 'Tipo de tarea: follow_up, first_response, scheduled_contact, etc.';
COMMENT ON COLUMN tasks.auto_generated IS 'Indica si la tarea fue creada automáticamente por el sistema';
COMMENT ON COLUMN tasks.recurring_pattern IS 'Patrón de recurrencia en formato JSON';
COMMENT ON COLUMN tasks.snoozed_until IS 'Fecha hasta la cual la tarea está pospuesta';