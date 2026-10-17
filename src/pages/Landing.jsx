import React, { useEffect, useState } from 'react';
import {
  Car, Github, LogIn, ArrowRight, ExternalLink, Play,
  LayoutDashboard, Fuel, Wrench, Users as UsersIcon, Wallet, Calculator,
  Shield, Database, Zap, Code2, MapPin, Receipt, Sun, Moon, Clock, Link2, TrendingDown, CalendarCheck,
} from 'lucide-react';

const GITHUB_URL = 'https://github.com/mbu3no/fleet_control';

export function LandingPage() {
  useEffect(() => { document.title = 'Fleet Control · Gestão de frotas'; }, []);

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('fleet_theme') || 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('fleet_theme', theme); } catch { /* ignora */ }
  }, [theme]);
  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  const goLogin = () => { window.location.href = '/login'; };
  const goDemo = () => { window.location.href = '/?demo=1'; };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-96 -right-40 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl"></div>
      </div>

      <header className="relative border-b border-slate-800/50 backdrop-blur-xl bg-slate-950/60 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center shadow-sm shadow-violet-500/30">
              <Car size={18} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white tracking-tight">Fleet Control</div>
              <div className="text-[10px] text-slate-500">Gestão integrada de frotas</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme}
              className="w-9 h-9 rounded-lg hover:bg-slate-800/60 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} aria-label="Alternar tema">
              {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
            </button>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors">
              <Github size={14} /> GitHub
            </a>
            <button onClick={goLogin}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-xs font-medium transition-colors shadow-sm shadow-violet-500/20">
              <LogIn size={14} /> Entrar
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <section className="pt-16 sm:pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
            Projeto de estágio · Rodou em produção
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-tight max-w-3xl mx-auto">
            Sistema de gestão de frotas <span className="text-violet-400">construído do zero</span>.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Controle operacional (veículos, motoristas, viagens, abastecimentos, manutenções, despesas, seguros e reservas), análise financeira (custos por veículo, rateio proporcional por km, depreciação) e integrações automáticas com Infleet e Webposto.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <button onClick={goDemo}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium transition-colors shadow-sm shadow-violet-500/25">
              <Play size={16} strokeWidth={2.5} /> Ver demo interativo
            </button>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-100 text-sm font-medium hover:bg-slate-800 transition-colors">
              <Github size={16} /> Ver no GitHub
            </a>
            <button onClick={goLogin}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-slate-300 text-sm font-medium hover:text-white hover:bg-slate-800 transition-colors">
              Entrar <ArrowRight size={14} />
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            O demo abre o app com dados fictícios. Dá pra clicar em tudo, nada é salvo.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap text-[11px] text-slate-500">
            <span className="px-2 py-1 rounded-md bg-slate-900/60 border border-slate-800">React 18 + Vite 5</span>
            <span className="px-2 py-1 rounded-md bg-slate-900/60 border border-slate-800">Supabase (Postgres + Auth + Edge Functions)</span>
            <span className="px-2 py-1 rounded-md bg-slate-900/60 border border-slate-800">Tailwind + Recharts</span>
            <span className="px-2 py-1 rounded-md bg-slate-900/60 border border-slate-800">PWA instalável</span>
          </div>
        </section>

        <section className="pb-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { value: '13 mil+', label: 'viagens registradas' },
              { value: '26', label: 'motoristas ativos' },
              { value: 'a cada 3h', label: 'sincronização automática' },
              { value: '280 mil', label: 'vendas varridas no backfill' },
            ].map((n, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/40 px-5 py-4 text-center">
                <div className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">{n.value}</div>
                <div className="mt-1 text-xs text-slate-400">{n.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12 border-t border-slate-800/60">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">O que faz</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
              Da operação diária à análise de custos, com sincronização automática dos sistemas legados.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard icon={LayoutDashboard} title="Operação">
              Veículos, motoristas, viagens, abastecimentos, manutenções, despesas, seguros e reservas, cadastrados à mão ou sincronizados.
            </FeatureCard>
            <FeatureCard icon={Calculator} title="Análise financeira">
              Custos consolidados por veículo (com seguro proporcional ao período) e rateio em 3 níveis por km rodado.
            </FeatureCard>
            <FeatureCard icon={Shield} title="Auth por convite">
              Login por convite, três papéis (admin, editor, visualizador) e páginas permitidas por usuário, tudo aplicado no banco via RLS.
            </FeatureCard>
            <FeatureCard icon={Database} title="Integrações">
              Sync a cada 3h com Infleet (GraphQL) e Webposto (REST + backfill em background) via Edge Functions Deno.
            </FeatureCard>
          </div>
        </section>

        <section className="py-12 border-t border-slate-800/60">
          <div className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Stack e arquitetura</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              O que roda em cada camada e por quê.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800">
            {[
              { layer: 'Frontend', tech: 'React 18 + Vite 5', detail: 'SPA com URLs reais por página via pushState/popstate, sem react-router. PWA instalável no celular.' },
              { layer: 'Interface', tech: 'Tailwind CSS + Lucide + Recharts', detail: 'Tema claro e escuro, layout responsivo, gráficos do dashboard e tabelas com busca e ordenação.' },
              { layer: 'Banco de dados', tech: 'Supabase Postgres', detail: 'Schema versionado em migrations numeradas. Row Level Security por papel em todas as tabelas.' },
              { layer: 'Autenticação', tech: 'Supabase Auth', detail: 'Email e senha, entrada só por convite, três papéis e páginas permitidas por usuário.' },
              { layer: 'Backend', tech: 'Edge Functions (Deno)', detail: 'Sincronização com Infleet (GraphQL) e Webposto (REST), envio de convites com validação de admin.' },
              { layer: 'Agendamento', tech: 'pg_cron + pg_net', detail: 'O próprio Postgres dispara as Edge Functions a cada 3 horas.' },
              { layer: 'Deploy', tech: 'Vercel', detail: 'Deploy automático a cada push na main, com fallback de SPA para links diretos.' },
            ].map((r, i) => (
              <div key={i} className="grid sm:grid-cols-[150px_230px_1fr] gap-1 sm:gap-4 px-5 py-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 sm:pt-0.5">{r.layer}</div>
                <div className="text-sm font-medium text-white">{r.tech}</div>
                <div className="text-xs text-slate-400 leading-relaxed sm:pt-0.5">{r.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12 border-t border-slate-800/60">
          <div className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Destaques técnicos</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Alguns dos problemas mais interessantes que resolvi neste projeto.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Highlight icon={Shield} title="Convite server-side com validação JWT">
              A Edge Function <Code>invite-user</Code> recebe o token do admin, confirma o papel na tabela <Code>profiles</Code> e só então usa a service_role pra criar o usuário no Supabase Auth. O frontend nunca toca em chave secreta.
            </Highlight>
            <Highlight icon={Database} title="RLS por papel no Postgres">
              Função SQL <Code>current_user_role()</Code> (SECURITY DEFINER) resolve o papel a partir do JWT sem gerar recursão de RLS ao ler <Code>profiles</Code>. Policies por tabela: SELECT autenticado, INSERT/UPDATE admin+editor, DELETE só admin.
            </Highlight>
            <Highlight icon={Zap} title="Backfill Webposto com self-chaining">
              A API não filtra por placa, então pra achar os abastecimentos da frota precisou varrer 280k vendas. Pra fugir do timeout de 30s da Edge Function, cada rodada processa um lote e se re-invoca via <Code>EdgeRuntime.waitUntil</Code> até alcançar o presente.
            </Highlight>
            <Highlight icon={Code2} title="Descoberta do filtro obrigatório da Infleet">
              <Code>listMaintenances</Code> retornava "unknown" mesmo com token válido. Via introspecção do schema GraphQL descobri que o filtro <Code>occurredAt</Code> (PeriodInput) é obrigatório na prática, apesar do schema marcar como opcional. Mesmo padrão vale pra <Code>listExpenses</Code>.
            </Highlight>
            <Highlight icon={Clock} title="Datas sem erro de fuso horário">
              <Code>new Date('2026-05-25')</Code> é lido como UTC; comparado com o horário de Brasília, a contagem de dias até um vencimento errava por 1. Centralizei tudo num helper <Code>daysUntil()</Code> que interpreta a data como local, corrigindo todos os alertas de uma vez.
            </Highlight>
            <Highlight icon={Link2} title="URLs reais por página numa SPA">
              Cada aba tem sua URL (<Code>/veiculos</Code>, <Code>/rateio</Code>, ...), feita com <Code>pushState</Code> e <Code>popstate</Code> nativos, sem biblioteca de rotas. O <Code>vercel.json</Code> devolve o app em qualquer caminho, então links diretos e o botão voltar funcionam.
            </Highlight>
          </div>
        </section>

        <section className="py-12 border-t border-slate-800/60">
          <div className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Módulos do app</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Doze áreas, cada uma com filtros, busca e permissão por papel.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { icon: LayoutDashboard, name: 'Visão geral', desc: 'KPIs do período, composição de custos e alertas.' },
              { icon: Car, name: 'Veículos', desc: 'Frota com km atual e revisões por km e data.' },
              { icon: UsersIcon, name: 'Motoristas', desc: 'Cadastro sincronizado da telemetria.' },
              { icon: MapPin, name: 'Viagens', desc: 'Rotas, km e horários vindos da Infleet.' },
              { icon: Fuel, name: 'Abastecimentos', desc: 'Litros e valores importados do Webposto.' },
              { icon: Wrench, name: 'Manutenções', desc: 'Histórico e custo das tarefas por veículo.' },
              { icon: Receipt, name: 'Despesas + Seguros', desc: 'IPVA, licenciamento, multas e apólices.' },
              { icon: CalendarCheck, name: 'Reservas', desc: 'Agenda de uso dos veículos.' },
              { icon: Calculator, name: 'Rateio por km', desc: 'Custo dividido por empresa, motorista e veículo.' },
              { icon: Wallet, name: 'Custos por veículo', desc: 'Quatro categorias somadas e custo por km.' },
              { icon: TrendingDown, name: 'Depreciação', desc: 'Valor atual de cada veículo, 20% ao ano.' },
              { icon: Shield, name: 'Usuários', desc: 'Convites, papéis e páginas permitidas.' },
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40">
                  <div className="flex items-center gap-2.5">
                    <Icon size={14} className="text-violet-400 shrink-0" strokeWidth={2} />
                    <span className="text-sm font-medium text-slate-200">{m.name}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-slate-500 leading-relaxed">{m.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-12 border-t border-slate-800/60">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
            <div className="flex items-start gap-4 flex-col sm:flex-row">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                <ExternalLink size={18} className="text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">Sobre este deploy</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">
                  Feito durante meu <span className="text-slate-200 font-medium">estágio na Família Pires</span>. Rodou em produção por meses gerenciando 4 veículos, 26 motoristas e mais de 13 mil viagens, com sincronização automática Infleet e Webposto a cada 3 horas.
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Depois a gestão da frota foi consolidada dentro do sistema interno unificado da empresa. Este deploy fica aqui como portfólio: o código continua funcional, o modo demo permite explorar as telas com dados fictícios, e o repositório documenta as decisões técnicas.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-10 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-500">
            Feito por <span className="text-slate-300 font-medium">Matheus Bueno</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
              <Github size={13} /> mbu3no/fleet_control
            </a>
            <button onClick={goLogin}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
              <LogIn size={13} /> Entrar no app
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Code({ children }) {
  return <code className="px-1 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px] font-mono">{children}</code>;
}

function FeatureCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 hover:border-slate-700 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-3">
        <Icon size={16} className="text-violet-300" strokeWidth={2} />
      </div>
      <div className="text-sm font-semibold text-white mb-1.5">{title}</div>
      <div className="text-xs text-slate-400 leading-relaxed">{children}</div>
    </div>
  );
}

function Highlight({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-violet-300" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white mb-1.5">{title}</div>
          <div className="text-xs text-slate-400 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
