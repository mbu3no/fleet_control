# Fleet Control

Sistema de gestão de frotas construído do zero em **React + Supabase** — controle operacional (veículos, motoristas, viagens, abastecimentos, manutenções, despesas, seguros, reservas), análise financeira (custos por veículo, rateio proporcional por km, depreciação) e autenticação por convite com três papéis aplicados no banco via RLS.

Feito durante meu **estágio na Família Pires**. Rodou em **produção real** por meses gerenciando 4 veículos, 26 motoristas e mais de 13 mil viagens (com integrações automáticas Infleet e Webposto sincronizando a cada 3 horas). Depois a gestão de frotas foi consolidada dentro do **sistema interno unificado** da empresa — este deploy fica aqui como portfólio.

- **[Ver demo interativo](https://fleet-control-mu.vercel.app/?demo=1)** — abre o app com dados fictícios, dá pra clicar em tudo.
- **[Landing pública](https://fleet-control-mu.vercel.app)** — visão geral do projeto.

![Stack](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=white)
![Stack](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite&logoColor=white)
![Stack](https://img.shields.io/badge/Supabase-Postgres%20+%20Auth%20+%20Edge%20Functions-3ecf8e?logo=supabase&logoColor=white)
![Stack](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss&logoColor=white)
![Stack](https://img.shields.io/badge/Vercel-Deploy-000?logo=vercel&logoColor=white)

## O que faz

**Operação.** Cadastros de veículos, motoristas, viagens, abastecimentos, manutenções, despesas (IPVA, licenciamento, multas), seguros e reservas. Alertas escalonados de vencimentos (seguros 30/15d, IPVA 14/7d, revisões por km e data). Busca em todas as tabelas. Modal de confirmação em ações destrutivas.

**Análise financeira.**
- **Custos por veículo** — soma das 4 categorias (combustível, manutenção, despesas, seguro proporcional ao período) com custo/km.
- **Rateio** — distribuição proporcional por km em três níveis (empresa → motorista → veículo), com filtro de período/empresa, busca, ordenação e exportação CSV.
- **Depreciação linear** 20%/ano por veículo.
- **Dashboard** com KPIs do período (consumo médio, custo/km, composição do total), gráficos e ranking por veículo.

**Autenticação e permissões.** Login email/senha via **Supabase Auth**, entrada somente por convite — não existe cadastro aberto. Três papéis (`admin`, `editor`, `visualizador`) e páginas permitidas por usuário. Tudo aplicado no banco via **RLS**, então a chave pública sozinha não acessa nada.

**Integrações automáticas.**
- **Infleet** (telemetria, GraphQL) — veículos, motoristas, viagens, despesas e manutenções.
- **Webposto** (combustível, REST) — abastecimentos, com backfill em background das centenas de milhares de vendas históricas.

Ambos rodam a cada 3 horas via `pg_cron` + `pg_net` disparando Edge Functions.

## Destaques técnicos

**Onboarding por convite com validação server-side.** A Edge Function `invite-user` recebe o JWT do chamador, confirma que ele é admin ativo na tabela `profiles`, e só então usa a `service_role` do Supabase pra criar o usuário e inserir o perfil. O frontend nunca toca em chave de serviço.

**RLS por papel no Postgres.** Função SQL `current_user_role()` (`SECURITY DEFINER`) resolve o papel a partir do JWT sem gerar recursão de RLS ao ler `profiles`. Policies por tabela: `SELECT` para qualquer perfil ativo, `INSERT/UPDATE` para admin+editor, `DELETE` só admin.

**Backfill da Webposto com self-chaining.** A API do Webposto retorna vendas com paginação por cursor sem filtro por placa — pra achar os abastecimentos da frota precisou varrer centenas de milhares de vendas. Para fugir do timeout de 30s da Edge Function, cada rodada processa um lote, salva o cursor em `sync_state`, e **se re-invoca via `EdgeRuntime.waitUntil`** até alcançar o presente. O frontend recebe um status `caughtUp: false` enquanto o backfill roda em background.

**Descoberta do filtro obrigatório da Infleet.** `listMaintenances` retornava `"unknown"` mesmo com token válido. Via introspecção do schema GraphQL descobri que o filtro `occurredAt` (PeriodInput com `startAt`/`endAt`) é obrigatório na prática, apesar do schema marcar como opcional. Mesmo padrão vale pra `listExpenses`.

**Cálculos de data sem skew de timezone.** `new Date('2026-05-25')` é interpretado como UTC; ao comparar com `new Date()` (horário local BRT), a contagem de "dias até" deslocava em 1 dia. Centralizei em um helper `daysUntil()` que parseia como local, eliminando bugs sutis em todos os alertas de vencimento.

**URLs reais por página em SPA.** Cada aba tem sua URL (`/veiculos`, `/manutencoes`, `/rateio`, ...). Implementado com `pushState`/`popstate` nativos (sem react-router) e SPA fallback via `vercel.json` pra deep-linking funcionar.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 |
| UI | Tailwind CSS + Lucide Icons |
| Gráficos | Recharts |
| Backend | Supabase (Postgres + Auth + Edge Functions Deno) |
| Agendamento | pg_cron + pg_net |
| Deploy | Vercel (deploy automático no push da `main`) |

## Estrutura

```
src/
├── App.jsx              Layout, gate de auth, rotas, modais e handlers
├── lib/
│   ├── supabase.js      Cliente + helpers CRUD (com modo demo)
│   ├── auth.jsx         AuthProvider, useAuth, canSeePage
│   ├── demo-data.js     Dataset fake do modo demo
│   ├── demo-mode.js     Detecta ?demo=1
│   ├── format.js        daysUntil, formatLocalDate, busca normalizada
│   └── allocation.js    Cálculo de rateio + export CSV
├── components/ui.jsx    PageHeader, DataTable, Toast, ConfirmDialog, etc.
└── pages/               Dashboard, Costs, Allocation, Expenses, Reservations,
                         Depreciation, Login, SetPassword, Users, Landing

supabase/functions/
├── sync-infleet-vehicles/   GraphQL Infleet (5 entidades)
├── sync-webposto-fuelings/  REST Webposto com backfill encadeado
├── invite-user/             Convite com validação de admin
└── resend-invite/           Reenvio de convite / recuperação de senha

*.sql                     Migrations versionadas (schema, syncs, auth, RLS)
```

## Roadmap

- Recuperação de senha self-service (implementado depois do deploy inicial)
- Exportação de relatórios em PDF
- App mobile (PWA — implementado)
- Auditoria de ações por usuário

## Licença

Projeto privado.
