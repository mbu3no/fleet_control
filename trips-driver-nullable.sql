-- =====================================================================
-- Permite trips sem motorista (driver_id NULL)
-- Necessario para importar viagens historicas da Cobli em que o
-- motorista nao foi identificado (~2545 linhas com motorista "--").
-- =====================================================================

ALTER TABLE public.trips
  ALTER COLUMN driver_id DROP NOT NULL;

SELECT 'trips.driver_id agora aceita NULL' AS status;
