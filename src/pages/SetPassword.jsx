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
