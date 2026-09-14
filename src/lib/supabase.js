import { createClient } from '@supabase/supabase-js';
import { DEMO_MODE } from './demo-mode.js';
import { DEMO_TABLES } from './demo-data.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram definidas. ' +
    'Crie um arquivo .env na raiz do projeto baseado no .env.example'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const DEMO_ERROR = 'Modo demonstração — nada é salvo por aqui.';

// Helper para buscar dados de uma tabela com tratamento de erro.
// Pagina automaticamente — o Supabase tem limite padrao de 1000 linhas por
// request, e tabelas grandes (ex: trips com histórico Cobli) excedem isso.
// Em modo demo, devolve o dataset fake bundlado (sem tocar no Supabase).
export async function fetchTable(table, query = {}) {
  if (DEMO_MODE) {
    const rows = [...(DEMO_TABLES[table] || [])];
    if (query.order) {
      const asc = query.ascending !== false;
      rows.sort((a, b) => {
        const av = a[query.order]; const bv = b[query.order];
        if (av === bv) return 0;
        if (av == null) return 1; if (bv == null) return -1;
        const cmp = av < bv ? -1 : 1;
        return asc ? cmp : -cmp;
      });
    }
    return rows;
  }
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select('*').range(from, from + PAGE - 1);
    if (query.order) q = q.order(query.order, { ascending: query.ascending !== false });
    const { data, error } = await q;
    if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// Helpers para CRUD
export async function insertRow(table, payload) {
  if (DEMO_MODE) throw new Error(DEMO_ERROR);
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw new Error(`Erro ao inserir em ${table}: ${error.message}`);
  return data;
}

export async function updateRow(table, id, payload) {
  if (DEMO_MODE) throw new Error(DEMO_ERROR);
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
  if (error) throw new Error(`Erro ao atualizar ${table}: ${error.message}`);
  return data;
}

export async function deleteRow(table, id) {
  if (DEMO_MODE) throw new Error(DEMO_ERROR);
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir de ${table}: ${error.message}`);
}
