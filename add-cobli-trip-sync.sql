-- =====================================================================
-- Backfill Cobli — viagens historicas (01/01 a 10/05)
-- Adiciona cobli_path_key na tabela trips. Idempotente.
-- =====================================================================

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS cobli_path_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_cobli_path_key
  ON public.trips(cobli_path_key)
  WHERE cobli_path_key IS NOT NULL;

SELECT 'trips pronta para backfill Cobli' AS status,
       (SELECT COUNT(*) FROM public.trips) AS trips_atuais;
