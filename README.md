# 🚗 Fleet Control

Sistema de gestão integrada de frotas — controle de veículos, motoristas, abastecimentos, manutenções, despesas, seguros, viagens e reservas — com dados em tempo real no Supabase.

![Stack](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=white)
![Stack](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite&logoColor=white)
![Stack](https://img.shields.io/badge/Supabase-2.45-3ecf8e?logo=supabase&logoColor=white)
![Stack](https://img.shields.io/badge/Tailwind-CDN-38bdf8?logo=tailwindcss&logoColor=white)

---

## ✨ Funcionalidades

- **Dashboard** com KPIs (veículos ativos, KM rodados, custos totais, custo por KM)
- **Veículos** — cadastro, status (disponível, em uso, manutenção), KM atual, valor de compra
- **Motoristas** — vínculo com empresa e centro de custo, CNH, contato
- **Abastecimentos** — litros, valor, KM no momento do abastecimento
- **Manutenções** — preventivas e corretivas, custo, próximo KM previsto
- **Viagens** — origem, destino, KM, motorista responsável
- **Despesas** — IPVA, licenciamento, multas, com data de vencimento
- **Seguros** — apólice, vigência, prêmio, cobertura, franquia, corretor
- **Reservas** — solicitações com status (pendente, aprovada, recusada)
- **Configurações** — empresas, centros de custo, usuários
- **Status visual** de conexão com o banco em tempo real
- **Notificações Toast** para feedback de ações (sucesso, erro)
- **Tema escuro** nativo, responsivo

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 (JSX) |
| UI | Tailwind CSS (via CDN) + Lucide Icons |
| Gráficos | Recharts |
| Backend | Supabase (PostgreSQL + REST + Auth) |
| Deploy | Vercel |

---

## 🚀 Como rodar localmente

### 1. Pré-requisitos

- [Node.js](https://nodejs.org/) 18+ (recomendado 20 LTS)
- npm 9+ (vem com o Node)
- Conta no [Supabase](https://supabase.com) (free tier)

### 2. Clone e instale

```bash
git clone https://github.com/mbu3no/fleet_control.git
cd fleet_control
npm install
```

### 3. Configure o Supabase

1. Crie um projeto novo no Supabase ([dashboard](https://supabase.com/dashboard))
2. No painel do projeto vá em **Settings → API** e copie:
   - **Project URL** (formato `https://xxxxxxxxxxx.supabase.co`)
   - **anon public key**
3. Vá em **SQL Editor → New query**
4. Cole TODO o conteúdo do arquivo [`schema.sql`](./schema.sql) e clique em **Run**
5. Confirme que o resultado mostra `total_tabelas: 12` e todas as permissões `anon_pode_*: true`

### 4. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> ⚠️ **NUNCA commite o arquivo `.env`** — ele já está no `.gitignore`. A `anon key` é pública por design (vai pro frontend mesmo), mas a `service_role key` **nunca** deve ir parar no código.

### 5. Rode o servidor de desenvolvimento

```bash
npm run dev
```

App abre automaticamente em `http://localhost:5173`. Se o badge "Conectado ao Supabase" aparecer no canto inferior esquerdo, está tudo certo.

---

## 📦 Estrutura do projeto

```
fleet-control/
├── index.html              # Entry HTML (Tailwind via CDN)
├── package.json            # Dependências e scripts
├── vite.config.js          # Configuração do Vite (porta 5173)
├── schema.sql              # Setup completo do banco (12 tabelas)
├── .env.example            # Template de variáveis de ambiente
├── .gitignore              # Protege .env e node_modules
└── src/
    ├── main.jsx            # Bootstrap React
    ├── App.jsx             # App completo (componentes + rotas)
    ├── index.css           # Estilos globais (scrollbar custom)
    └── lib/
        └── supabase.js     # Cliente Supabase + helpers (CRUD)
```

---

## 🗄️ Modelo de dados

12 tabelas em PostgreSQL. Principais relacionamentos:

```
companies ──┬── cost_centers
            └── drivers ──┐
                          ├── trips ── vehicles ──┬── fuelings
                          │                       ├── maintenances
                          │                       ├── expenses
                          │                       ├── insurances
                          │                       └── reservations
                          │
                          └── (FK opcional)

app_users      ── (futura autenticação)
user_invites   ── (futuros convites de usuário)
```

Todas as tabelas têm `created_at` e `updated_at` automáticos. Triggers de `updated_at` configurados via função `update_updated_at_column()`.

---

## ☁️ Deploy na Vercel

### Opção 1 — Via dashboard (recomendado)

1. Acesse [vercel.com/new](https://vercel.com/new)
2. **Import** o repositório `fleet_control`
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = `https://seu-projeto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = sua anon key
4. **Deploy** — em ~1 minuto sai a URL do tipo `fleet-control-xxx.vercel.app`

### Opção 2 — Via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

Cada `git push` na branch `main` dispara redeploy automático.

---

## 🔒 Segurança

Este projeto está configurado para **desenvolvimento e uso interno** com Row Level Security (RLS) **desabilitado**. Isso significa:

- ✅ Funciona out-of-the-box, sem configurar autenticação
- ⚠️ **Qualquer pessoa com a anon key consegue ler/escrever em todas as tabelas via API**
- ⚠️ **Não é apropriado para uso em produção pública** sem antes:
  1. Habilitar RLS em todas as tabelas: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
  2. Criar policies por tabela (ex: `CREATE POLICY "users own data" ON vehicles FOR ALL USING (auth.uid() = owner_id);`)
  3. Implementar autenticação Supabase Auth no app
  4. Usar a tabela `app_users` (já criada) para roles e permissões

Veja [docs do Supabase sobre RLS](https://supabase.com/docs/guides/auth/row-level-security).

---

## 🛠️ Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia servidor de desenvolvimento (porta 5173) |
| `npm run build` | Gera build de produção em `dist/` |
| `npm run preview` | Pré-visualiza o build de produção |

---

## 📋 Roadmap

- [ ] Autenticação multi-usuário com Supabase Auth
- [ ] RLS policies por empresa/cost center
- [ ] Sistema de convites (`user_invites` já está modelado)
- [ ] Migrar Tailwind do CDN para build local (otimização)
- [ ] Exportação de relatórios (CSV / PDF)
- [ ] Notificações de manutenção preventiva por KM
- [ ] Alertas de seguro vencendo
- [ ] App mobile (PWA)

---

## 🐛 Troubleshooting

### "Erro ao buscar companies: relation does not exist"
Você ainda não rodou o `schema.sql` no Supabase. Veja a seção [Configure o Supabase](#3-configure-o-supabase).

### "permission denied for table companies"
As permissões `GRANT` para o role `anon` não foram aplicadas. Rode o `schema.sql` por completo — ele cuida disso nas linhas 243-251.

### Tela em branco / erro de import
Verifique se o `.env` existe e tem as duas variáveis preenchidas. O cliente Supabase joga um erro claro no console se faltar alguma.

### Tailwind não aplica estilos
O Tailwind é carregado via CDN no `index.html`. Confirme que tem internet e que o `<script src="https://cdn.tailwindcss.com">` não está bloqueado por extensão de browser.

---

## 📄 Licença

Projeto privado. Todos os direitos reservados.
