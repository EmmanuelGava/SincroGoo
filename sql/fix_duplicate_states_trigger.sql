-- 1. Crear (o reemplazar) la función que asigna los estados de forma más segura

CREATE OR REPLACE FUNCTION public.asignar_estados_lead_por_defecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar si ya existen estados para este usuario para evitar errores de duplicados
  IF NOT EXISTS (SELECT 1 FROM public.estados_lead WHERE usuario_id = NEW.id) THEN
    -- Insertar los 5 estados por defecto para el NUEVO perfil de usuario
    INSERT INTO public.estados_lead (usuario_id, nombre, color, orden, is_default)
    VALUES
      (NEW.id, 'Nuevo', '#4CAF50', 1, false),
      (NEW.id, 'Contactado', '#2196F3', 2, false),
      (NEW.id, 'En Negociación', '#FFC107', 3, false),
      (NEW.id, 'Ganado', '#8BC34A', 4, false),
      (NEW.id, 'Perdido', '#F44336', 5, false);
  END IF;
  RETURN NEW;
END;
$$;


-- 2. (Opcional pero recomendado) Limpiar datos huérfanos del usuario que da problemas.
-- El ID de usuario se ha extraído de los logs de error.

-- Primero, elimina los estados de lead huérfanos de tu usuario
DELETE FROM public.estados_lead WHERE usuario_id = 'bd6cb228-7597-4df3-b6ec-c9d6b32b50f9';

-- Segundo, elimina el perfil de usuario si es que llegó a crearse y quedó en un estado inconsistente
DELETE FROM public.usuarios WHERE id = 'bd6cb228-7597-4df3-b6ec-c9d6b32b50f9'; 