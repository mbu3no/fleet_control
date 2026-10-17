-- =====================================================================
-- FLEET CONTROL - MIGRAÇÃO: campos de revisão por km/data em veículos
-- Data: 2026-05-12
-- =====================================================================
-- Adiciona suporte a alertas de revisão no dashboard.
--
-- INSTRUÇÕES:
-- 1. Acesse FROTA GFP no Supabase
-- 2. Menu lateral → SQL Editor → New query
-- 3. Cole este script e clique em "Run"
-- 4. Não-destrutivo: usa IF NOT EXISTS, pode rodar várias vezes
-- =====================================================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_revision_km NUMERIC(12, 2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_revision_date DATE;

-- Verificação
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicles'
  AND column_name IN ('next_revision_km', 'next_revision_date');

-- Resultado esperado: 2 linhas
--   next_revision_km   | numeric | YES
--   next_revision_date | date    | YES
