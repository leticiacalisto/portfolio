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
async function login(email, senha, captchaToken) {
  const { data, error } = await sb.auth.signInWithPassword({
    email: email,
    password: senha,
    options: { captchaToken: captchaToken },
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
async function recuperarSenha(email, captchaToken) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { captchaToken: captchaToken, redirectTo: location.origin + "/login/definir-senha.html" });
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Papel e permissões de quem está logado (função minhas_permissoes do banco).
 * Devolve: { erro: true } se não deu pra consultar (ex.: SQL ainda não rodou; quem chama segue normal),
 *          { semPerfil: true } se o usuário não tem perfil, ou o objeto { papel, ativo, permissoes: { recurso: { ler, escrever } } }.
 */
async function minhasPermissoes() {
  try {
    const { data, error } = await sb.rpc("minhas_permissoes");
    if (error) return { erro: true };
    return data || { semPerfil: true };
  } catch (e) {
    return { erro: true };
  }
}

/** Grava "quem entrou e quando" (a pessoa só consegue gravar o próprio acesso). Nunca atrapalha a página. */
async function registrarAcesso(pagina) {
  try {
    const { data } = await sb.auth.getSession();
    const u = data.session && data.session.user;
    if (u) await sb.from("acessos_log").insert({ user_id: u.id, email: u.email, pagina });
  } catch (e) {}
}

/** Pra onde cada pessoa vai depois de entrar: painel UGC (se pode ler) ou página da empresa. */
function paginaInicial(perm) {
  if (perm && !perm.erro && !perm.semPerfil && perm.permissoes && !perm.permissoes.ugc_operacao.ler) return "empresa.html";
  return "painel.html";
}

// Objeto global exposto para as páginas usarem
window.Auth = {
  sb,
  login,
  checkAuth,
  logout,
  recuperarSenha,
  minhasPermissoes,
  registrarAcesso,
  paginaInicial,
};