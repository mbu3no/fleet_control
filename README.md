# Fleet Control

Sistema de gestão integrada de frotas — veículos, motoristas, abastecimentos, manutenções, despesas, seguros, viagens, reservas e rateio de custos — com autenticação por convite, três papéis de permissão e sincronização automática com Infleet (telemetria) e Webposto (combustível).

![Stack](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=white)
![Stack](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite&logoColor=white)
![Stack](https://img.shields.io/badge/Supabase-2.45-3ecf8e?logo=supabase&logoColor=white)
![Stack](https://img.shields.io/badge/Tailwind-CDN-38bdf8?logo=tailwindcss&logoColor=white)

---

## Funcionalidades

- **Dashboard** — KPIs (veículos ativos, KM no período, consumo médio, custo total e custo/km), composição do total, gráficos por veículo, alertas de seguros e revisões vencendo, reservas do dia.
- **Veículos** — cadastro, status, KM atual, valor de aquisição, próxima revisão (por KM ou data).
- **Motoristas** — vínculo com empresa e centro de custo, CNH, contato.
- **Abastecimentos** — litros, valor, KM, vinculado a veículo.
- **Manutenções** — preventivas e corretivas, custo, próximo KM previsto.
- **Viagens** — origem, destino, KM, motorista, datas.
- **Despesas** — IPVA, licenciamento, multas, com data de vencimento; alertas escalonados.
- **Seguros** — apólice, vigência, prêmio, cobertura, franquia; status visual de vencimento.
- **Reservas** — solicitações com aprovação/rejeição e estado (pendente, confirmada, em andamento, concluída).
- **Custos por veículo** — combustível, manutenção, despesas e seguro proporcional, com custo/km.
- **Rateio** — distribuição proporcional por KM (empresa → motorista → veículo), com filtro de período e empresa, busca, ordenação e exportação CSV / PDF.
- **Depreciação** — linear 20% ao ano, valor atual por veículo.
- **Autenticação por convite** — login email/senha, onboarding sem cadastro aberto.
- **Permissionamento** — três papéis (admin, editor, visualizador) com controle de páginas por usuário, aplicados no banco via RLS.
- **Aba Usuários** (admin) — listar, convidar, editar papel e páginas, desativar/reativar.
- **URLs por página** — cada aba tem sua própria URL (`/veiculos`, `/manutencoes`...), com suporte a back/forward e link direto.
- **Sincronização automática** — Infleet (veículos, motoristas, viagens, despesas, manutenções) e Webposto (abastecimentos), com cron a cada 3 horas via Edge Functions.
- **Layout responsivo**, tema escuro/claro, busca em tabelas, modais de confirmação, toasts.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 (JSX) |
| UI | Tailwind CSS (via CDN) + Lucide Icons |
| Gráficos | Recharts |
| Backend | Supabase (Postgres + Auth + Edge Functions Deno) |
| Agendamento | pg_cron + pg_net (Supabase) |
| Deploy | Vercel |

---

## Estrutura do projeto

```
fleet-control/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json                          # SPA fallback (rotas client-side)
├── schema.sql                           # Setup base das 11 tabelas de dados
├── auth-profiles-setup.sql              # Tabela profiles + funcao de papel + RLS de profiles
├── auth-rls-enable.sql                  # Liga RLS nas tabelas de dados
├── add-infleet-vehicle-sync.sql         # infleet_id em vehicles
├── add-infleet-driver-sync.sql          # infleet_id em drivers
├── add-infleet-trip-sync.sql            # infleet_trip_key em trips
├── add-infleet-expense-sync.sql         # infleet_id em expenses
├── add-infleet-maintenance-sync.sql     # infleet_id em maintenances
├── add-webposto-fueling-sync.sql        # webposto_id em fuelings + sync_state
├── setup-infleet-cron.sql               # Agendamento do sync Infleet (3h)
├── setup-webposto-cron.sql              # Agendamento do sync Webposto (3h)
├── supabase/functions/
│   ├── sync-infleet-vehicles/index.ts   # Sync Infleet (5 entidades)
│   ├── sync-webposto-fuelings/index.ts  # Sync Webposto com backfill
│   └── invite-user/index.ts             # Convite de usuario (admin)
└── src/
    ├── main.jsx                         # Bootstrap React + AuthProvider
    ├── App.jsx                          # Gate de auth, layout, paginas inline
    ├── index.css                        # Estilos globais + temas
    ├── lib/
    │   ├── supabase.js                  # Cliente Supabase + helpers CRUD
    │   ├── auth.jsx                     # AuthProvider, useAuth, canSeePage
    │   ├── recovery.js                  # Captura de URL de convite/recovery
    │   ├── format.js                    # formatLocalDate, daysUntil, busca
    │   └── allocation.js                # Calculo de rateio + export CSV
    ├── components/
    │   └── ui.jsx                       # PageHeader, DataTable, Toast, etc.
    └── pages/
        ├── Dashboard.jsx
        ├── Costs.jsx
        ├── Allocation.jsx
        ├── Expenses.jsx
        ├── Reservations.jsx
        ├── Depreciation.jsx
        ├── Login.jsx
        ├── SetPassword.jsx
        └── Users.jsx
```

---

## Como rodar localmente

### 1. Pré-requisitos

- Node.js 18+ (recomendado 20 LTS)
- npm 9+
- Conta no [Supabase](https://supabase.com) (free tier serve)

### 2. Clone e instale

```bash
git clone https://github.com/mbu3no/fleet_control.git
cd fleet_control
npm install
```

### 3. Provisione o Supabase

No painel do Supabase, em **SQL Editor**, rode em sequência:

1. **`schema.sql`** — cria as 11 tabelas de dados (companies, vehicles, drivers, trips, fuelings, maintenances, expenses, insurances, reservations, cost_centers, e funções auxiliares).
2. **`add-infleet-vehicle-sync.sql`**, **`add-infleet-driver-sync.sql`**, **`add-infleet-trip-sync.sql`**, **`add-infleet-expense-sync.sql`**, **`add-infleet-maintenance-sync.sql`** — adicionam as colunas de sincronização Infleet nas tabelas correspondentes.
3. **`add-webposto-fueling-sync.sql`** — colunas + tabela `sync_state` para o backfill Webposto.
4. **`auth-profiles-setup.sql`** — cria a tabela `profiles`, a função `current_user_role()` e a RLS de profiles.
5. **`auth-rls-enable.sql`** — liga RLS nas tabelas de dados (rodar **depois** de criar o primeiro usuário admin, ver passo 5).

### 4. Variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> **Atenção:** `.env` está no `.gitignore`. A anon key é pública por design (vai no bundle do frontend), mas a `service_role key` nunca deve ir parar no código — ela só vive como secret do Supabase Edge Functions.

### 5. Crie o primeiro admin

1. Supabase → **Authentication** → **Users** → **Add user** com email e senha inicial; marque **Auto Confirm User**. Copie o UID.
2. SQL Editor:
   ```sql
   INSERT INTO public.profiles (id, email, name, role, allowed_pages, active)
   VALUES ('UID_COPIADO', 'email_do_admin', 'Nome', 'admin', ARRAY['*'], TRUE);
   ```

### 6. Publique as Edge Functions

No Supabase → **Edge Functions**, crie e faça deploy de:
- `sync-infleet-vehicles` (cole `supabase/functions/sync-infleet-vehicles/index.ts`)
- `sync-webposto-fuelings`
- `invite-user`

Configure os secrets (Project Settings → Edge Functions → Secrets):
- `INFLEET_TOKEN` — token Bearer da Infleet
- `WEBPOSTO_TOKEN` — token X-API-Key do Webposto

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente.

### 7. Configure URLs de auth

Supabase → **Authentication** → **URL Configuration**:
- **Site URL:** URL de produção (ex.: `https://fleet-control-mu.vercel.app`)
- **Redirect URLs:** a mesma URL (com `/**` no fim para liberar qualquer caminho)

E desative o cadastro aberto: **Sign In / Providers** → desligue "Allow new users to sign up".

### 8. Rode em dev

```bash
npm run dev
```

Abre em `http://localhost:5173`. Tela de login aparece — entre com o admin criado no passo 5.

---

## Modelo de dados

```
profiles (UUID PK = auth.users.id) ── papel + paginas permitidas + status

companies ──┬── cost_centers
            └── drivers ──┐
                          ├── trips ── vehicles ──┬── fuelings (sync Webposto)
                          │                       ├── maintenances (sync Infleet)
                          │                       ├── expenses (sync Infleet)
                          │                       ├── insurances
                          │                       └── reservations
```

Triggers de `updated_at` automáticos. Sincronização identifica registros já importados por chaves externas (`infleet_id`, `infleet_trip_key`, `webposto_id`).

---

## Segurança e permissionamento

### Autenticação

Login com email e senha via Supabase Auth. Entrada **somente por convite** — não existe cadastro aberto. O admin convida pela aba Usuários; o convidado recebe email com link, define a própria senha e entra.

### Papéis

| Papel | Ver | Criar/Editar | Excluir | Gerenciar usuários |
|---|---|---|---|---|
| `admin` | tudo | sim | sim | sim |
| `editor` | páginas permitidas | sim | não | não |
| `viewer` | páginas permitidas | não | não | não |

Páginas permitidas são marcadas por usuário (ou "todas") no convite/edição.

### RLS (Row Level Security)

Todas as tabelas de dados têm RLS ligada. As policies usam a função `current_user_role()` que lê o papel do usuário logado:

- **SELECT** — qualquer usuário com perfil ativo.
- **INSERT / UPDATE** — admin ou editor.
- **DELETE** — somente admin.

A chave pública (anon key) sozinha não dá acesso: sem login, todas as queries retornam vazio. A `service_role` key é usada apenas server-side pelas Edge Functions (convite e syncs).

Veja [docs do Supabase sobre RLS](https://supabase.com/docs/guides/auth/row-level-security).

---

## Integrações

### Infleet (telemetria)

Edge Function `sync-infleet-vehicles` puxa via GraphQL:
- Veículos (placa, modelo, KM atual, status)
- Motoristas (nome, CNH ativa)
- Viagens (últimos 28 dias, em chunks de 7 dias para evitar timeout)
- Despesas (últimos 365 dias)
- Manutenções (últimos 365 dias; custo somado das `maintenanceTasks`)

Filtro `occurredAt` é obrigatório nas queries de despesas e manutenções (sem ele, o backend retorna "unknown").

Cron a cada 3 horas via pg_cron + pg_net. Botão **Sincronizar agora** dispara manualmente.

### Webposto (combustível)

Edge Function `sync-webposto-fuelings` consome a API REST do Quality/Webposto com paginação por cursor (`ultimoCodigo`). Faz **backfill com auto-encadeamento** (`EdgeRuntime.waitUntil`) para varrer centenas de milhares de vendas em background, filtrando só as placas da frota. Estado entre execuções persistido em `sync_state`.

---

## Deploy na Vercel

1. Importe o repositório em [vercel.com/new](https://vercel.com/new).
2. Adicione as variáveis: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Deploy. Cada `git push` na `main` redeploya automaticamente.

O `vercel.json` já configura o SPA fallback (qualquer rota cai no `index.html`, e o app lê a URL para abrir na aba certa).

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 5173) |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Pré-visualização do build |

---

## Roadmap

- [ ] Migrar Tailwind do CDN para build local
- [ ] Recuperação de senha self-service ("esqueci minha senha")
- [ ] Exportação de relatórios em PDF (CSV já disponível no Rateio)
- [ ] App mobile (PWA)
- [ ] Auditoria de ações por usuário

---

## Troubleshooting

**"relation does not exist"** — falta rodar `schema.sql` no Supabase.

**Tela branca após login** — verifique se as Edge Functions estão deployadas e se o usuário tem uma linha em `profiles` com `active = true`.

**Convite não chega** — confira no Supabase Auth as **URL Configuration** (Site URL e Redirect URLs precisam apontar para a URL real do app); o email pode estar na caixa de spam.

**"Variáveis de ambiente VITE_SUPABASE_* não definidas"** — falta `.env` (ou faltam as vars nos ambientes Preview/Production da Vercel).

**Sync da Infleet retorna "unknown"** — a query de despesas/manutenções precisa do filtro `occurredAt` com `startAt` e `endAt`; já está configurado nas Edge Functions.

---

## Licença

Projeto privado. Todos os direitos reservados.
