// Captura, no carregamento da pagina, se a URL e de convite ou recuperacao
// de senha. Precisa ser avaliado antes do supabase-js limpar o hash da URL,
// por isso e importado logo no inicio do main.jsx.
const hash = typeof window !== 'undefined' ? window.location.hash : '';
export const isPasswordSetupUrl = /type=(invite|recovery)/.test(hash);
