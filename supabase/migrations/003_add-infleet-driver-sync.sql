-- =====================================================================
-- FLEET CONTROL - MIGRAÇÃO: campos de sincronização Infleet em drivers
-- Data: 2026-05-13
-- =====================================================================
-- Adiciona campos pra mapear motoristas do Supabase ↔ Infleet.
--
-- INSTRUÇÕES:
-- 1. Acesse FROTA GFP no Supabase
-- 2. Menu lateral → SQL Editor → New query
-- 3. Cole este script e clique em "Run"
-- 4. Não-destrutivo: usa IF NOT EXISTS, pode rodar várias vezes
-- =====================================================================

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS infleet_id TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Único quando preenchido (NULLs múltiplos são permitidos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_infleet_id_unique
  ON drivers(infleet_id)
  WHERE infleet_id IS NOT NULL;

-- Índice de busca
CREATE INDEX IF NOT EXISTS idx_drivers_infleet_id ON drivers(infleet_id);

-- Verificação
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'drivers'
  AND column_name IN ('infleet_id', 'last_synced_at');

-- Resultado esperado: 2 linhas
--   infleet_id      | text                     | YES
--   last_synced_at  | timestamp with time zone | YES
