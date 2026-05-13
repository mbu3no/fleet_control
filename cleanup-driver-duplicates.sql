-- =====================================================================
-- FLEET CONTROL - CLEANUP: remove motoristas duplicados após sync da Infleet
-- Data: 2026-05-13
-- =====================================================================
-- Bug: o sync anterior criou duplicatas dos motoristas que já existiam
-- localmente (matching de nome falhou por causa de regex bugada).
--
-- Este script:
-- 1. Identifica pares onde o mesmo nome (ignorando acento/case/espaço extra)
--    existe duas vezes: uma versão local (sem infleet_id) e uma da Infleet.
-- 2. Apaga a versão da Infleet (sem trips/relações), mantendo a local.
--
-- DEPOIS:
-- 1. Redeploy da Edge Function com a regex corrigida.
-- 2. Clica em "Sincronizar agora" no app.
-- 3. Os 3 originais agora vão pegar o infleet_id corretamente.
--
-- SEGURO: só apaga drivers com infleet_id que têm um par sem infleet_id.
-- Não toca em motoristas sem duplicata.
-- =====================================================================

-- Pré-checagem: ver os duplicados
WITH normalized AS (
  SELECT
    id,
    name,
    infleet_id,
    LOWER(REGEXP_REPLACE(UNACCENT(name), '\s+', ' ', 'g')) AS norm
  FROM drivers
)
SELECT
  a.id AS original_id, a.name AS original_name,
  b.id AS infleet_id_para_apagar, b.name AS infleet_name
FROM normalized a
JOIN normalized b ON a.norm = b.norm AND a.id <> b.id
WHERE a.infleet_id IS NULL
  AND b.infleet_id IS NOT NULL;

-- Se o resultado acima estiver correto, rode o DELETE abaixo:

WITH normalized AS (
  SELECT
    id,
    name,
    infleet_id,
    LOWER(REGEXP_REPLACE(UNACCENT(name), '\s+', ' ', 'g')) AS norm
  FROM drivers
),
duplicates_to_delete AS (
  SELECT n.id
  FROM normalized n
  WHERE n.infleet_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM normalized o
      WHERE o.infleet_id IS NULL
        AND o.norm = n.norm
        AND o.id <> n.id
    )
)
DELETE FROM drivers WHERE id IN (SELECT id FROM duplicates_to_delete)
RETURNING id, name;
-- Output: lista das linhas apagadas (deve ser 3)
