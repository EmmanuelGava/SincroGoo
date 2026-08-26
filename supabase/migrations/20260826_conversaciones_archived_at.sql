-- M3: archivar chat sin borrar historial
ALTER TABLE public.conversaciones
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS conversaciones_archived_at_idx
  ON public.conversaciones (archived_at)
  WHERE archived_at IS NOT NULL;
