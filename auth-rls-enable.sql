-- =====================================================================
-- AUTH 2/2 — Liga RLS nas tabelas de dados
-- Rodar SOMENTE depois de testar login, convite e papeis (Task 13).
-- Para reverter em emergencia: ALTER TABLE public.<tabela> DISABLE ROW LEVEL SECURITY;
-- =====================================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'companies','cost_centers','vehicles','drivers','fuelings',
    'maintenances','trips','expenses','insurances','reservations'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='sync_state') THEN
    tables := tables || 'sync_state';
  END IF;

  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_delete', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (public.current_user_role() IS NOT NULL)',
      t||'_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.current_user_role() IN (''admin'',''editor''))',
      t||'_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (public.current_user_role() IN (''admin'',''editor''))',
      t||'_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (public.current_user_role() = ''admin'')',
      t||'_delete', t);
  END LOOP;
END $$;

-- Verificacao: todas devem aparecer com rls = true
SELECT relname AS tabela, relrowsecurity AS rls
FROM pg_class
WHERE relname IN ('companies','cost_centers','vehicles','drivers','fuelings',
  'maintenances','trips','expenses','insurances','reservations','sync_state','profiles')
ORDER BY relname;
