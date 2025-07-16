-- Verificar y corregir políticas RLS para nueva conversación

-- 1. Políticas para tabla 'conversaciones'
DROP POLICY IF EXISTS "Usuarios pueden crear conversaciones" ON conversaciones;
DROP POLICY IF EXISTS "Usuarios pueden ver sus conversaciones" ON conversaciones;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus conversaciones" ON conversaciones;

CREATE POLICY "Usuarios pueden crear conversaciones" ON conversaciones
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden ver sus conversaciones" ON conversaciones
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar sus conversaciones" ON conversaciones
FOR UPDATE USING (auth.role() = 'authenticated');

-- 2. Políticas para tabla 'mensajes_conversacion'
DROP POLICY IF EXISTS "Usuarios pueden crear mensajes" ON mensajes_conversacion;
DROP POLICY IF EXISTS "Usuarios pueden ver mensajes" ON mensajes_conversacion;

CREATE POLICY "Usuarios pueden crear mensajes" ON mensajes_conversacion
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden ver mensajes" ON mensajes_conversacion
FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Políticas para tabla 'interacciones_lead' (si existe)
DROP POLICY IF EXISTS "Usuarios pueden crear interacciones" ON interacciones_lead;
CREATE POLICY "Usuarios pueden crear interacciones" ON interacciones_lead
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Verificar que RLS esté habilitado
ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_conversacion ENABLE ROW LEVEL SECURITY;

-- Si existe la tabla interacciones_lead
-- ALTER TABLE interacciones_lead ENABLE ROW LEVEL SECURITY;