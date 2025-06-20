-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS update_leads_fecha_actualizacion ON leads;
DROP TRIGGER IF EXISTS update_estados_lead_fecha_actualizacion ON estados_lead;
DROP TRIGGER IF EXISTS update_interacciones_fecha_actualizacion ON interacciones;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Estados de lead visibles para todos los usuarios autenticados" ON estados_lead;
DROP POLICY IF EXISTS "Solo administradores pueden crear estados de lead" ON estados_lead;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar estados de lead" ON estados_lead;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar estados de lead" ON estados_lead;

DROP POLICY IF EXISTS "Leads visibles para usuarios autenticados" ON leads;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear leads" ON leads;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar sus leads asignados" ON leads;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar leads" ON leads;

DROP POLICY IF EXISTS "Interacciones visibles para usuarios autenticados" ON interacciones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear interacciones" ON interacciones;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus interacciones" ON interacciones;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar interacciones" ON interacciones;

-- Eliminar índices existentes
DROP INDEX IF EXISTS idx_leads_estado_id;
DROP INDEX IF EXISTS idx_leads_asignado_a;
DROP INDEX IF EXISTS idx_leads_fecha_creacion;
DROP INDEX IF EXISTS idx_leads_ultima_interaccion;
DROP INDEX IF EXISTS idx_estados_lead_orden;
DROP INDEX IF EXISTS idx_interacciones_lead_id;
DROP INDEX IF EXISTS idx_interacciones_fecha;

-- Eliminar tablas existentes (en orden correcto por las referencias)
DROP TABLE IF EXISTS interacciones CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS estados_lead CASCADE;

-- Eliminar funciones trigger
DROP FUNCTION IF EXISTS update_lead_ultima_interaccion() CASCADE;
DROP FUNCTION IF EXISTS update_fecha_actualizacion() CASCADE;

-- Crear tabla de estados de lead
CREATE TABLE estados_lead (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    color TEXT,
    orden INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, nombre)
);

-- Función para obtener el estado por defecto de un usuario
CREATE OR REPLACE FUNCTION get_default_estado_id(p_usuario_id UUID)
RETURNS UUID AS $$
DECLARE
    default_id UUID;
BEGIN
    SELECT id INTO default_id 
    FROM estados_lead 
    WHERE usuario_id = p_usuario_id 
    ORDER BY orden ASC 
    LIMIT 1;
    
    RETURN default_id;
END;
$$ LANGUAGE plpgsql;

-- Crear tabla de leads
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    empresa TEXT DEFAULT '',
    cargo TEXT DEFAULT '',
    estado_id UUID NOT NULL REFERENCES estados_lead(id) ON DELETE RESTRICT,
    probabilidad_cierre INTEGER DEFAULT 0 CHECK (probabilidad_cierre BETWEEN 0 AND 100),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    valor_potencial NUMERIC DEFAULT 0,
    origen TEXT DEFAULT 'Manual',
    notas TEXT DEFAULT '',
    ultima_interaccion TIMESTAMPTZ DEFAULT NOW(),
    asignado_a UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT leads_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
    CONSTRAINT leads_telefono_check CHECK (telefono ~ '^\+?[0-9\s-]{6,}$' OR telefono IS NULL)
);

-- Crear tabla de interacciones
CREATE TABLE interacciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'nota',
    descripcion TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resultado TEXT DEFAULT 'pendiente',
    siguiente_accion TEXT DEFAULT '',
    fecha_siguiente_accion TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
    creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_leads_estado_id ON leads(estado_id);
CREATE INDEX idx_leads_asignado_a ON leads(asignado_a);
CREATE INDEX idx_leads_fecha_creacion ON leads(fecha_creacion);
CREATE INDEX idx_leads_ultima_interaccion ON leads(ultima_interaccion);
CREATE INDEX idx_estados_lead_orden ON estados_lead(orden);
CREATE INDEX idx_interacciones_lead_id ON interacciones(lead_id);
CREATE INDEX idx_interacciones_fecha ON interacciones(fecha);

