# Autenticacao e permissoes — Fleet Control

Data: 2026-05-21
Status: aprovado, pronto para planejamento

## 1. Contexto e objetivo

Hoje o Fleet Control esta aberto: qualquer pessoa com a URL (ou que leia a
chave publica do Supabase no DevTools) le, cria, edita e exclui qualquer dado.
RLS esta desligada nas tabelas.

Objetivo: fechar o acesso com login, onboarding por convite e tres niveis de
permissao, sem nunca derrubar o app durante a transicao.

## 2. Escopo

Dentro do escopo:

- Login com email e senha (Supabase Auth).
- Onboarding so por convite — nao existe cadastro aberto.
- Tres papeis: admin, editor, visualizador.
- Controle de paginas por usuario (quais paginas cada um ve).
- Aba Usuarios dentro do app (listar, convidar, editar papel/paginas, desativar).
- RLS ligada nas tabelas de dados, aplicando os papeis no banco.

Fora do escopo (pode vir depois):

- Recuperacao de senha self-service (link "esqueci a senha"). O fluxo de
  definir senha sera reaproveitavel para isso no futuro, mas nao entra agora.
- Exclusao definitiva de usuario (so havera desativar/reativar).
- Auditoria/log de acoes por usuario.
- Endurecer as Edge Functions de sync com checagem de papel (baixo risco; sao
  idempotentes e nao destrutivas). Fica como melhoria futura.
- Status "pendente" (convidado que ainda nao aceitou). YAGNI por enquanto.

## 3. Modelo de dados

### Tabela `profiles`

Uma linha por usuario. A chave primaria liga ao usuario do Supabase Auth.

| Campo | Tipo | Descricao |
|---|---|---|
| id | uuid, PK | Referencia `auth.users(id)`, `on delete cascade` |
| email | text, not null | Email do usuario |
| name | text | Nome de exibicao |
| role | text, not null | `admin` / `editor` / `viewer` — com CHECK. `viewer` e exibido como "visualizador" |
| allowed_pages | text[], not null, default `{}` | Paginas que o usuario ve |
| active | boolean, not null, default true | Liga/desliga o acesso |
| created_at | timestamptz, default now() | Criacao do registro |

Convencao de `allowed_pages`:

- Lista de chaves de pagina (ver secao 4).
- O elemento sentinela `*` significa "todas as paginas". O botao "tudo" no
  formulario de convite grava `{*}`. Assim, paginas novas adicionadas no futuro
  ficam automaticamente visiveis para quem tem `*`.
- Para `role = admin`, `allowed_pages` e ignorado: admin sempre ve tudo.

### Chaves de pagina

dashboard, vehicles, drivers, fuelings, maintenances, trips, expenses,
reservations, allocation, costs, depreciation, settings, users.

A pagina `users` e sempre exclusiva de admin, independente de `allowed_pages`.

### Funcao auxiliar de papel

Funcao SQL `public.current_user_role()`, `security definer`, `stable`:
retorna `role` da linha em `profiles` onde `id = auth.uid()` e `active = true`;
retorna `null` se o usuario nao tem perfil ativo. O `security definer` evita
recursao de RLS ao ler `profiles` de dentro das policies.

## 4. Papeis e permissoes

| Papel | Ver | Criar / Editar | Excluir | Gerenciar usuarios | Rodar syncs |
|---|---|---|---|---|---|
| admin | todas as paginas | sim | sim | sim | sim |
| editor | paginas permitidas | sim | nao | nao | sim |
| visualizador | paginas permitidas | nao | nao | nao | nao |

Duas camadas de aplicacao:

1. Capacidade (criar/editar/excluir) — aplicada no banco via RLS. Nao da pra
   burlar pelo DevTools.
2. Visibilidade de paginas (`allowed_pages`) — aplicada no front-end: o menu
   lateral so mostra paginas permitidas e a rota e bloqueada se acessada
   direto. E controle de organizacao, nao blindagem de dado bruto. A protecao
   real do dado e login + papel. Aceitavel para um time interno pequeno.

## 5. Componentes

### Front-end (React)

- `src/lib/supabase.js` — mudar `persistSession` e `autoRefreshToken` para
  `true` e habilitar `detectSessionInUrl` (necessario para o link do convite).
- Contexto de autenticacao — expoe sessao, perfil (papel, paginas, ativo) e
  helpers `can(acao)` para o app inteiro. Reage a `onAuthStateChange`.
- Pagina de Login — formulario email + senha.
- Pagina Definir senha — onde o convidado cai pelo link do email; define a
  propria senha via `updateUser({ password })`. Reaproveitavel para "esqueci a
  senha" no futuro.
- Gate de autenticacao no `App.jsx` — sem sessao mostra Login; com sessao
  carrega o perfil; se `active = false`, faz signout e avisa "conta
  desativada".
