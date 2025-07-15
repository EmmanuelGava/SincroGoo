-- Configuración de Supabase Storage para archivos de chat

-- 1. Crear el bucket para archivos de chat
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  10485760, -- 10MB en bytes
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Configurar políticas de seguridad para el bucket
-- Permitir a usuarios autenticados subir archivos
CREATE POLICY "Usuarios autenticados pueden subir archivos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-files' 
  AND auth.role() = 'authenticated'
);

-- Permitir a todos ver archivos (bucket público)
CREATE POLICY "Archivos públicos son visibles" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-files');

-- Permitir a usuarios autenticados eliminar sus propios archivos
CREATE POLICY "Usuarios pueden eliminar sus archivos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-files' 
  AND auth.role() = 'authenticated'
);

-- 3. Habilitar RLS en storage.objects si no está habilitado
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;