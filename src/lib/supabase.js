import { createClient } from '@supabase/supabase-js';

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
    persistSession: false,
    autoRefreshToken: false
  }
});

// Helper para buscar dados de uma tabela com tratamento de erro
export async function fetchTable(table, query = {}) {
  let q = supabase.from(table).select('*');
  if (query.order) q = q.order(query.order, { ascending: query.ascending !== false });
  const { data, error } = await q;
  if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`);
  return data || [];
}

// Helpers para CRUD
export async function insertRow(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw new Error(`Erro ao inserir em ${table}: ${error.message}`);
  return data;
}

export async function updateRow(table, id, payload) {
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
  if (error) throw new Error(`Erro ao atualizar ${table}: ${error.message}`);
  return data;
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir de ${table}: ${error.message}`);
}