- Aba Usuarios — tabela de usuarios, formulario de convite, edicao de
  papel/paginas, desativar/reativar. Visivel so para admin.
- Aplicacao de permissao na UI — o menu lateral filtra por `allowed_pages`;
  botoes de criar/editar/excluir aparecem conforme o papel.

### Back-end (Supabase)

- Tabela `profiles` + funcao `current_user_role()`.
- Edge Function `invite-user` — recebe email, nome, papel e paginas; verifica
  que quem chamou e admin (le o JWT do chamador); usa a service role para
  chamar `auth.admin.inviteUserByEmail` e inserir a linha em `profiles`.
- Policies de RLS em todas as tabelas (ver secao 7).
- Configuracao do Supabase Auth — desativar cadastro aberto (signups);
  configurar a URL de redirecionamento do convite para a pagina Definir senha.

## 6. Fluxos

### Convite (admin)

1. Admin abre a aba Usuarios e clica em Convidar.
2. Preenche email, nome, escolhe o papel e marca as paginas (ou "tudo").
3. O app chama a Edge Function `invite-user`, passando o token do admin.
4. A funcao confirma que o chamador e admin, chama
   `auth.admin.inviteUserByEmail` e cria a linha em `profiles` com papel,
   paginas e `active = true`.
5. O Supabase envia o email de convite. O usuario ja aparece na aba Usuarios.

### Primeiro acesso (convidado)

1. O convidado recebe o email e clica no link.
2. Cai na pagina Definir senha do Fleet Control.
3. Define a propria senha; fica autenticado e e levado ao app.

### Login do dia a dia

1. Usuario abre o app, informa email e senha.
2. A sessao fica persistida; nao precisa logar a cada visita.
3. Se o perfil estiver inativo, o acesso e negado.

### Gerenciamento (admin, aba Usuarios)

- Lista todos os usuarios com papel, paginas e status (ativo/inativo).
- Editar papel e paginas — gravacao direta na tabela `profiles` (permitida ao
  admin pela RLS); efeito na proxima query/navegacao do usuario alvo.
- Desativar/reativar — alterna `profiles.active`. Inativo perde acesso na
  proxima query (RLS) e e deslogado no proximo carregamento do app.

## 7. Seguranca — RLS

### Tabelas de dados

vehicles, drivers, fuelings, maintenances, trips, companies, cost_centers,
expenses, insurances, reservations, sync_state.

Policies (todas baseadas em `current_user_role()`):

- SELECT: permitido se `current_user_role()` nao for nulo (qualquer usuario
  com perfil ativo).
- INSERT e UPDATE: permitido se o papel for `admin` ou `editor`.
- DELETE: permitido se o papel for `admin`.

`sync_state` so e tocada pelas Edge Functions de sync, que usam a service role
e ignoram RLS — as policies acima nao atrapalham.

### Tabela `profiles`

- SELECT: a propria linha (`id = auth.uid()`) ou qualquer linha se admin.
- INSERT, UPDATE, DELETE: somente admin. (A Edge Function de convite usa
  service role e ignora RLS de qualquer forma; a policy serve de seguranca
  extra.)

### Edge Functions

- `invite-user` — sensivel: precisa verificar que o chamador e admin antes de
  agir.
- Funcoes de sync — mantidas como estao nesta entrega (baixo risco).

## 8. Implantacao em etapas

A RLS so e ligada depois que tudo estiver testado, para nunca trancar o app
por engano.

1. Criar a tabela `profiles`, a funcao `current_user_role()` e as policies —
   com RLS ainda DESLIGADA nas tabelas de dados.
2. Criar o primeiro usuario admin (email a definir com o usuario) e a sua
   linha em `profiles`.
3. Publicar o app com login, pagina Definir senha e aba Usuarios; publicar a
   Edge Function `invite-user`.
4. Teste com o usuario: logar, convidar alguem, o convidado aceitar, conferir
   o comportamento dos tres papeis e do controle de paginas.
5. Ligar a RLS nas tabelas de dados — o app fica trancado de fato.
6. Desativar o cadastro aberto (signups) nas configuracoes do Supabase Auth.

Reversao: se algo quebrar no passo 5, a RLS pode ser desligada por SQL
rapidamente.

## 9. Decisoes e premissas

- Poucos usuarios — o envio de email embutido do Supabase atende; sem servico
  externo (Resend etc.).
- Sem cadastro aberto — entrada so por convite de admin.
- Editar papel/paginas e via gravacao direta na tabela (RLS protege); nao
  precisa de Edge Function para isso.
- Desativar em vez de excluir — mantem o historico e e reversivel.
- Controle de paginas e de navegacao (front-end); a blindagem de dado e
  login + papel via RLS.
