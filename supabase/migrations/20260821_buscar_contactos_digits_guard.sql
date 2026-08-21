-- Guard: no aplicar LIKE de teléfono si p_q no tiene dígitos
-- (p. ej. "María" no debe matchear todos los contactos).
-- Ya aplicada en prod KloSync (nwxhggmjsyvbnaoefrxl).

CREATE OR REPLACE FUNCTION public.buscar_contactos(p_usuario uuid, p_q text)
RETURNS SETOF public.contactos
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.contactos
  WHERE usuario_id = p_usuario
    AND (
      p_q IS NULL OR btrim(p_q) = ''
      OR unaccent(nombre) ILIKE '%' || unaccent(p_q) || '%'
      OR COALESCE(email, '') ILIKE '%' || p_q || '%'
      OR (
        regexp_replace(p_q, '\D', '', 'g') <> ''
        AND COALESCE(telefono_digits, '') LIKE '%' || regexp_replace(p_q, '\D', '', 'g') || '%'
      )
    )
  ORDER BY fecha_actualizacion DESC
  LIMIT 100;
$$;
