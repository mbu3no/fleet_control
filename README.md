# Fleet Control

Sistema de gestão de frotas construído do zero — controle operacional (veículos, motoristas, viagens, abastecimentos, manutenções, despesas, seguros, reservas), análise financeira (custos por veículo, rateio proporcional por km, depreciação) e autenticação por convite com três papéis aplicados no banco via RLS.

Em produção e em uso real: **[fleet-control-mu.vercel.app](https://fleet-control-mu.vercel.app)** (acesso somente por convite).

![Stack](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=white)
![Stack](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite&logoColor=white)
![Stack](https://img.shields.io/badge/Supabase-Postgres%20+%20Edge%20Functions-3ecf8e?logo=supabase&logoColor=white)
![Stack](https://img.shields.io/badge/Vercel-Deploy-000?logo=vercel&logoColor=white)

---

## O que faz

**Operação**
Cadastros de veículos, motoristas, viagens, abastecimentos, manutenções, despesas (IPVA, licenciamento, multas), seguros, reservas. Alertas escalonados de vencimentos (seguros 30/15d, IPVA 14/7d, revisões por km e data). Busca em todas as tabelas. Modal de confirmação pra ações destrutivas.

**Análise financeira**
- **Custos por veículo** — soma das 4 categorias (combustível, manutenção, despesas, seguro proporcional ao período) com custo/km.
- **Rateio** — distribuição proporcional por km em três níveis (empresa → motorista → veículo), com filtro de período/empresa, busca, ordenação e exportação CSV.
- **Depreciação linear** 20%/ano por veículo.
- **Dashboard** com KPIs do período (consumo médio, custo/km, composição do total), gráficos e ranking por veículo.

**Autenticação e permissões**
- Login email/senha (Supabase Auth), entrada somente por convite — não existe cadastro aberto.
- Três papéis: **admin**, **editor**, **visualizador**. Editor cria e edita mas não exclui; visualizador é read-only.
- O admin escolhe, por usuário, **quais páginas** ele pode ver.
- Tudo aplicado no banco via **RLS** — a chave pública sozinha não acessa nada.

**Integrações**
- **Infleet** (telemetria, GraphQL): sincroniza veículos, motoristas, viagens, despesas e manutenções a cada 3 horas.
- **Webposto** (combustível, REST): sincroniza abastecimentos a cada 3 horas, com **backfill em background** das centenas de milhares de vendas históricas.

---

## Destaques técnicos

**Onboarding por convite com validação server-side**
A função `invite-user` (Edge Function) recebe o JWT do chamador, confirma que ele é admin ativo na tabela `profiles`, e só então usa a `service_role` pra criar o usuário no Supabase Auth e inserir o perfil. O frontend nunca toca em chave de serviço.

**RLS aplicada no banco**
Função SQL `current_user_role()` (`SECURITY DEFINER`) resolve o papel do usuário logado a partir do JWT. Policies por tabela:
- `SELECT`: qualquer perfil ativo.
- `INSERT / UPDATE`: `admin` ou `editor`.
- `DELETE`: somente `admin`.

A função evita recursão de RLS ao ler `profiles` de dentro das próprias policies.

**Backfill da Webposto com self-chaining**
A API do Webposto retorna vendas com paginação por cursor (`ultimoCodigo`) sem filtro por placa — pra encontrar os abastecimentos da frota precisa varrer milhares de vendas. Para não estourar o timeout de 30s da Edge Function, o sync processa um lote, salva o cursor em `sync_state`, e **se re-invoca via `EdgeRuntime.waitUntil`** até alcançar o ponto atual. O frontend recebe um status `caughtUp: false` enquanto o backfill roda em background e refaz o polling.

**Sync da Infleet — descoberta do filtro**
A query `listMaintenances` retornava `"unknown"` mesmo com o token correto. Via introspecção do schema GraphQL, descobri que o filtro `occurredAt` (PeriodInput com `startAt` e `endAt`) é **obrigatório na prática**, apesar do schema marcar como opcional. Mesmo padrão se aplica a `listExpenses`.

**Cálculos de data sem skew de timezone**
`new Date('2026-05-25')` é interpretado como UTC; ao comparar com `new Date()` (horário local BRT), o cálculo de "dias até" deslocava em 1 dia. Centralizei em um helper `daysUntil()` que parseia a string como local, eliminando bugs sutis em todos os alertas e contagens.

**URLs reais por página em SPA**
Cada aba tem sua URL (`/veiculos`, `/manutencoes`, `/rateio`...). Implementado com `pushState`/`popstate` nativos (sem react-router) e SPA fallback via `vercel.json` para deep-linking funcionar.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 |
| UI | Tailwind CSS + Lucide Icons |
| Gráficos | Recharts |
| Backend | Supabase (Postgres + Auth + Edge Functions Deno) |
| Agendamento | pg_cron + pg_net |
| Deploy | Vercel (deploy automático no push da `main`) |

---

## Estrutura

```
src/
├── App.jsx              Layout, gate de auth, rotas (pushState), modais e handlers
├── lib/
│   ├── supabase.js      Cliente + helpers CRUD
│   ├── auth.jsx         AuthProvider, useAuth, canSeePage
│   ├── format.js        daysUntil, formatLocalDate, busca normalizada
│   └── allocation.js    Calculo de rateio + export CSV
├── components/ui.jsx    PageHeader, DataTable, Toast, ConfirmDialog, etc.
└── pages/               Dashboard, Costs, Allocation, Expenses, Reservations,
                         Depreciation, Login, SetPassword, Users

supabase/functions/
├── sync-infleet-vehicles/   GraphQL Infleet (5 entidades)
├── sync-webposto-fuelings/  REST Webposto com backfill encadeado
└── invite-user/             Convite com validacao de admin

*.sql                     Migrations versionadas (schema, syncs, auth, RLS)
```

---

## Roadmap

- Recuperação de senha self-service
- Exportação de relatórios em PDF
- App mobile (PWA)
- Auditoria de ações por usuário

---

## Licença

Projeto privado.
