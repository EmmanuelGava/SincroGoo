-- Tabla para configuración de mensajería por usuario
CREATE TABLE IF NOT EXISTS public.configuracion_mensajeria_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    plataforma TEXT NOT NULL CHECK (plataforma IN ('telegram', 'whatsapp', 'email')),
    activa BOOLEAN DEFAULT true,
    
    -- Configuración específica por plataforma (JSON)
    configuracion JSONB NOT NULL,
    
    -- Metadatos
    nombre_configuracion TEXT, -- Ej: "Mi WhatsApp Personal", "Telegram Empresa"
    descripcion TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices únicos
    UNIQUE(usuario_id, plataforma, nombre_configuracion)
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_config_mensajeria_usuario_id ON configuracion_mensajeria_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_config_mensajeria_plataforma ON configuracion_mensajeria_usuario(plataforma);
CREATE INDEX IF NOT EXISTS idx_config_mensajeria_activa ON configuracion_mensajeria_usuario(activa);

-- RLS (Row Level Security)
ALTER TABLE configuracion_mensajeria_usuario ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios pueden ver sus configuraciones" ON configuracion_mensajeria_usuario
FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden crear sus configuraciones" ON configuracion_mensajeria_usuario
FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden actualizar sus configuraciones" ON configuracion_mensajeria_usuario
FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden eliminar sus configuraciones" ON configuracion_mensajeria_usuario
FOR DELETE USING (auth.uid() = usuario_id);

-- Ejemplos de configuraciones por plataforma:

-- WhatsApp Business API:
-- {
--   "access_token": "EAAJpUUihH6sBP...",
--   "phone_number_id": "15551953094",
--   "business_account_id": "123456789",
--   "webhook_verify_token": "mi_token_verificacion"
-- }

-- Telegram Bot:
-- {
--   "bot_token": "7578036863:AAGf4raRGhbwSBk1QhCf...",
--   "bot_username": "mi_bot",
--   "webhook_url": "https://midominio.com/api/telegram/webhook"
-- }

-- Email (SendGrid/SMTP):
-- {
--   "provider": "sendgrid", // o "smtp"
--   "api_key": "SG.xxxxx", // para SendGrid
--   "from_email": "noreply@miempresa.com",
--   "from_name": "Mi Empresa",
--   "smtp_host": "smtp.gmail.com", // para SMTP
--   "smtp_port": 587,
--   "smtp_user": "usuario@gmail.com",
--   "smtp_password": "contraseña_app"
-- }