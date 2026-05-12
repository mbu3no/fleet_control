-- =====================================================================
-- FLEET CONTROL - MIGRAÇÃO: campos de sincronização com Infleet
-- Data: 2026-05-12
-- =====================================================================
-- Adiciona campos pra mapear veículos do Supabase ↔ Infleet.
--
-- INSTRUÇÕES:
-- 1. Acesse FROTA GFP no Supabase
-- 2. Menu lateral → SQL Editor → New query
-- 3. Cole este script e clique em "Run"
-- 4. Não-destrutivo: usa IF NOT EXISTS, pode rodar várias vezes
-- =====================================================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS infleet_id TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Único quando preenchido (NULLs múltiplos são permitidos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_infleet_id_unique
  ON vehicles(infleet_id)
  WHERE infleet_id IS NOT NULL;

-- Índice de busca
CREATE INDEX IF NOT EXISTS idx_vehicles_infleet_id ON vehicles(infleet_id);

-- Verificação
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicles'
  AND column_name IN ('infleet_id', 'last_synced_at');

-- Resultado esperado: 2 linhas
--   infleet_id      | text                     | YES
--   last_synced_at  | timestamp with time zone | YES
