-- =====================================================================
-- Congela o Fleet Control — desliga os crons de sincronizacao.
-- =====================================================================
-- Rodar no SQL Editor do Supabase (projeto FROTA GFP) quando o app parar
-- de ser usado pelo time (a gestao ativa agora e no sistema interno).
-- Apos rodar, nenhuma viagem/abastecimento/manutencao/despesa nova entra —
-- os dados historicos ficam intactos para consulta.
--
-- Para reativar depois: refaca o setup-infleet-cron.sql e
-- setup-webposto-cron.sql originais.
-- =====================================================================

SELECT cron.unschedule('sync-infleet-vehicles-3h');
SELECT cron.unschedule('sync-webposto-fuelings-3h');

-- Verificacao
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'sync-%';
-- Esperado: 0 linhas.
