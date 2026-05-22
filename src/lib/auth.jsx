import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext(null);

// Paginas que o admin pode liberar por usuario (alimenta o formulario de convite).
// 'settings' e 'users' nao entram aqui: sao areas exclusivas de admin.
export const PAGE_KEYS = [
  { key: 'dashboard', label: 'Visão geral' },
  { key: 'vehicles', label: 'Veículos' },
  { key: 'reservations', label: 'Reservas' },
  { key: 'fuelings', label: 'Abastecimentos' },
  { key: 'maintenances', label: 'Manutenções' },
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
