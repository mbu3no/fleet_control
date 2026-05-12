-- =====================================================================
-- FLEET CONTROL - SETUP: cron de sincronização Infleet (a cada 3h)
-- Data: 2026-05-12
-- =====================================================================
-- IMPORTANTE: rode este script DEPOIS de:
--   1. Aplicar add-infleet-vehicle-sync.sql
--   2. Deployar a Edge Function sync-infleet-vehicles
--   3. Setar o secret INFLEET_TOKEN no painel da Supabase
--
-- ANTES DE RODAR: substitua YOUR_SUPABASE_ANON_KEY_HERE pela sua
-- VITE_SUPABASE_ANON_KEY (a mesma do .env do Fleet Control).
-- =====================================================================

-- 1. Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remove agendamento anterior se existir (idempotente)
SELECT cron.unschedule('sync-infleet-vehicles-3h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-infleet-vehicles-3h');

-- 3. Agenda chamada à Edge Function a cada 3 horas
SELECT cron.schedule(
  'sync-infleet-vehicles-3h',
  '0 */3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cfikehpzbyyqscigfwwl.supabase.co/functions/v1/sync-infleet-vehicles',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmaWtlaHB6Ynl5cXNjaWdmd3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDM1MzQsImV4cCI6MjA5MjQxOTUzNH0.obO9GsMzxNJfx4rDuf4xrUcNuycfWvXr2yRTJCgPELY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verificação
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'sync-infleet-vehicles-3h';

-- Resultado esperado: 1 linha com schedule='0 */3 * * *' e active=true
-- Pra ver execuções: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
