-- =====================================================================
-- FLEET CONTROL - SETUP COMPLETO DO ZERO
-- Projeto: FROTA GFP (cfikehpzbyyqscigfwwl)
-- =====================================================================
-- Este SQL faz TUDO necessário para o app funcionar:
--   ✓ Apaga tudo que existe (limpa qualquer resíduo)
--   ✓ Cria as 11 tabelas
--   ✓ Concede TODAS as permissões pro role anon
--   ✓ Desabilita RLS
--   ✓ Sem triggers, sem auth, sem complicação
--
-- INSTRUÇÕES:
-- 1. Acesse FROTA GFP no Supabase
-- 2. Menu lateral → SQL Editor → New query
-- 3. Apague tudo que estiver no editor
-- 4. Cole TODO este código
-- 5. Clique em "Run"
-- 6. No final aparece: "✅ Tudo pronto!"
-- =====================================================================


-- =====================================================================
-- 1. LIMPEZA TOTAL - apaga tudo de execuções anteriores
-- =====================================================================

-- Remove qualquer trigger no auth.users (que pode estar causando problemas)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove funções
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS can_write() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Remove tabelas (CASCADE remove tudo: índices, FKs, policies)
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS insurances CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS maintenances CASCADE;
DROP TABLE IF EXISTS fuelings CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS cost_centers CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS user_invites CASCADE;


-- =====================================================================
-- 2. CRIAÇÃO DAS TABELAS
-- =====================================================================

CREATE TABLE companies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cost_centers (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehicles (
  id BIGSERIAL PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  year INTEGER,
  current_km NUMERIC(12, 2) DEFAULT 0,
  purchase_value NUMERIC(12, 2) DEFAULT 0,
  purchase_date DATE,
  next_revision_km NUMERIC(12, 2),
  next_revision_date DATE,
  status TEXT DEFAULT 'disponível',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE drivers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cnh TEXT,
  phone TEXT,
  company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  cost_center_id BIGINT REFERENCES cost_centers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fuelings (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  liters NUMERIC(10, 2) NOT NULL,
  value NUMERIC(12, 2) NOT NULL,
  km NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE maintenances (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL,
  cost NUMERIC(12, 2) DEFAULT 0,
  next_km NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trips (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id BIGINT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  km NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  value NUMERIC(12, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE insurances (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  policy_number TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  premium NUMERIC(12, 2) DEFAULT 0,
  coverage NUMERIC(12, 2) DEFAULT 0,
  deductible NUMERIC(12, 2) DEFAULT 0,
  broker TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reservations (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  department TEXT,
  requester_email TEXT,
  requester_phone TEXT,
  start_date_time TIMESTAMPTZ NOT NULL,
  end_date_time TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  status_note TEXT,
  status_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_users (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Operador',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_invites (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Operador',
  accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================================
-- 3. ÍNDICES
-- =====================================================================

CREATE INDEX idx_cost_centers_company ON cost_centers(company_id);
CREATE INDEX idx_vehicles_plate ON vehicles(plate);
CREATE INDEX idx_drivers_company ON drivers(company_id);
CREATE INDEX idx_drivers_cost_center ON drivers(cost_center_id);
CREATE INDEX idx_fuelings_vehicle ON fuelings(vehicle_id);
CREATE INDEX idx_fuelings_date ON fuelings(date DESC);
CREATE INDEX idx_maintenances_vehicle ON maintenances(vehicle_id);
CREATE INDEX idx_maintenances_date ON maintenances(date DESC);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_date ON trips(date DESC);
CREATE INDEX idx_expenses_vehicle ON expenses(vehicle_id);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_insurances_vehicle ON insurances(vehicle_id);
CREATE INDEX idx_insurances_end_date ON insurances(end_date);
CREATE INDEX idx_reservations_vehicle ON reservations(vehicle_id);
CREATE INDEX idx_reservations_status ON reservations(status);


-- =====================================================================
-- 4. DESABILITA RLS EM TODAS AS TABELAS
-- =====================================================================

ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE fuelings DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE insurances DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites DISABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 5. CONCEDE PERMISSÕES TOTAIS PRO ROLE 'anon' E 'authenticated'
-- IMPORTANTE: este é o passo que estava faltando antes
-- =====================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Para futuras tabelas criadas, conceder permissões automaticamente
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;


-- =====================================================================
-- 6. TRIGGER updated_at automático
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_companies BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_cost_centers BEFORE UPDATE ON cost_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_vehicles BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_drivers BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_fuelings BEFORE UPDATE ON fuelings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_maintenances BEFORE UPDATE ON maintenances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_trips BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_expenses BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_insurances BEFORE UPDATE ON insurances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_reservations BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_app_users BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================================
-- 7. TESTE DE INSERÇÃO (para garantir que está funcionando)
-- =====================================================================

INSERT INTO companies (name, cnpj) VALUES ('TESTE_VALIDACAO', '00.000.000/0000-00');
DELETE FROM companies WHERE name = 'TESTE_VALIDACAO';


-- =====================================================================
-- ✅ VERIFICAÇÃO FINAL
-- =====================================================================

SELECT 
  '✅ Tudo pronto! O app já pode salvar dados.' AS status,
  has_table_privilege('anon', 'companies', 'INSERT') AS anon_pode_inserir,
  has_table_privilege('anon', 'companies', 'UPDATE') AS anon_pode_atualizar,
  has_table_privilege('anon', 'companies', 'DELETE') AS anon_pode_excluir,
  has_table_privilege('anon', 'companies', 'SELECT') AS anon_pode_ler,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'companies') AS rls_ativo,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS total_tabelas;

-- =====================================================================
-- 🎯 RESULTADO ESPERADO:
-- 
-- status:              "✅ Tudo pronto!..."
-- anon_pode_inserir:   true
-- anon_pode_atualizar: true
-- anon_pode_excluir:   true
-- anon_pode_ler:       true
-- rls_ativo:           false
-- total_tabelas:       12 (ou mais)
--
-- Se algum desses estiver diferente, ME AVISA E ME MANDA O RESULTADO!
-- =====================================================================
