-- =====================================================================
-- FLEET CONTROL - MIGRAÇÃO: viagens da Infleet
-- Data: 2026-05-13
-- =====================================================================
-- Adiciona suporte a sincronizar viagens (trips) da Infleet:
-- 1. Chave sintética (Infleet não devolve id útil em Trip)
-- 2. Timestamp da última sync
-- 3. origin e destination viram opcionais (Infleet só tem GPS, sem texto)
-- 4. Campos de horário de início/fim e duração calculada
--
-- INSTRUÇÕES:
-- 1. SQL Editor → cola este script → Run
-- 2. Não-destrutivo (IF NOT EXISTS / IF EXISTS / DROP NOT NULL)
-- =====================================================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS infleet_trip_key TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- origin e destination podem ser nulos (Infleet não envia)
ALTER TABLE trips ALTER COLUMN origin DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN destination DROP NOT NULL;

-- Único quando preenchido
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_infleet_key_unique
  ON trips(infleet_trip_key)
  WHERE infleet_trip_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trips_started_at ON trips(started_at DESC);

-- Verificação
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trips'
  AND column_name IN ('origin', 'destination', 'infleet_trip_key', 'last_synced_at', 'started_at', 'finished_at')
ORDER BY column_name;
