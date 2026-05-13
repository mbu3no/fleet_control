-- =====================================================================
-- FLEET CONTROL - CLEANUP: motoristas duplicados após sync da Infleet
-- Data: 2026-05-13 (v2 — matching por prefixo de palavras)
-- =====================================================================
-- O sync criou duplicatas porque o nome local é menor que o da Infleet:
--   Local:    "ARNALDO OLIVEIRA"
--   Infleet:  "Arnaldo Oliveira Soares"
--
-- Este script faz matching por PREFIXO DE PALAVRAS:
--   o nome local normalizado precisa ser o começo do nome da Infleet.
-- Exige que o nome local tenha ao menos 2 palavras (evita matches frouxos).
--
-- Comportamento:
--   1. Transfere infleet_id do duplicado para o motorista local original
--   2. Apaga o duplicado da Infleet
--   3. O motorista local agora fica linkado à Infleet
--
-- Depois disso, futuras sincronizações vão atualizar o local
-- pelo infleet_id (matching forte) sem criar duplicata.
-- =====================================================================

-- PASSO 1 — Preview: ver os pares que seriam mesclados.
-- Execute esta query primeiro e confira se os pares estão certos.

WITH normalized AS (
  SELECT
    id,
    name,
    infleet_id,
    LOWER(REGEXP_REPLACE(
      TRANSLATE(
        name,
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
      ),
      '\s+', ' ', 'g'
    )) AS norm
  FROM drivers
)
SELECT
  local.id AS local_id,
  local.name AS local_name,
  inf.id AS infleet_dup_id,
  inf.name AS infleet_name,
  inf.infleet_id AS infleet_id_to_transfer
FROM normalized local
JOIN normalized inf
  ON local.infleet_id IS NULL
 AND inf.infleet_id IS NOT NULL
 AND local.id <> inf.id
 AND (inf.norm = local.norm OR inf.norm LIKE local.norm || ' %')
 AND ARRAY_LENGTH(STRING_TO_ARRAY(local.norm, ' '), 1) >= 2
ORDER BY local.name;

-- PASSO 2 — Action: se o preview acima estiver correto, rode este bloco.
-- Faz UPDATE + DELETE numa única transação (DO block).

DO $$
DECLARE
  pair RECORD;
  cnt_updated INT := 0;
  cnt_deleted INT := 0;
BEGIN
  FOR pair IN (
    WITH normalized AS (
      SELECT
        id, name, infleet_id,
        LOWER(REGEXP_REPLACE(
          TRANSLATE(name,
            'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
            'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
          '\s+', ' ', 'g'
        )) AS norm
      FROM drivers
    )
    SELECT
      local.id AS local_id,
      inf.id AS dup_id,
      inf.infleet_id AS new_infleet_id
    FROM normalized local
    JOIN normalized inf
      ON local.infleet_id IS NULL
     AND inf.infleet_id IS NOT NULL
     AND local.id <> inf.id
     AND (inf.norm = local.norm OR inf.norm LIKE local.norm || ' %')
     AND ARRAY_LENGTH(STRING_TO_ARRAY(local.norm, ' '), 1) >= 2
  )
  LOOP
    -- Apaga o duplicado PRIMEIRO pra liberar o infleet_id (unique constraint)
    DELETE FROM drivers WHERE id = pair.dup_id;
    cnt_deleted := cnt_deleted + 1;

    -- Agora transfere o infleet_id pro motorista local original
    UPDATE drivers
       SET infleet_id = pair.new_infleet_id,
           last_synced_at = NOW()
     WHERE id = pair.local_id;
    cnt_updated := cnt_updated + 1;
  END LOOP;

  RAISE NOTICE 'Cleanup concluído: % motoristas locais linkados, % duplicatas removidas.', cnt_updated, cnt_deleted;
END $$;

-- PASSO 3 — Verificação: ver quantos motoristas têm infleet_id agora.
SELECT
  COUNT(*) FILTER (WHERE infleet_id IS NOT NULL) AS com_infleet,
  COUNT(*) FILTER (WHERE infleet_id IS NULL) AS sem_infleet,
  COUNT(*) AS total
FROM drivers;
-- Resultado esperado: com_infleet = 14, sem_infleet = 0, total = 14
