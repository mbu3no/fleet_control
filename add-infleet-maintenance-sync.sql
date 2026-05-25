-- =====================================================================
-- Sincronizacao Infleet — manutencoes
-- Adiciona infleet_id e last_synced_at na tabela maintenances.
-- =====================================================================

ALTER TABLE public.maintenances
  ADD COLUMN IF NOT EXISTS infleet_id TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenances_infleet_id
  ON public.maintenances(infleet_id)
  WHERE infleet_id IS NOT NULL;

SELECT 'maintenances pronta para sync Infleet' AS status,
       (SELECT COUNT(*) FROM public.maintenances) AS total_atual;
