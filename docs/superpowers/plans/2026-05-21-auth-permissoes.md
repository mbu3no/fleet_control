# Autenticacao e permissoes — Plano de implementacao

> **Para quem vai executar:** use a sub-skill superpowers:subagent-driven-development
> (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa.
> Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Goal:** Fechar o Fleet Control com login, onboarding por convite e tres papeis
(admin / editor / visualizador), com permissoes aplicadas no banco via RLS.

**Architecture:** Supabase Auth para login e convites; tabela `profiles` guarda
papel e paginas permitidas de cada usuario; uma Edge Function envia os convites;
o front-end React ganha um contexto de autenticacao, telas de Login e Definir
senha, e uma aba Usuarios. RLS so e ligada no final, apos os testes.

**Tech Stack:** React 18 + Vite, Supabase (Postgres, Auth, Edge Functions Deno),
Tailwind via CDN, lucide-react.

**Especificacao:** `docs/superpowers/specs/2026-05-21-auth-permissoes-design.md`

---

## Observacoes para o executor

- Este projeto NAO tem framework de testes automatizados. A verificacao de cada
  tarefa usa: checagem de sintaxe, build de producao, consultas SQL e teste
  manual. Commits frequentes.
- Ambiente Windows. Node em `C:/Program Files/nodejs/node.exe`, npm em
  `C:/Program Files/nodejs/npm.cmd`. Se `node`/`npm` no PATH funcionarem, use-os.
- Checagem de sintaxe de um arquivo JS/JSX:
  `node -e "require('@babel/parser').parse(require('fs').readFileSync('CAMINHO','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`
- Build: `npm run build` (na raiz do projeto).
- SQL e configuracoes do Supabase sao passos MANUAIS — o executor descreve o que
  o usuario deve fazer no painel/SQL Editor e aguarda confirmacao.
- Sem emojis em codigo, commits ou documentos. Sem referencias a ferramentas de
  IA em nenhum lugar.
- Projeto Supabase: `cfikehpzbyyqscigfwwl`.

## Ordem e seguranca

As tarefas 1 a 13 NAO trancam o app — podem ser feitas e publicadas com
seguranca. A RLS so e ligada na tarefa 14. Se algo quebrar na 14, basta rodar
`ALTER TABLE ... DISABLE ROW LEVEL SECURITY` para reverter.

## Mapa de arquivos

Criar:
- `auth-profiles-setup.sql` — tabela `profiles` + funcao de papel + RLS de profiles
- `auth-rls-enable.sql` — liga RLS nas tabelas de dados (passo final)
- `supabase/functions/invite-user/index.ts` — Edge Function de convite
- `src/lib/recovery.js` — captura, no carregamento, se a URL e de convite
- `src/lib/auth.jsx` — contexto de autenticacao + helpers de permissao
- `src/pages/Login.jsx` — tela de login
- `src/pages/SetPassword.jsx` — tela de definir senha (convidado)
- `src/pages/Users.jsx` — aba Usuarios

Modificar:
- `src/lib/supabase.js` — habilitar sessao persistente
- `src/main.jsx` — envolver o app com `AuthProvider` e importar `recovery.js`
- `src/App.jsx` — gate de autenticacao, menu, filtro de paginas, gate de acoes
- `schema.sql` — documentar a nova tabela `profiles`

---

## Task 1: Tabela profiles e funcao de papel (SQL)

**Files:**
- Create: `auth-profiles-setup.sql`

- [ ] **Step 1: Criar o arquivo SQL**

Criar `auth-profiles-setup.sql` na raiz do projeto:

```sql
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
```

- [ ] **Step 2: Pedir ao usuario para rodar no Supabase**

Instruir: abrir o projeto `cfikehpzbyyqscigfwwl` no Supabase, SQL Editor, New
query, colar o conteudo de `auth-profiles-setup.sql`, Run.
Esperado na saida: `status = profiles criada`, `total_perfis = 0`.
Aguardar a confirmacao do usuario.

- [ ] **Step 3: Commit**

```bash
git add auth-profiles-setup.sql
git commit -m "feat: tabela profiles e funcao de papel para autenticacao"
```

---

## Task 2: Primeiro usuario admin

**Files:** nenhum (passos manuais no painel do Supabase)

- [ ] **Step 1: Obter os dados do admin**

Perguntar ao usuario: qual email e qual nome do primeiro administrador, e qual
senha inicial ele quer usar (minimo 6 caracteres). Aguardar a resposta.

- [ ] **Step 2: Criar o usuario no Supabase Auth**

Instruir o usuario: Supabase > Authentication > Users > botao "Add user".
Preencher email e a senha inicial. Marcar "Auto Confirm User". Criar.
Depois, na lista de usuarios, copiar o UID (UUID) do usuario recem-criado.

- [ ] **Step 3: Criar a linha em profiles**

Instruir: SQL Editor, rodar a query abaixo trocando os tres valores entre `<>`
pelos dados reais (UID copiado, email e nome):

```sql
INSERT INTO public.profiles (id, email, name, role, allowed_pages, active)
VALUES ('<UID>', '<email>', '<nome>', 'admin', ARRAY['*'], TRUE);

SELECT id, email, name, role FROM public.profiles;
```

Esperado: 1 linha, `role = admin`. Aguardar confirmacao.

- [ ] **Step 4: Sem commit**

Esta tarefa nao altera arquivos do repositorio.

---

## Task 3: Edge Function invite-user

**Files:**
- Create: `supabase/functions/invite-user/index.ts`

- [ ] **Step 1: Criar a Edge Function**

Criar `supabase/functions/invite-user/index.ts`:

```ts
// =====================================================================
// Edge Function: invite-user
// Convida um novo usuario. Apenas admins podem chamar.
// Cria o usuario no Supabase Auth (com email de convite) e o registro
// correspondente em profiles.
// =====================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Identificar quem chamou, pelo token do header Authorization
    const authHeader = req.headers.get("Authorization") || "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ ok: false, error: "Nao autenticado" }, 401);

    // 2. Confirmar que o chamador e admin ativo
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role, active")
      .eq("id", caller.id)
      .maybeSingle();
    if (!callerProfile || callerProfile.role !== "admin" || !callerProfile.active) {
      return json({ ok: false, error: "Apenas administradores podem convidar" }, 403);
    }

    // 3. Ler e validar o corpo
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const name = (body.name || "").trim() || null;
    const role = body.role;
    const allowedPages = Array.isArray(body.allowed_pages) ? body.allowed_pages : [];
    const redirectTo = body.redirectTo || undefined;
    if (!email) return json({ ok: false, error: "Email obrigatorio" }, 400);
    if (!["admin", "editor", "viewer"].includes(role)) {
      return json({ ok: false, error: "Papel invalido" }, 400);
    }

    // 4. Convidar via Supabase Auth (envia o email de convite)
    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteErr || !invited?.user) {
      return json({ ok: false, error: inviteErr?.message || "Falha ao convidar" }, 400);
    }

    // 5. Criar o registro em profiles
    const { error: profileErr } = await admin.from("profiles").insert({
      id: invited.user.id,
      email,
      name,
      role,
      allowed_pages: allowedPages,
      active: true,
    });
    if (profileErr) {
      return json({ ok: false, error: profileErr.message }, 400);
    }

    return json({ ok: true, user_id: invited.user.id });
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
```

- [ ] **Step 2: Verificar sintaxe**

A Edge Function roda em Deno; nao ha checagem local simples. Conferir
visualmente que o arquivo abre e fecha chaves corretamente e que nao ha
import faltando.

- [ ] **Step 3: Pedir ao usuario para publicar a funcao**

Instruir: Supabase > Edge Functions > Create a new function (ou Deploy),
nome exato `invite-user`, colar o conteudo do arquivo, Deploy.
Os secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
sao injetados automaticamente pelo Supabase — nao precisa configurar.
Aguardar confirmacao de que o deploy concluiu.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/invite-user/index.ts
git commit -m "feat: Edge Function de convite de usuarios"
```

---

## Task 4: Habilitar sessao persistente no cliente Supabase

**Files:**
- Modify: `src/lib/supabase.js`

- [ ] **Step 1: Editar a configuracao do cliente**

Em `src/lib/supabase.js`, trocar o bloco de criacao do cliente. De:

```js
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
```

Para:

```js
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
```

- [ ] **Step 2: Verificar sintaxe**

Run: `node -e "require('@babel/parser').parse(require('fs').readFileSync('src/lib/supabase.js','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`
Esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.js
git commit -m "feat: habilita sessao persistente no cliente Supabase"
```

---

## Task 5: Modulo de captura de URL de convite

**Files:**
- Create: `src/lib/recovery.js`

O Supabase, ao detectar o token de convite na URL, limpa o hash. Este modulo
captura essa informacao no carregamento, antes da limpeza.

- [ ] **Step 1: Criar o arquivo**

Criar `src/lib/recovery.js`:

```js
// Captura, no carregamento da pagina, se a URL e de convite ou recuperacao
// de senha. Precisa ser avaliado antes do supabase-js limpar o hash da URL,
// por isso e importado logo no inicio do main.jsx.
const hash = typeof window !== 'undefined' ? window.location.hash : '';
export const isPasswordSetupUrl = /type=(invite|recovery)/.test(hash);
```

- [ ] **Step 2: Verificar sintaxe**

Run: `node -e "require('@babel/parser').parse(require('fs').readFileSync('src/lib/recovery.js','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`
Esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/lib/recovery.js
git commit -m "feat: captura de URL de convite no carregamento"
```

---

## Task 6: Contexto de autenticacao

**Files:**
- Create: `src/lib/auth.jsx`

- [ ] **Step 1: Criar o contexto**

Criar `src/lib/auth.jsx`:

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext(null);

// Paginas que o admin pode liberar por usuario (alimenta o formulario de convite).
// 'settings' e 'users' nao entram aqui: sao areas exclusivas de admin.
export const PAGE_KEYS = [
  { key: 'dashboard', label: 'Visao geral' },
  { key: 'vehicles', label: 'Veiculos' },
  { key: 'reservations', label: 'Reservas' },
  { key: 'fuelings', label: 'Abastecimentos' },
  { key: 'maintenances', label: 'Manutencoes' },
  { key: 'expenses', label: 'Despesas' },
  { key: 'drivers', label: 'Motoristas' },
  { key: 'trips', label: 'Viagens' },
  { key: 'costs', label: 'Custos' },
  { key: 'allocation', label: 'Rateio' },
];

// O usuario pode ver/abrir esta pagina?
// allowedPages com '*' significa todas. Admin sempre ve tudo.
export function canSeePage(pageKey, role, allowedPages) {
  if (role === 'admin') return true;
  if (pageKey === 'users' || pageKey === 'settings') return false;
  if (!allowedPages) return false;
  return allowedPages.includes('*') || allowedPages.includes(pageKey);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function applySession(sess) {
      if (!mounted) return;
      if (!sess) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sess.user.id)
        .maybeSingle();
      if (!mounted) return;
      if (error || !data || !data.active) {
        // sem perfil ou conta desativada: desloga
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
      } else {
        setSession(sess);
        setProfile(data);
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      applySession(sess);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const role = profile?.role || null;
  const value = {
    session,
    profile,
    loading,
    role,
    isAdmin: role === 'admin',
    canWrite: role === 'admin' || role === 'editor',
    canDelete: role === 'admin',
    allowedPages: profile?.allowed_pages || [],
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
```

- [ ] **Step 2: Verificar sintaxe**

Run: `node -e "require('@babel/parser').parse(require('fs').readFileSync('src/lib/auth.jsx','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`
Esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.jsx
git commit -m "feat: contexto de autenticacao e helpers de permissao"
```

---

## Task 7: Tela de Login

**Files:**
- Create: `src/pages/Login.jsx`

- [ ] **Step 1: Criar a tela**

Criar `src/pages/Login.jsx`:

```jsx
import React, { useState } from 'react';
import { Car, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) setError('Email ou senha incorretos');
    // sucesso: o onAuthStateChange do AuthProvider faz a transicao
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
            <Car size={20} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="text-base font-semibold text-white tracking-tight">Fleet Control</div>
            <div className="text-[10px] text-slate-500">Gestao integrada</div>
          </div>
        </div>
        <form onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h1 className="text-sm font-semibold text-white">Entrar</h1>
          <div>
            <label className="text-[11px] text-slate-400 uppercase tracking-wide">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              autoComplete="email" />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 uppercase tracking-wide">Senha</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
              autoComplete="current-password" />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            Entrar
          </button>
        </form>
        <p className="text-[11px] text-slate-600 text-center mt-4">
          Acesso somente por convite do administrador.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar sintaxe**

Run: `node -e "require('@babel/parser').parse(require('fs').readFileSync('src/pages/Login.jsx','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`
Esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Login.jsx
git commit -m "feat: tela de login"
```

---

## Task 8: Tela de Definir senha

**Files:**
- Create: `src/pages/SetPassword.jsx`

O convidado cai aqui pelo link do email. O supabase-js ja estabeleceu uma
sessao a partir do token da URL; aqui ele so define a senha.

- [ ] **Step 1: Criar a tela**

Criar `src/pages/SetPassword.jsx`:

```jsx
import React, { useState } from 'react';
import { Car, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase.js';

export function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('A senha precisa ter ao menos 8 caracteres'); return; }
    if (password !== confirm) { setError('As senhas nao conferem'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError('Nao foi possivel definir a senha. O link pode ter expirado; peca um novo convite.');
      return;
    }
    setDone(true);
  }

  function goToApp() {
    window.location.hash = '';
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
            <Car size={20} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="text-base font-semibold text-white tracking-tight">Fleet Control</div>
            <div className="text-[10px] text-slate-500">Gestao integrada</div>
          </div>
        </div>

        {done ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-4">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
            <p className="text-sm text-white">Senha definida com sucesso.</p>
            <button onClick={goToApp}
              className="w-full py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium transition-colors">
              Entrar no Fleet Control
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h1 className="text-sm font-semibold text-white">Definir sua senha</h1>
            <div>
              <label className="text-[11px] text-slate-400 uppercase tracking-wide">Nova senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                autoComplete="new-password" />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 uppercase tracking-wide">Confirmar senha</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                autoComplete="new-password" />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Definir senha
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar sintaxe**

Run: `node -e "require('@babel/parser').parse(require('fs').readFileSync('src/pages/SetPassword.jsx','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`
Esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/pages/SetPassword.jsx
git commit -m "feat: tela de definir senha para convidados"
```

---

## Task 9: Gate de autenticacao no App

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`

O `App` atual passa a ser o conteudo logado (`FleetApp`). Um novo `App` fino
decide entre Login, Definir senha, tela de carregando e `FleetApp`.

- [ ] **Step 1: Envolver o app com AuthProvider no main.jsx**

Abrir `src/main.jsx`. Adicionar, como PRIMEIRA linha do arquivo:

```js
import './lib/recovery.js';
```

Importar o `AuthProvider` junto aos outros imports:

```js
import { AuthProvider } from './lib/auth.jsx';
```

Envolver o `<App />` renderizado com `<AuthProvider>`. Exemplo do resultado
(ajustar ao que ja existir no arquivo):

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Renomear o App atual para FleetApp**

Em `src/App.jsx`, localizar a linha:

```js
export default function App() {
```

Trocar por:

```js
function FleetApp() {
```

(remove o `export default`; o componente continua identico no resto).

- [ ] **Step 3: Adicionar imports do gate no topo do App.jsx**

Logo apos os imports existentes em `src/App.jsx`, adicionar:

```js
import { useAuth } from './lib/auth.jsx';
import { isPasswordSetupUrl } from './lib/recovery.js';
import { LoginPage } from './pages/Login.jsx';
import { SetPasswordPage } from './pages/SetPassword.jsx';
```

(`Loader2` ja e importado no bloco de icones do topo do arquivo e fica
disponivel para o novo `App` — nao precisa importar de novo.)

- [ ] **Step 4: Adicionar o novo App no fim do arquivo**

No FINAL de `src/App.jsx`, apos o fechamento de `FleetApp`, adicionar:

```jsx
function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 size={14} className="animate-spin" />
        Carregando
      </div>
    </div>
  );
}

export default function App() {
  const { session, profile, loading } = useAuth();

  // Link de convite/recuperacao: define a senha, independente de sessao
  if (isPasswordSetupUrl) return <SetPasswordPage />;

  if (loading) return <AuthLoadingScreen />;
  if (!session || !profile) return <LoginPage />;

  return <FleetApp />;
}
```

- [ ] **Step 5: Verificar sintaxe e build**

Run: `node -e "require('@babel/parser').parse(require('fs').readFileSync('src/App.jsx','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`
Esperado: `OK`

Run: `npm run build`
Esperado: build conclui sem erro.

- [ ] **Step 6: Commit**

```bash
git add src/main.jsx src/App.jsx
git commit -m "feat: gate de autenticacao com login e definir senha"
```

---

## Task 10: Aba Usuarios

**Files:**
- Create: `src/pages/Users.jsx`

- [ ] **Step 1: Criar a aba Usuarios**

Criar `src/pages/Users.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { UserPlus, Pencil, Loader2, X, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { PAGE_KEYS, useAuth } from '../lib/auth.jsx';
import { PageHeader, EmptyState } from '../components/ui.jsx';

const ROLE_LABELS = { admin: 'Admin', editor: 'Editor', viewer: 'Visualizador' };
const ROLE_ORDER = ['admin', 'editor', 'viewer'];

export function UsersView({ showToast }) {
  const { profile: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'invite' | { ...user } para editar

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles').select('*').order('created_at');
    if (error) showToast('error', 'Erro', 'Nao foi possivel carregar os usuarios');
    else setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(u) {
    if (u.id === me.id) {
      showToast('error', 'Acao bloqueada', 'Voce nao pode desativar a si mesmo');
      return;
    }
    const { error } = await supabase
      .from('profiles').update({ active: !u.active }).eq('id', u.id);
    if (error) { showToast('error', 'Erro', error.message); return; }
    showToast('success', u.active ? 'Usuario desativado' : 'Usuario reativado', '');
    load();
  }

  return (
    <div>
      <PageHeader title="Usuarios" count={users.length}
        onAdd={() => setModal('invite')} addLabel="Convidar" />

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-10 justify-center">
          <Loader2 size={14} className="animate-spin" /> Carregando
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={ShieldCheck} text="Nenhum usuario ainda. Use Convidar." />
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-[11px] text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Nome</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Papel</th>
                <th className="text-left px-4 py-2.5">Paginas</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-slate-800">
                  <td className="px-4 py-2.5 text-white">{u.name || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-400">{u.email}</td>
                  <td className="px-4 py-2.5 text-slate-300">{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="px-4 py-2.5 text-slate-400">
                    {u.role === 'admin'
                      ? 'Todas'
                      : (u.allowed_pages || []).includes('*')
                        ? 'Todas'
                        : `${(u.allowed_pages || []).length} pagina(s)`}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={u.active ? 'text-emerald-400' : 'text-slate-500'}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setModal({ ...u })}
                      className="w-8 h-8 rounded-lg hover:bg-slate-800 inline-flex items-center justify-center text-slate-400">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => toggleActive(u)}
                      className="ml-1 text-[11px] px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
                      {u.active ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <UserModal
          mode={modal === 'invite' ? 'invite' : 'edit'}
          user={modal === 'invite' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function UserModal({ mode, user, onClose, onSaved, showToast }) {
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'viewer');
  const initialPages = user?.allowed_pages || [];
  const [allPages, setAllPages] = useState(initialPages.includes('*'));
  const [pages, setPages] = useState(initialPages.filter(p => p !== '*'));
  const [saving, setSaving] = useState(false);

  function togglePage(key) {
    setPages(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);
  }

  function buildAllowedPages() {
    if (role === 'admin') return ['*'];
    return allPages ? ['*'] : pages;
  }

  async function handleSave() {
    if (mode === 'invite' && !email.trim()) {
      showToast('error', 'Erro', 'Email obrigatorio'); return;
    }
    setSaving(true);
    const allowed_pages = buildAllowedPages();
    if (mode === 'invite') {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: email.trim(),
          name: name.trim(),
          role,
          allowed_pages,
          redirectTo: window.location.origin,
        },
      });
      setSaving(false);
      if (error || !data?.ok) {
        showToast('error', 'Erro ao convidar', data?.error || error?.message || 'Falha');
        return;
      }
      showToast('success', 'Convite enviado', `Email enviado para ${email.trim()}`);
      onSaved();
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim() || null, role, allowed_pages })
        .eq('id', user.id);
      setSaving(false);
      if (error) { showToast('error', 'Erro', error.message); return; }
      showToast('success', 'Usuario atualizado', '');
      onSaved();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            {mode === 'invite' ? 'Convidar usuario' : 'Editar usuario'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wide">Email</label>
          <input type="email" value={email} disabled={mode === 'edit'}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-violet-500 disabled:opacity-50" />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wide">Nome</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wide">Papel</label>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-violet-500">
            {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        {role !== 'admin' && (
          <div>
            <label className="text-[11px] text-slate-400 uppercase tracking-wide">Paginas que pode ver</label>
            <label className="flex items-center gap-2 mt-2 text-sm text-slate-300">
              <input type="checkbox" checked={allPages}
                onChange={e => setAllPages(e.target.checked)} />
              Todas as paginas
            </label>
            {!allPages && (
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {PAGE_KEYS.map(p => (
                  <label key={p.key} className="flex items-center gap-2 text-xs text-slate-400">
                    <input type="checkbox" checked={pages.includes(p.key)}
                      onChange={() => togglePage(p.key)} />
                    {p.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {role === 'admin' && (
          <p className="text-[11px] text-slate-500">Admin sempre ve todas as paginas.</p>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          {mode === 'invite' ? 'Enviar convite' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Conferir o PageHeader**

Abrir `src/components/ui.jsx` e localizar o componente `PageHeader`. Confirmar
que ele aceita `onAdd` e uma label de botao. Se a prop de label tiver outro
nome (ex.: nao existir `addLabel`), ajustar a chamada em `Users.jsx` para o
nome real, ou passar so `onAdd`. Se o botao de adicionar so aparece quando
`onAdd` e definido, nada mais a fazer aqui.

- [ ] **Step 3: Verificar sintaxe**

Run: `node -e "require('@babel/parser').parse(require('fs').readFileSync('src/pages/Users.jsx','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`
Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Users.jsx
git commit -m "feat: aba de gerenciamento de usuarios"
```

---

## Task 11: Menu, filtro de paginas e item Usuarios

**Files:**
- Modify: `src/App.jsx`

Tudo nesta tarefa e dentro do componente `FleetApp`.

- [ ] **Step 1: Importar dependencias de auth no FleetApp**

Confirmar que `src/App.jsx` ja importa `useAuth` (feito na Task 9). Adicionar
ao import de `./lib/auth.jsx` os nomes `canSeePage`:

```js
import { useAuth, canSeePage } from './lib/auth.jsx';
```

Importar a aba Usuarios junto aos outros imports de paginas:

```js
import { UsersView } from './pages/Users.jsx';
```

- [ ] **Step 2: Ler o auth dentro do FleetApp**

Logo no inicio de `function FleetApp() {`, junto aos outros `useState`,
adicionar:

```js
  const { role, allowedPages, isAdmin, profile: currentUser, signOut } = useAuth();
```

- [ ] **Step 3: Filtrar o menu por paginas permitidas**

Localizar o array `mainNav` (atualmente comeca em `const mainNav = [`).
Logo APOS a definicao de `mainNav` e `settingsNav`, adicionar:

```js
  const visibleNav = mainNav.filter(item => canSeePage(item.id, role, allowedPages));
```

Na renderizacao do menu, trocar `mainNav.map(item => {` por
`visibleNav.map(item => {`.

- [ ] **Step 4: Adicionar o item Usuarios ao menu (so admin)**

No `<nav>` do menu lateral, logo apos o bloco `<div className="space-y-1">`
que renderiza `visibleNav`, adicionar um item condicional para admin. Inserir
dentro do mesmo container de itens, apos o `.map`:

```jsx
                {isAdmin && (
                  <button onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-sm transition-colors duration-150 border-l-2 ${activeTab === 'users' ? 'border-violet-400 text-white bg-slate-800/40' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'}`}>
                    <Users size={16} strokeWidth={2} /><span className="font-medium">Usuarios</span>
                  </button>
                )}
```

(`Users` ja esta importado de lucide-react no topo do arquivo.)

- [ ] **Step 5: Renderizar a aba Usuarios**

No `<main>`, junto aos outros blocos `{activeTab === '...' && ...}`, adicionar:

```jsx
            {activeTab === 'users' && isAdmin && <UsersView showToast={showToast} />}
```

- [ ] **Step 6: Restringir a engrenagem de Configuracoes a admin**

Ha dois botoes que chamam `setActiveTab('settings')` (um no header mobile,
um no header desktop). Envolver cada um com `{isAdmin && ( ... )}` para que
so admins vejam a engrenagem. O bloco `{activeTab === 'settings' && (` na
area `<main>` tambem deve ser protegido: trocar por
`{activeTab === 'settings' && isAdmin && (`.

- [ ] **Step 7: Proteger contra aba nao permitida**

Logo apos a linha do `useAuth` no FleetApp (Step 2), adicionar um efeito que
volta para uma pagina valida se a aba atual nao for permitida. O efeito e
auto-contido (nao depende de `mainNav`, que e definido mais abaixo):

```js
  useEffect(() => {
    const PAGES = ['dashboard', 'vehicles', 'reservations', 'fuelings',
      'maintenances', 'expenses', 'drivers', 'trips', 'costs', 'allocation'];
    const adminOnly = activeTab === 'users' || activeTab === 'settings';
    if (adminOnly) {
      if (!isAdmin) setActiveTab('dashboard');
      return;
    }
    if (!canSeePage(activeTab, role, allowedPages)) {
      const first = PAGES.find(p => canSeePage(p, role, allowedPages));
      setActiveTab(first || 'dashboard');
    }
  }, [activeTab, role, isAdmin, allowedPages]);
```

- [ ] **Step 8: Adicionar usuario logado e botao Sair no rodape do menu**

No rodape do `<aside>`, no bloco que hoje mostra "Conectado ao Supabase",
adicionar abaixo dele a identificacao e o botao de sair:

```jsx
              <div className="mt-2 flex items-center justify-between gap-2 px-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-300 truncate">{currentUser?.name || currentUser?.email}</div>
                  <div className="text-[10px] text-slate-600 capitalize">{role}</div>
                </div>
                <button onClick={signOut}
                  className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
                  Sair
                </button>
              </div>
```

- [ ] **Step 9: Verificar sintaxe e build**

Run: `node -e "require('@babel/parser').parse(require('fs').readFileSync('src/App.jsx','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`
Esperado: `OK`

Run: `npm run build`
Esperado: build conclui sem erro.

- [ ] **Step 10: Commit**

```bash
git add src/App.jsx
git commit -m "feat: menu filtrado por papel, aba Usuarios e botao sair"
```

---

## Task 12: Gate de acoes por papel

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/ui.jsx`
- Modify: `src/pages/Expenses.jsx`
- Modify: `src/pages/Reservations.jsx`

A protecao real e a RLS (Task 13). Esta tarefa impede acoes na interface e
esconde botoes que o usuario nao pode usar.

- [ ] **Step 1: Bloquear criar/editar e excluir nos handlers centrais**

Em `src/App.jsx`, no componente `FleetApp`, localizar `openModal` e
`removeItem`. Trocar por:

```js
  const openModal = (type, data = {}) => {
    if (!canWrite) { showToast('error', 'Sem permissao', 'Voce nao pode criar ou editar registros'); return; }
    setShowModal(type); setFormData(data);
  };
```

```js
  const removeItem = (table, id, label) => {
    if (!canDelete) { showToast('error', 'Sem permissao', 'Apenas administradores podem excluir'); return; }
    setConfirmDialog({
      title: `Excluir ${label.toLowerCase()}`,
      message: `Esta acao nao pode ser desfeita. Tem certeza?`,
      confirmLabel: 'Excluir',
      confirmTone: 'rose',
      onConfirm: async () => {
        try {
          await deleteRow(table, id);
          showToast('success', `${label} excluido!`, '');
          await loadAll();
        } catch (e) {
          showToast('error', 'Erro ao excluir', e.message, 0);
        }
      }
    });
  };
```

Adicionar `canWrite` e `canDelete` a desestruturacao do `useAuth` feita na
Task 11 Step 2:

```js
  const { role, allowedPages, isAdmin, canWrite, canDelete, profile: currentUser, signOut } = useAuth();
```

- [ ] **Step 2: Esconder o botao adicionar do PageHeader quando nao pode escrever**

Em `src/components/ui.jsx`, no componente `PageHeader`, garantir que o botao
de adicionar so renderize quando `onAdd` for uma funcao. Se ele ja faz isso,
nenhuma mudanca aqui. Se renderiza sempre, envolver o botao com
`{onAdd && ( ... )}`.

Em `src/App.jsx`, em cada uso de `<PageHeader ... onAdd={() => openModal(...)} />`,
trocar `onAdd` para condicional. Padrao:

```jsx
onAdd={canWrite ? () => openModal('vehicle') : undefined}
```

Aplicar nos PageHeader das secoes: `vehicles`, `fuelings`, `maintenances`,
`drivers`, `trips`, e nas secoes de `companies` e `costCenters` dentro de
`settings`. (Localizar cada `<PageHeader` e ajustar o `onAdd`.)

- [ ] **Step 3: Esconder os icones de editar/excluir nas tabelas inline**

Em `src/App.jsx`, nas secoes renderizadas inline (`vehicles`, `fuelings`,
`maintenances`, `drivers`, `trips`, `companies`, `costCenters`), cada linha
tem botoes com `<Pencil />` (chama `openModal`) e `<Trash2 />` (chama
`removeItem`). Para cada um:

- Envolver o botao de `<Pencil />` com `{canWrite && ( ... )}`.
- Envolver o botao de `<Trash2 />` com `{canDelete && ( ... )}`.

- [ ] **Step 4: Passar permissoes para ExpensesView e ReservationsView**

Em `src/App.jsx`, na renderizacao dessas duas paginas, adicionar as props:

```jsx
{activeTab === 'expenses' && <ExpensesView vehicles={vehicles} expenses={expenses} insurances={insurances} openModal={openModal} removeItem={removeItem} getVehicleName={getVehicleName} onSyncInfleet={syncInfleet} syncingInfleet={syncingInfleet} canWrite={canWrite} canDelete={canDelete} />}
```

```jsx
{activeTab === 'reservations' && <ReservationsView vehicles={vehicles} reservations={reservations} openModal={openModal} removeItem={(id) => removeItem('reservations', id, 'Reserva')} updateStatus={updateReservationStatus} getVehicleName={getVehicleName} canWrite={canWrite} canDelete={canDelete} />}
```

- [ ] **Step 5: Aplicar o gate dentro de Expenses.jsx**

Em `src/pages/Expenses.jsx`, adicionar `canWrite` e `canDelete` aos parametros
de `ExpensesView`. Envolver os botoes de adicionar/editar com
`{canWrite && ( ... )}` e os de excluir com `{canDelete && ( ... )}`. Em
`PageHeader`, passar `onAdd` condicional como no Step 2.

- [ ] **Step 6: Aplicar o gate dentro de Reservations.jsx**

Em `src/pages/Reservations.jsx`, adicionar `canWrite` e `canDelete` aos
parametros de `ReservationsView`. Envolver botoes de adicionar/editar com
`{canWrite && ...}` e de excluir com `{canDelete && ...}`. A acao de mudar
status de reserva (`updateStatus`) e considerada edicao: envolver com
`{canWrite && ...}`.

- [ ] **Step 7: Verificar sintaxe e build**

Run, para cada arquivo modificado:
`node -e "require('@babel/parser').parse(require('fs').readFileSync('ARQUIVO','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`
Esperado: `OK` em todos.

Run: `npm run build`
Esperado: build conclui sem erro.

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/components/ui.jsx src/pages/Expenses.jsx src/pages/Reservations.jsx
git commit -m "feat: esconde e bloqueia acoes conforme o papel do usuario"
```

---

## Task 13: Teste manual antes de ligar a RLS

**Files:** nenhum (validacao)

Antes de ligar a RLS, validar todo o fluxo com o app publicado (ou rodando
local com `npm run dev`). A RLS ainda esta desligada, entao nada pode quebrar.

- [ ] **Step 1: Configurar URLs no Supabase Auth**

Instruir o usuario: Supabase > Authentication > URL Configuration.
- Site URL: a URL de producao do app (Vercel).
- Redirect URLs: adicionar a URL de producao e, se for testar local,
  `http://localhost:5173`.
Salvar.

- [ ] **Step 2: Testar login do admin**

O usuario abre o app. Deve aparecer a tela de Login. Entrar com o email e a
senha do primeiro admin (Task 2). Deve carregar o app normalmente, com a aba
Usuarios visivel no menu.

- [ ] **Step 3: Testar convite**

Na aba Usuarios, convidar um email de teste como `viewer` com algumas paginas.
Confirmar que chega o email, que o link abre a tela Definir senha, que apos
definir a senha o usuario entra, e que ele ve apenas as paginas liberadas,
sem botoes de criar/editar/excluir.

- [ ] **Step 4: Testar editor**

Convidar (ou editar) um usuario como `editor`. Confirmar que ele cria e edita
registros, mas nao ve botoes de excluir.

- [ ] **Step 5: Registrar o resultado**

Se algo falhar, corrigir antes de seguir para a Task 14. Nao ligar a RLS
enquanto o fluxo nao estiver 100 por cento.

---

## Task 14: Ligar a RLS nas tabelas de dados

**Files:**
- Create: `auth-rls-enable.sql`

Ponto de virada: apos esta tarefa, so usuarios logados acessam os dados.

- [ ] **Step 1: Criar o arquivo SQL**

Criar `auth-rls-enable.sql` na raiz do projeto:

```sql
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
```

- [ ] **Step 2: Pedir ao usuario para rodar o SQL**

Instruir: SQL Editor, colar `auth-rls-enable.sql`, Run.
Esperado: todas as tabelas listadas com `rls = true`. Aguardar confirmacao.

- [ ] **Step 3: Verificar o app logado**

Pedir ao usuario para recarregar o app ja logado como admin e confirmar que
os dados continuam aparecendo e que criar/editar/excluir funcionam.
Os crons de sync usam a service role e ignoram a RLS — continuam funcionando.

- [ ] **Step 4: Desativar o cadastro aberto**

Instruir: Supabase > Authentication > Sign In / Providers (ou Settings) >
desativar "Allow new users to sign up". Convites continuam funcionando
normalmente (o convite e feito pela service role).

- [ ] **Step 5: Commit**

```bash
git add auth-rls-enable.sql
git commit -m "feat: liga RLS nas tabelas de dados"
```

---

## Task 15: Atualizar a documentacao do schema

**Files:**
- Modify: `schema.sql`

- [ ] **Step 1: Remover as tabelas mortas do schema.sql**

Em `schema.sql`, na secao de criacao de tabelas, remover os blocos
`CREATE TABLE app_users (...)` e `CREATE TABLE user_invites (...)`.
Na secao de DROP do inicio, manter os `DROP TABLE IF EXISTS app_users` e
`user_invites` (nao atrapalham). Remover o `CREATE TRIGGER set_updated_at_app_users`
e o `ALTER TABLE app_users DISABLE ROW LEVEL SECURITY` e o
`ALTER TABLE user_invites DISABLE ROW LEVEL SECURITY`.

- [ ] **Step 2: Documentar a tabela profiles**

Ao final da secao de criacao de tabelas em `schema.sql`, adicionar um
comentario apontando para o arquivo de auth:

```sql
-- A tabela 'profiles' (autenticacao e permissoes) e criada por
-- auth-profiles-setup.sql. A RLS e ligada por auth-rls-enable.sql.
```

- [ ] **Step 3: Commit**

```bash
git add schema.sql
git commit -m "docs: atualiza schema apos remocao das tabelas de auth antigas"
```

---

## Revisao final (executor)

Apos a Task 15, conferir:

- O app exige login; sem sessao mostra a tela de Login.
- Convite chega por email, o convidado define a senha e entra.
- Admin ve tudo e a aba Usuarios; editor cria/edita mas nao exclui;
  visualizador so le; cada um ve apenas as paginas liberadas.
- RLS ativa em todas as tabelas de dados e em profiles.
- Cadastro aberto desativado no Supabase.
- Os crons de sync (Infleet e Webposto) continuam rodando.
