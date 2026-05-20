-- =====================================================================
-- FLEET CONTROL - MIGRAÇÃO: sincronização de abastecimentos do Webposto
-- Data: 2026-05-16
-- =====================================================================
-- Adiciona suporte a sincronizar abastecimentos da API Quality/Webposto.
--
-- INSTRUÇÕES:
-- 1. SQL Editor → cola este script → Run
-- 2. Não-destrutivo (IF NOT EXISTS)
-- =====================================================================

-- Campos de sincronização em fuelings
ALTER TABLE fuelings ADD COLUMN IF NOT EXISTS webposto_id TEXT;
ALTER TABLE fuelings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fuelings_webposto_id_unique
  ON fuelings(webposto_id)
  WHERE webposto_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fuelings_webposto_id ON fuelings(webposto_id);

-- Tabela de estado de sincronização (cursor de paginação)
CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL PRIVILEGES ON sync_state TO anon, authenticated;

-- Verificação
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fuelings'
  AND column_name IN ('webposto_id', 'last_synced_at')
ORDER BY column_name;
