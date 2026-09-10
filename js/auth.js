// =====================================================================
// AUTENTICAÇÃO COMPARTILHADA (Supabase Auth)
// Este arquivo é carregado por login.html e painel.html, sempre depois
// do script do Supabase vindo do CDN.
// =====================================================================

// EDITE AQUI: dados de conexão do seu projeto Supabase
const SUPABASE_URL = "https://yqshjfzcoyiqikjnukyb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxc2hqZnpjb3lpcWlram51a3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzIzNDgsImV4cCI6MjEwNDU0ODM0OH0.QBseFaGdtG_6g2c_7EUeGnbhb9_JIa0hBsA2AzGnkp4";

// Cliente Supabase único, compartilhado por toda a aplicação
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Faz login com e-mail e senha.
 * Lança um Error com mensagem amigável em caso de falha.
 */
async function login(email, senha) {
  const { data, error } = await sb.auth.signInWithPassword({
    email: email,
    password: senha,
  });

  if (error) {
    if (error.message === "Invalid login credentials") {
      throw new Error("E-mail ou senha incorretos.");
    }
    throw new Error(error.message);
  }

  return data.user;
}

/**
 * Guarda de autenticação: confere se existe uma sessão ativa.
 * Se não houver, redireciona para login.html e retorna null.
 * Se houver, retorna o usuário logado.
 */
async function checkAuth() {
  const { data } = await sb.auth.getSession();
  const sessao = data.session;

  if (!sessao) {
    window.location.href = "login/index.html";
    return null;
  }

  return sessao.user;
}

/**
 * Encerra a sessão e volta para a tela de login.
 */
async function logout() {
  await sb.auth.signOut();
  window.location.href = "login/index.html";
}

/**
 * Envia o e-mail de recuperação de senha.
 */
async function recuperarSenha(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) {
    throw new Error(error.message);
  }
}

// Objeto global exposto para as páginas usarem
window.Auth = {
  sb,
  login,
  checkAuth,
  logout,
  recuperarSenha,
};
