// Modo demo — quando ativo, o app roda com dados fake bundlados e nao
// conversa com o Supabase. Usado para visitantes verem o app por dentro
// sem risco de vazar dado real da producao.

const KEY = 'fleet_demo_mode';

// Detecta modo demo na URL (?demo=1) ou em localStorage (persistente).
function detectFromUrl() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignora */ }
    return true;
  }
  return false;
}

function detectFromStorage() {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

// Avaliado uma vez no carregamento do modulo (antes de qualquer render).
export const DEMO_MODE = detectFromUrl() || detectFromStorage();

export function exitDemoMode() {
  try { localStorage.removeItem(KEY); } catch { /* ignora */ }
  window.location.href = '/';
}
