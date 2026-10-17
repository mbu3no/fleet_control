-- =====================================================================
-- FLEET CONTROL - MIGRAÇÃO: campos de sincronização Infleet em expenses
-- Data: 2026-05-15
-- =====================================================================
-- Adiciona campos pra mapear despesas do Supabase ↔ Infleet.
--
-- INSTRUÇÕES:
-- 1. Acesse FROTA GFP no Supabase
-- 2. Menu lateral → SQL Editor → New query
-- 3. Cole este script e clique em "Run"
-- 4. Não-destrutivo: usa IF NOT EXISTS, pode rodar várias vezes
-- =====================================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS infleet_id TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Único quando preenchido (NULLs múltiplos são permitidos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_infleet_id_unique
  ON expenses(infleet_id)
  WHERE infleet_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_infleet_id ON expenses(infleet_id);

-- Verificação
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses'
  AND column_name IN ('infleet_id', 'last_synced_at')
ORDER BY column_name;
