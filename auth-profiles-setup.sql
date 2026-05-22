-- =====================================================================
-- AUTH 1/2 — Tabela de perfis e funcao de papel
-- Rodar no SQL Editor do Supabase.
-- NAO liga RLS nas tabelas de dados (isso e o auth-rls-enable.sql, depois).
-- =====================================================================

-- Remove leftovers de uma tentativa de auth anterior (tabelas nunca usadas)
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS user_invites CASCADE;

-- Tabela de perfis: um registro por usuario do Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','editor','viewer')),
  allowed_pages TEXT[] NOT NULL DEFAULT '{}',
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Funcao: papel do usuario logado (NULL se nao tiver perfil ativo).
-- SECURITY DEFINER evita recursao de RLS ao ler profiles de dentro das policies.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND active = TRUE
$$;

-- Garante que os roles do PostgREST possam executar a funcao nas policies
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- RLS na propria tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_delete ON public.profiles;

-- Ler: a propria linha, ou qualquer linha se for admin
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.current_user_role() = 'admin');

-- Inserir / atualizar / excluir: somente admin
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (public.current_user_role() = 'admin');
CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE USING (public.current_user_role() = 'admin');

-- Verificacao
SELECT 'profiles criada' AS status,
       (SELECT COUNT(*) FROM public.profiles) AS total_perfis;
