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
    if (error) showToast('error', 'Erro', 'Não foi possível carregar os usuários');
    else setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(u) {
    if (u.id === me.id) {
      showToast('error', 'Ação bloqueada', 'Você não pode desativar a si mesmo');
      return;
    }
    const { error } = await supabase
      .from('profiles').update({ active: !u.active }).eq('id', u.id);
    if (error) { showToast('error', 'Erro', error.message); return; }
    showToast('success', u.active ? 'Usuário desativado' : 'Usuário reativado', '');
    load();
  }

  return (
    <div>
      <PageHeader title="Usuários" count={users.length}
        onAdd={() => setModal('invite')} addLabel="Convidar" />

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-10 justify-center">
          <Loader2 size={14} className="animate-spin" /> Carregando
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={ShieldCheck} text="Nenhum usuário ainda. Use Convidar." />
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-[11px] text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Nome</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Papel</th>
                <th className="text-left px-4 py-2.5">Páginas</th>
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
                        : `${(u.allowed_pages || []).length} página(s)`}
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
      showToast('error', 'Erro', 'Email obrigatório'); return;
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
      showToast('success', 'Usuário atualizado', '');
      onSaved();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            {mode === 'invite' ? 'Convidar usuário' : 'Editar usuário'}
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
            <label className="text-[11px] text-slate-400 uppercase tracking-wide">Páginas que pode ver</label>
            <label className="flex items-center gap-2 mt-2 text-sm text-slate-300">
              <input type="checkbox" checked={allPages}
                onChange={e => setAllPages(e.target.checked)} />
              Todas as páginas
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
          <p className="text-[11px] text-slate-500">Admin sempre vê todas as páginas.</p>
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
