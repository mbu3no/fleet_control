import React, { useState, useEffect } from 'react';
import { Car, Loader2, LogIn, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { supabase } from '../lib/supabase.js';

export function LoginPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState('login'); // login | forgot | sent
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'Entrar · Fleet Control'; }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) setError('Email ou senha incorretos');
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Informe seu email'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) setError('Não foi possível enviar o link. Tente novamente.');
    else setMode('sent');
  }

  function backToLogin() {
    setMode('login');
    setError('');
    setPassword('');
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
            <div className="text-[10px] text-slate-500">Gestão integrada</div>
          </div>
        </div>

        {mode === 'sent' ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-4">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
            <p className="text-sm text-white">Link de recuperação enviado.</p>
            <p className="text-xs text-slate-400">
              Verifique a caixa de entrada de <span className="text-slate-200">{email}</span> e o spam.
              Ao clicar no link, você poderá definir uma nova senha.
            </p>
            <button onClick={backToLogin}
              className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
              <ArrowLeft size={14} /> Voltar ao login
            </button>
          </div>
        ) : mode === 'forgot' ? (
          <form onSubmit={handleForgot}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h1 className="text-sm font-semibold text-white">Recuperar senha</h1>
            <p className="text-xs text-slate-400">
              Informe seu email e enviamos um link para você definir uma nova senha.
            </p>
            <div>
              <label className="text-[11px] text-slate-400 uppercase tracking-wide">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
                autoComplete="email" />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              Enviar link
            </button>
            <button type="button" onClick={backToLogin}
              className="w-full text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5">
              <ArrowLeft size={12} /> Voltar ao login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}
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
            <button type="button" onClick={() => { setMode('forgot'); setError(''); }}
              className="w-full text-xs text-slate-400 hover:text-white">
              Esqueci minha senha
            </button>
          </form>
        )}
        <p className="text-[11px] text-slate-600 text-center mt-4">
          Acesso somente por convite do administrador.
        </p>
      </div>
    </div>
  );
}
