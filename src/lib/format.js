// Formatters and small display helpers.

// Normaliza string pra matching de busca (lowercase, sem acentos)
export function normalizeSearchText(s) {
  if (s == null) return '';
  let out = String(s).toLowerCase().normalize('NFD');
  let result = '';
  for (const ch of out) {
    const code = ch.charCodeAt(0);
    if (code < 0x0300 || code > 0x036F) result += ch;
  }
  return result;
}

// Verifica se um item passa pelo filtro de busca.
// fields: array de funções que extraem texto buscável do item.
export function matchesSearch(item, query, fields) {
  if (!query || !query.trim()) return true;
  const q = normalizeSearchText(query);
  for (const fn of fields) {
    if (normalizeSearchText(fn(item)).includes(q)) return true;
  }
  return false;
}

// Formata data armazenada como string YYYY-MM-DD pra dd/mm/yyyy
// sem passar pelo new Date() (que interpreta como UTC e desloca 1 dia em BRT).
export function formatLocalDate(dateStr) {
  if (!dateStr) return '—';
  const s = String(dateStr).slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

export function fmtRelativeTime(iso) {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} d`;
}
