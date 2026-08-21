-- Contactos CRM: tabla contactos, google_id en usuarios, FKs leads/conversaciones.
-- Aplicada en prod KloSync (nwxhggmjsyvbnaoefrxl) como contactos_persona_deal.

CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS google_id text;

UPDATE public.usuarios
SET google_id = auth_id
WHERE google_id IS NULL AND auth_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_google_id_key
  ON public.usuarios (google_id)
  WHERE google_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.contactos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  telefono text,
  telefono_digits text,
  email text,
  empresa text,
  notas text,
  wa_jid text,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_actualizacion timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contactos_usuario_telefono_digits_key
  ON public.contactos (usuario_id, telefono_digits)
  WHERE telefono_digits IS NOT NULL AND telefono_digits <> '';

CREATE INDEX IF NOT EXISTS contactos_usuario_telefono_digits_idx
  ON public.contactos (usuario_id, telefono_digits);

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contacto_id uuid REFERENCES public.contactos(id) ON DELETE SET NULL;

ALTER TABLE public.conversaciones
  ADD COLUMN IF NOT EXISTS contacto_id uuid REFERENCES public.contactos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_contacto_id_idx ON public.leads (contacto_id);
CREATE INDEX IF NOT EXISTS conversaciones_contacto_id_idx ON public.conversaciones (contacto_id);

ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contactos_service ON public.contactos;

CREATE POLICY contactos_service ON public.contactos
  FOR ALL
  USING (true)
  WITH CHECK (true);

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
      OR COALESCE(telefono_digits, '') LIKE '%' || regexp_replace(p_q, '\D', '', 'g') || '%'
    )
  ORDER BY fecha_actualizacion DESC
  LIMIT 100;
$$;