-- Crear función para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION update_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear función para actualizar ultima_interaccion del lead
CREATE OR REPLACE FUNCTION update_lead_ultima_interaccion()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads 
    SET ultima_interaccion = NEW.fecha
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualizar fecha_actualizacion
CREATE TRIGGER update_leads_fecha_actualizacion
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_actualizacion();

CREATE TRIGGER update_estados_lead_fecha_actualizacion
    BEFORE UPDATE ON estados_lead
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_actualizacion();

CREATE TRIGGER update_interacciones_fecha_actualizacion
    BEFORE UPDATE ON interacciones
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_actualizacion();

-- Crear trigger para actualizar ultima_interaccion del lead
CREATE TRIGGER update_lead_ultima_interaccion
    AFTER INSERT OR UPDATE ON interacciones
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_ultima_interaccion();

-- Crear función para asignar estados de lead por defecto a un nuevo usuario
CREATE OR REPLACE FUNCTION public.asignar_estados_lead_por_defecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insertar estados por defecto para el nuevo usuario
  INSERT INTO public.estados_lead (usuario_id, nombre, color, orden, is_default)
  VALUES
    (NEW.id, 'Nuevo', '#4CAF50', 1, true),
    (NEW.id, 'Contactado', '#2196F3', 2, true),
    (NEW.id, 'En Negociación', '#FFC107', 3, true),
    (NEW.id, 'Ganado', '#8BC34A', 4, true),
    (NEW.id, 'Perdido', '#F44336', 5, true);
  RETURN NEW;
END;
$$;

-- Trigger para llamar a la función después de insertar un nuevo usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.asignar_estados_lead_por_defecto();

-- Crear RLS (Row Level Security) policies
ALTER TABLE estados_lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacciones ENABLE ROW LEVEL SECURITY;

-- Políticas para estados_lead
CREATE POLICY "Usuarios pueden ver sus propios estados de lead"
    ON estados_lead FOR SELECT
    TO authenticated
    USING (usuario_id = auth.uid());

CREATE POLICY "Usuarios pueden crear sus propios estados de lead"
    ON estados_lead FOR INSERT
    TO authenticated
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuarios pueden actualizar sus propios estados de lead"
    ON estados_lead FOR UPDATE
    TO authenticated
    USING (usuario_id = auth.uid());

CREATE POLICY "Usuarios pueden eliminar sus propios estados de lead"
    ON estados_lead FOR DELETE
    TO authenticated
    USING (usuario_id = auth.uid());

-- Políticas para leads
CREATE POLICY "Leads visibles para usuarios autenticados"
    ON leads FOR SELECT
    TO authenticated
    USING (
        creado_por = auth.uid() OR 
        asignado_a = auth.uid()
    );

CREATE POLICY "Usuarios pueden crear leads"
    ON leads FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar sus leads"
    ON leads FOR UPDATE
    TO authenticated
    USING (
        creado_por = auth.uid() OR 
        asignado_a = auth.uid()
    );

CREATE POLICY "Usuarios pueden eliminar sus leads"
    ON leads FOR DELETE
    TO authenticated
    USING (creado_por = auth.uid());

-- Políticas para interacciones
CREATE POLICY "Interacciones visibles para usuarios autenticados"
    ON interacciones FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM leads l 
            WHERE l.id = lead_id 
            AND (l.creado_por = auth.uid() OR l.asignado_a = auth.uid())
        )
    );

CREATE POLICY "Usuarios pueden crear interacciones"
    ON interacciones FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leads l 
            WHERE l.id = lead_id 
            AND (l.creado_por = auth.uid() OR l.asignado_a = auth.uid())
        )
    );

CREATE POLICY "Usuarios pueden actualizar sus interacciones"
    ON interacciones FOR UPDATE
    TO authenticated
    USING (creado_por = auth.uid());

CREATE POLICY "Usuarios pueden eliminar sus interacciones"
    ON interacciones FOR DELETE
    TO authenticated
    USING (creado_por = auth.uid()); 