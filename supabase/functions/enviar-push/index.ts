import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Manda uma notificação push para todos os aparelhos inscritos (tabela push_inscricoes).
// Quem chama são os gatilhos do banco (js/push-setup.sql), com a chave secreta no
// cabeçalho x-push-key. Inscrições que o aparelho já cancelou (404/410) são apagadas.
// Publicar SEM verificação de JWT (a autorização é a chave):
//   supabase functions deploy enviar-push --project-ref <ref-do-painel> --no-verify-jwt
// Segredos: PUSH_KEY (o mesmo valor guardado no vault como push_key),
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT (ex.: https://www.leticiacalisto.com)
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "https://www.leticiacalisto.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function igual(a: string, b: string) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let d = 0;
  for (let i = 0; i < ea.length; i++) d |= ea[i] ^ eb[i];
  return d === 0;
}

const texto = (v: unknown, max: number) => String(v ?? "").slice(0, max);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);
  const chave = Deno.env.get("PUSH_KEY") ?? "";
  if (chave.length < 32 || !igual(req.headers.get("x-push-key") ?? "", chave)) return json({ error: "não autorizado" }, 401);

  const b = await req.json().catch(() => null);
  if (!b || !b.titulo) return json({ error: "aviso inválido" }, 400);
  const url = typeof b.url === "string" && b.url.startsWith("/") ? b.url : "/painel.html";
  const aviso = JSON.stringify({ titulo: texto(b.titulo, 120), texto: texto(b.texto, 300), chave: texto(b.chave, 200) || undefined, url });

  const { data: inscricoes, error } = await db.from("push_inscricoes").select("id, endpoint, p256dh, auth");
  if (error) return json({ error: error.message }, 500);

  let enviados = 0;
  const removidas: string[] = [];
  await Promise.all((inscricoes ?? []).map(async (i) => {
    try {
      await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, aviso, { TTL: 60 * 60 * 24, urgency: "high" });
      enviados++;
    } catch (erro) {
      const status = (erro as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) removidas.push(i.id);
      else console.error("push falhou", status, (erro as Error).message);
    }
  }));
  if (removidas.length) await db.from("push_inscricoes").delete().in("id", removidas);

  return json({ enviados, removidas: removidas.length, total: (inscricoes ?? []).length });
});
