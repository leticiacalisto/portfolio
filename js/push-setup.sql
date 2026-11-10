-- =====================================================================
-- NOTIFICAÇÕES PUSH (Web Push) — chegam no aparelho mesmo com o painel
-- fechado (no iPhone: painel adicionado à Tela de Início, iOS 16.4+).
--
-- Como funciona:
--  1. Ao ativar as notificações no sino, o painel inscreve o aparelho e
--     grava a inscrição em push_inscricoes.
--  2. Os gatilhos abaixo chamam a função enviar-push (supabase/functions)
--     quando chega lead do portfólio, quando a marca envia o briefing e
--     quando a marca aprova ou pede ajuste no roteiro.
--  3. A função manda o aviso para todos os aparelhos inscritos.
--
-- Antes de rodar, uma vez só (o valor é o mesmo segredo PUSH_KEY da função):
--   select vault.create_secret('<valor longo e aleatório>', 'push_key');
-- Se o push falhar, nada trava: o lead/briefing/roteiro grava normalmente.
-- =====================================================================

create extension if not exists pg_net;

create table if not exists push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  dispositivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table push_inscricoes enable row level security;

drop policy if exists "cada um cuida das proprias inscricoes" on push_inscricoes;
create policy "cada um cuida das proprias inscricoes"
  on push_inscricoes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Chama a função enviar-push. Nunca deixa um erro aqui derrubar a gravação.
create or replace function push_enviar(p_titulo text, p_texto text, p_chave text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chave text;
begin
  select decrypted_secret into v_chave from vault.decrypted_secrets where name = 'push_key' limit 1;
  if v_chave is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://yqshjfzcoyiqikjnukyb.supabase.co/functions/v1/enviar-push',
    body := jsonb_build_object('titulo', p_titulo, 'texto', coalesce(p_texto, ''), 'chave', p_chave, 'url', '/painel.html'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-key', v_chave)
  );
exception when others then
  raise warning 'push_enviar falhou: %', sqlerrm;
end;
$$;
revoke all on function push_enviar(text, text, text) from public, anon, authenticated;

-- As chaves (lead:/briefing:/roteiro:) são as mesmas do sino do painel,
-- assim o aviso do push e o da página se substituem em vez de duplicar.
-- Datas no mesmo formato que o painel recebe da API (to_json do timestamptz).

-- Lead novo no formulário do portfólio
create or replace function push_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform push_enviar(
    'Nova resposta no formulário',
    coalesce(nullif(new.name, ''), 'Sem nome') || ' · ' || case when new.source = 'popup' then 'Popup' else 'Contato' end,
    'lead:' || new.id
  );
  return new;
end;
$$;
drop trigger if exists push_lead on portfolio_leads;
create trigger push_lead after insert on portfolio_leads
  for each row execute function push_lead();

-- Briefing enviado pela marca: formulário avulso (insert com status novo)
-- ou link da campanha (respondido_em preenchido; reenvio avisa de novo)
create or replace function push_briefing() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_quando timestamptz;
  v_campanha text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'novo' then return new; end if;
    v_quando := coalesce(new.respondido_em, new.created_at);
  else
    if new.respondido_em is null or new.respondido_em is not distinct from old.respondido_em then return new; end if;
    v_quando := new.respondido_em;
  end if;
  select nome into v_campanha from contratos where id = new.contrato_id;
  v_campanha := coalesce(nullif(v_campanha, ''), nullif(new.prefill->>'campanha', ''));
  perform push_enviar(
    'Briefing recebido',
    new.marca || coalesce(' · ' || v_campanha, ''),
    'briefing:' || new.id || ':' || (to_json(v_quando) #>> '{}')
  );
  return new;
end;
$$;
drop trigger if exists push_briefing on briefings;
create trigger push_briefing after insert or update of respondido_em on briefings
  for each row execute function push_briefing();

-- Marca respondeu no link do roteiro (aprovou ou pediu ajuste)
create or replace function push_roteiro() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_titulo text;
begin
  if new.status not in ('aprovado', 'ajuste') or new.respondido_em is null
     or (new.status is not distinct from old.status and new.respondido_em is not distinct from old.respondido_em) then
    return new;
  end if;
  select titulo into v_titulo from quadro_cards where id = new.card_id;
  perform push_enviar(
    case when new.status = 'aprovado' then 'Roteiro aprovado' else 'Marca pediu ajuste no roteiro' end,
    coalesce(nullif(v_titulo, ''), 'Vídeo') || case when new.versao > 1 then ' · versão ' || new.versao else '' end,
    'roteiro:' || new.id || ':' || new.versao || ':' || new.status
  );
  return new;
end;
$$;
drop trigger if exists push_roteiro on roteiros;
create trigger push_roteiro after update of status, respondido_em on roteiros
  for each row execute function push_roteiro();
