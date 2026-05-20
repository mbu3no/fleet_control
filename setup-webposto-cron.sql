-- =====================================================================
-- FLEET CONTROL - SETUP: cron de sincronização Webposto (a cada 3h)
-- Data: 2026-05-16
-- =====================================================================
-- IMPORTANTE: rode DEPOIS de:
--   1. Aplicar add-webposto-fueling-sync.sql
--   2. Deployar a Edge Function sync-webposto-fuelings
--   3. Setar o secret WEBPOSTO_TOKEN no painel da Supabase
--
-- ANTES DE RODAR: substitua YOUR_SUPABASE_ANON_KEY_HERE pela sua
-- VITE_SUPABASE_ANON_KEY (a mesma do .env do Fleet Control).
--
-- Durante o backfill (cobrir 01/01 até hoje), o cron avança ~15 páginas
-- por execução. Pode clicar "Sincronizar agora" no app pra acelerar.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('sync-webposto-fuelings-3h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-webposto-fuelings-3h');

SELECT cron.schedule(
  'sync-webposto-fuelings-3h',
  '30 */3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cfikehpzbyyqscigfwwl.supabase.co/functions/v1/sync-webposto-fuelings',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY_HERE',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verificação
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'sync-webposto-fuelings-3h';
-- Esperado: 1 linha, schedule '30 */3 * * *', active true
-- (roda nos minutos :30, defasado do cron da Infleet que roda em :00)
