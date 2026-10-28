import { createClient } from "npm:@supabase/supabase-js@2";

// Área "Acessos" da página da empresa: convidar pessoas por e-mail, ajustar permissões,
// desativar e reativar. SÓ o dono (perfis.papel = 'dono', ativo) consegue chamar.
// A chave de serviço existe apenas aqui dentro. Publicar com a verificação de JWT padrão
// (a função confere o dono por conta própria):
//   supabase functions deploy gerir-acessos --project-ref <ref-do-painel>
// Segredo opcional: SITE_URL (padrão https://www.leticiacalisto.com), usado no link do convite.
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SITE = (Deno.env.get("SITE_URL") ?? "https://www.leticiacalisto.com").replace(/\/$/, "");

const cors = {
  "Access-Control-Allow-Origin": SITE,
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

const PAPEIS = ["contador", "socio"]; // novos convites nunca criam outro dono
const UGC = ["nenhum", "leitura", "edicao"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BAN_PRA_SEMPRE = "876000h";

// "Pode ver o painel UGC": leitura/edição valem para as tabelas do painel (financas, operação e configurações).
async function aplicarPermissoes(userId: string, ugc: string, retiradas: boolean) {
  const { error: e0 } = await db.from("permissoes_usuario").delete().eq("user_id", userId);
  if (e0) throw e0;
  const linhas: Record<string, unknown>[] = [];
  if (ugc !== "nenhum") {
    for (const recurso of ["ugc_operacao", "ugc_financas", "config"]) {
      linhas.push({ user_id: userId, recurso, pode_ler: true, pode_escrever: ugc === "edicao" });
    }
  }
  if (!retiradas) linhas.push({ user_id: userId, recurso: "retiradas", pode_ler: false, pode_escrever: false });
  if (linhas.length) {
    const { error } = await db.from("permissoes_usuario").insert(linhas);
    if (error) throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  // quem está chamando precisa ser o dono ativo
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "não autorizado" }, 401);
  const { data: quem, error: erroAuth } = await db.auth.getUser(jwt);
  if (erroAuth || !quem?.user) return json({ error: "não autorizado" }, 401);
  const { data: eu } = await db.from("perfis").select("papel, ativo").eq("user_id", quem.user.id).maybeSingle();
  if (!eu || !eu.ativo || eu.papel !== "dono") return json({ error: "só a administradora gerencia acessos" }, 403);

  const b = await req.json().catch(() => null);
  if (!b || typeof b.acao !== "string") return json({ error: "pedido inválido" }, 400);

  try {
    if (b.acao === "listar") {
      const { data: perfis } = await db.from("perfis").select("user_id, papel, nome, email, ativo, created_at");
      const { data: perms } = await db.from("permissoes_usuario").select("user_id, recurso, pode_ler, pode_escrever");
      const { data: lista } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
      const porId = new Map((lista?.users ?? []).map((u) => [u.id, u]));
      return json({
        pessoas: (perfis ?? []).map((p) => {
          const u = porId.get(p.user_id);
          const minhas = (perms ?? []).filter((x) => x.user_id === p.user_id);
          const ugcOp = minhas.find((x) => x.recurso === "ugc_operacao");
          const ret = minhas.find((x) => x.recurso === "retiradas");
          return {
            ...p,
            ugc: ugcOp ? (ugcOp.pode_escrever ? "edicao" : ugcOp.pode_ler ? "leitura" : "nenhum") : "nenhum",
            retiradas: ret ? ret.pode_ler : true,
            ultimo_login: u?.last_sign_in_at ?? null,
            convite_pendente: !!u && !u.last_sign_in_at,
            bloqueado: !!(u as { banned_until?: string } | undefined)?.banned_until,
          };
        }),
      });
    }

    if (b.acao === "convidar") {
      const email = String(b.email ?? "").trim().toLowerCase();
      const nome = String(b.nome ?? "").trim().slice(0, 80);
      if (!EMAIL.test(email)) return json({ error: "e-mail inválido" }, 400);
      if (!PAPEIS.includes(b.papel)) return json({ error: "perfil inválido" }, 400);
      const ugc = UGC.includes(b.ugc) ? b.ugc : "nenhum";
      const { data: conv, error } = await db.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${SITE}/login/definir-senha.html`,
        data: { nome },
      });
      if (error || !conv?.user) return json({ error: error?.message ?? "não foi possível convidar" }, 400);
      const { error: e1 } = await db.from("perfis").upsert({ user_id: conv.user.id, papel: b.papel, nome: nome || email, email, ativo: true });
      if (e1) throw e1;
      await aplicarPermissoes(conv.user.id, ugc, b.retiradas !== false);
      return json({ ok: true, user_id: conv.user.id });
    }

    // as ações abaixo mexem numa pessoa que já existe (nunca em si mesma nem em outro dono)
    const alvoId = String(b.user_id ?? "");
    if (!alvoId) return json({ error: "pessoa não informada" }, 400);
    if (alvoId === quem.user.id) return json({ error: "você não pode alterar o próprio acesso por aqui" }, 400);
    const { data: alvo } = await db.from("perfis").select("papel, email").eq("user_id", alvoId).maybeSingle();
    if (!alvo) return json({ error: "pessoa não encontrada" }, 404);
    if (alvo.papel === "dono") return json({ error: "não é possível alterar outra administradora" }, 400);

    if (b.acao === "atualizar") {
      const campos: Record<string, unknown> = {};
      if (typeof b.nome === "string") campos.nome = b.nome.trim().slice(0, 80);
      if (b.papel !== undefined) {
        if (!PAPEIS.includes(b.papel)) return json({ error: "perfil inválido" }, 400);
        campos.papel = b.papel;
      }
      if (Object.keys(campos).length) {
        const { error } = await db.from("perfis").update(campos).eq("user_id", alvoId);
        if (error) throw error;
      }
      if (b.ugc !== undefined || b.retiradas !== undefined) {
        // reaplica o conjunto inteiro, partindo do que a pessoa já tem
        const { data: atuais } = await db.from("permissoes_usuario").select("recurso, pode_ler, pode_escrever").eq("user_id", alvoId);
        const ugcAtual = (atuais ?? []).find((x) => x.recurso === "ugc_operacao");
        const retAtual = (atuais ?? []).find((x) => x.recurso === "retiradas");
        const ugc = UGC.includes(b.ugc) ? b.ugc : ugcAtual ? (ugcAtual.pode_escrever ? "edicao" : "leitura") : "nenhum";
        const retiradas = b.retiradas !== undefined ? !!b.retiradas : retAtual ? retAtual.pode_ler : true;
        await aplicarPermissoes(alvoId, ugc, retiradas);
      }
      return json({ ok: true });
    }

    if (b.acao === "desativar") {
      // 1) corta o acesso aos dados na hora (as políticas do banco só liberam quem está ativo)
      const { error } = await db.from("perfis").update({ ativo: false }).eq("user_id", alvoId);
      if (error) throw error;
      // 2) bloqueia novos logins e a renovação da sessão
      const { error: eBan } = await db.auth.admin.updateUserById(alvoId, { ban_duration: BAN_PRA_SEMPRE });
      if (eBan) throw eBan;
      return json({ ok: true });
    }

    if (b.acao === "reativar") {
      const { error } = await db.from("perfis").update({ ativo: true }).eq("user_id", alvoId);
      if (error) throw error;
      const { error: eBan } = await db.auth.admin.updateUserById(alvoId, { ban_duration: "none" });
      if (eBan) throw eBan;
      return json({ ok: true });
    }

    if (b.acao === "reenviar") {
      if (!alvo.email) return json({ error: "pessoa sem e-mail" }, 400);
      const { error } = await db.auth.admin.inviteUserByEmail(alvo.email, { redirectTo: `${SITE}/login/definir-senha.html` });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
