import { createClient } from "npm:@supabase/supabase-js@2";

// Recebe o resumo mensal de uma frente de OUTRO app (hoje: a loja Bela Ordem, frente 'mercado_livre')
// e grava em resumo_mensal_frente. Quem chama é a função bo-resumo-empresa do projeto da loja, que
// manda a chave secreta no cabeçalho x-resumo-key. A chave de serviço (service_role) só existe aqui
// dentro, nunca no site. Publicar SEM verificação de JWT (a autorização é a chave):
//   supabase functions deploy receber-resumo-frente --project-ref <ref-do-painel> --no-verify-jwt
// Segredo: supabase secrets set EMPRESA_RESUMO_KEY=<valor longo e aleatório> --project-ref <ref-do-painel>
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const FRENTES_PERMITIDAS = ["mercado_livre"]; // a frente 'ugc' é gravada pelo próprio painel, logado
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const CAMPOS = [
  "receita_bruta", "impostos_estimados", "custos_diretos", "despesas_proprias", "outras_receitas", "consumo_e_perdas",
  "resultado_frente", "caixa_entradas", "caixa_saidas", "saldo_conta", "transferencias_liquidas",
  "prolabore_pago", "despesas_compartilhadas_pagas", "distribuicao_lucros_paga", "das_pago",
];

function igual(a: string, b: string) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let d = 0;
  for (let i = 0; i < ea.length; i++) d |= ea[i] ^ eb[i];
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);
  const chave = Deno.env.get("EMPRESA_RESUMO_KEY") ?? "";
  if (chave.length < 32 || !igual(req.headers.get("x-resumo-key") ?? "", chave)) return json({ error: "não autorizado" }, 401);

  const b = await req.json().catch(() => null);
  if (!b || !FRENTES_PERMITIDAS.includes(b.frente) || !Array.isArray(b.linhas) || !b.linhas.length || b.linhas.length > 60) {
    return json({ error: "resumo inválido" }, 400);
  }
  const linhas: Record<string, unknown>[] = [];
  for (const l of b.linhas) {
    if (!l || typeof l.mes !== "string" || !MES.test(l.mes)) return json({ error: "mês inválido" }, 400);
    const o: Record<string, unknown> = { frente: b.frente, mes: l.mes };
    for (const c of CAMPOS) {
      if (l[c] === undefined) continue;
      const v = Number(l[c]);
      if (!Number.isFinite(v) || Math.abs(v) > 1e9) return json({ error: `valor inválido em ${c}` }, 400);
      o[c] = Math.round(v * 100) / 100;
    }
    linhas.push(o);
  }

  try {
    // user_id só marca "quem gravou": usa o dono do painel (o acesso de leitura vem dos papéis, não dele)
    const { data: dono } = await db.from("perfis").select("user_id").eq("papel", "dono").eq("ativo", true).limit(1).maybeSingle();
    if (!dono) return json({ error: "dono do painel não encontrado" }, 500);
    const agora = new Date().toISOString();
    // meses sem dados de caixa vêm sem esses campos: agrupa por conjunto de colunas pra o upsert
    // só atualizar o que foi enviado (e não zerar o que já estava gravado)
    const grupos = new Map<string, Record<string, unknown>[]>();
    for (const l of linhas) {
      const k = Object.keys(l).sort().join(",");
      grupos.set(k, [...(grupos.get(k) ?? []), { ...l, user_id: dono.user_id, atualizado_em: agora }]);
    }
    for (const g of grupos.values()) {
      const { error } = await db.from("resumo_mensal_frente").upsert(g, { onConflict: "frente,mes" });
      if (error) throw error;
    }
    return json({ ok: true, gravados: linhas.length });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
