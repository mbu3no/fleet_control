-- =====================================================================
-- FIX RLS — desabilita Row Level Security e concede permissões
-- =====================================================================
-- Use este script quando o app retornar:
--   "new row violates row-level security policy for table X"
--
-- Este script é NÃO-DESTRUTIVO:
--   - NÃO apaga tabelas
--   - NÃO apaga dados
--   - SÓ desliga RLS e adiciona permissões
--
-- Como rodar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cole TUDO abaixo
--   3. Run
-- =====================================================================


-- 1. Desabilita RLS em todas as tabelas do app
ALTER TABLE IF EXISTS companies     DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cost_centers  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vehicles      DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS drivers       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fuelings      DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS maintenances  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trips         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses      DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS insurances    DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservations  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_users     DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_invites  DISABLE ROW LEVEL SECURITY;


-- 2. Concede permissões totais aos roles anon e authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 3. Permissões automáticas para tabelas/sequences criadas no futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;


-- 4. Verificação — todas as linhas devem mostrar pode_inserir=true e rls_ativo=false
SELECT
  table_name,
  has_table_privilege('anon', 'public.' || table_name, 'SELECT') AS pode_ler,
  has_table_privilege('anon', 'public.' || table_name, 'INSERT') AS pode_inserir,
  has_table_privilege('anon', 'public.' || table_name, 'UPDATE') AS pode_atualizar,
  has_table_privilege('anon', 'public.' || table_name, 'DELETE') AS pode_excluir,
  (SELECT relrowsecurity FROM pg_class WHERE relname = t.table_name AND relnamespace = 'public'::regnamespace) AS rls_ativo
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('companies', 'cost_centers', 'vehicles', 'drivers', 'fuelings', 'maintenances', 'trips', 'expenses', 'insurances', 'reservations', 'app_users', 'user_invites')
ORDER BY table_name;
