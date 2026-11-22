-- =====================================================================
-- BRIEFING PREENCHE A MARCA SOZINHO (rodar UMA VEZ no SQL Editor do
-- Supabase, depois do js/briefing-setup.sql e do
-- js/briefing-vinculado-setup.sql). Pode rodar de novo sem problema.
--
-- Toda vez que a marca envia o briefing (/briefing), os dados de contato
-- dela vão direto para o cadastro da marca no painel (tabela empresas):
--   Seu nome   -> Contato principal
--   E-mail     -> E-mail
--   WhatsApp   -> WhatsApp
--   Site       -> Site
--   Instagram  -> Instagram
--   TikTok     -> TikTok
--   Nicho      -> Segmento (só se estiver vazio)
--
-- Duas regras, para ninguém de fora bagunçar o cadastro:
--  - Briefing com link da campanha (?b=TOKEN): o link é único daquela
--    marca, então o que ela enviar ATUALIZA o cadastro (ela já viu os
--    dados antigos pré-preenchidos e confirmou ou corrigiu). Campo que
--    ela deixar em branco não apaga nada.
--  - Briefing pelo link geral (sem token): qualquer pessoa pode enviar,
--    então ele só COMPLETA o que está vazio na marca de mesmo nome. Se a
--    marca ainda não existe no painel, ela é criada (como Lead) e o
--    briefing fica ligado a ela.
-- =====================================================================

alter table empresas add column if not exists tiktok text;

create or replace function briefing_para_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := coalesce(new.respostas, '{}'::jsonb);
  v_emp uuid := new.empresa_id;
  v_marca text := nullif(trim(coalesce(r->>'marca', new.marca)), '');
  v_confia boolean := new.token is not null;
  v_nome text := nullif(trim(r->>'contato_nome'), '');
  v_email text := nullif(lower(trim(r->>'contato_email')), '');
  v_whats text := nullif(trim(r->>'contato_whatsapp'), '');
  v_site text := nullif(trim(r->>'site'), '');
  v_insta text := nullif(trim(r->>'instagram'), '');
  v_tiktok text := nullif(trim(r->>'tiktok'), '');
  v_nicho text := nullif(trim(case when r->>'nicho' = 'Outro' then r->>'nicho_outro' else r->>'nicho' end), '');
begin
  if r = '{}'::jsonb then
    return new;
  end if;

  -- Acha a marca pelo nome quando o briefing não veio ligado a uma
  if v_emp is null and v_marca is not null then
    select id into v_emp from empresas where lower(trim(nome)) = lower(v_marca) limit 1;
    if v_emp is null then
      insert into empresas (nome) values (v_marca)
      on conflict do nothing
      returning id into v_emp;
      if v_emp is null then
        select id into v_emp from empresas where lower(trim(nome)) = lower(v_marca) limit 1;
      end if;
    end if;
  end if;

  if v_emp is null then
    return new;
  end if;

  if v_confia then
    update empresas set
      contato_principal = coalesce(v_nome, contato_principal),
      email             = coalesce(v_email, email),
      whatsapp          = coalesce(v_whats, whatsapp),
      site              = coalesce(v_site, site),
      instagram         = coalesce(v_insta, instagram),
      tiktok            = coalesce(v_tiktok, tiktok),
      segmento          = coalesce(nullif(trim(segmento), ''), v_nicho),
      updated_at        = now()
    where id = v_emp;
  else
    update empresas set
      contato_principal = coalesce(nullif(trim(contato_principal), ''), v_nome),
      email             = coalesce(nullif(trim(email), ''), v_email),
      whatsapp          = coalesce(nullif(trim(whatsapp), ''), v_whats),
      site              = coalesce(nullif(trim(site), ''), v_site),
      instagram         = coalesce(nullif(trim(instagram), ''), v_insta),
      tiktok            = coalesce(nullif(trim(tiktok), ''), v_tiktok),
      segmento          = coalesce(nullif(trim(segmento), ''), v_nicho),
      updated_at        = now()
    where id = v_emp;
  end if;

  -- Liga o briefing à marca (não dispara este gatilho de novo: ele só
  -- escuta mudança nas respostas)
  if new.empresa_id is null then
    update briefings set empresa_id = v_emp where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function briefing_para_empresa() from public;

drop trigger if exists trg_briefing_para_empresa on briefings;
create trigger trg_briefing_para_empresa
  after insert or update of respostas on briefings
  for each row
  when (new.status in ('novo', 'lido'))
  execute function briefing_para_empresa();

-- ---------------------------------------------------------------------
-- OPCIONAL: passa os briefings que já chegaram para as marcas também.
-- (Reaplica as respostas; só mexe em briefings respondidos.)
-- ---------------------------------------------------------------------
update briefings set respostas = respostas
where status in ('novo', 'lido') and respostas <> '{}'::jsonb;
