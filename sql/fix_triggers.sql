-- 1. Eliminar la clave foránea y el trigger incorrectos
ALTER TABLE public.estados_lead DROP CONSTRAINT IF EXISTS estados_lead_usuario_id_fkey;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Asegurarse de que la tabla de perfiles 'usuarios' existe y la FK apunta a ella
ALTER TABLE public.estados_lead
ADD CONSTRAINT estados_lead_usuario_id_fkey
FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

-- 3. Crear (o reemplazar) la función que asigna los estados
CREATE OR REPLACE FUNCTION public.asignar_estados_lead_por_defecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insertar los 5 estados por defecto para el NUEVO perfil de usuario
  INSERT INTO public.estados_lead (usuario_id, nombre, color, orden, is_default)
  VALUES
    (NEW.id, 'Nuevo', '#4CAF50', 1, false),
    (NEW.id, 'Contactado', '#2196F3', 2, false),
    (NEW.id, 'En Negociación', '#FFC107', 3, false),
    (NEW.id, 'Ganado', '#8BC34A', 4, false),
    (NEW.id, 'Perdido', '#F44336', 5, false);
  RETURN NEW;
END;
$$;

-- 4. Crear el nuevo trigger en la tabla 'usuarios' (perfiles)
CREATE TRIGGER on_new_user_profile_created
  AFTER INSERT ON public.usuarios
  FOR EACH ROW
  EXECUTE PROCEDURE public.asignar_estados_lead_por_defecto();

-- Opcional: Limpiar estados de lead huérfanos si los hubiera
DELETE FROM public.estados_lead WHERE usuario_id NOT IN (SELECT id FROM public.usuarios); 