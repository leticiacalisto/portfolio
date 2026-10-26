-- =====================================================================
-- APROVAÇÃO DE ROTEIRO (rodar UMA VEZ no SQL Editor do Supabase, depois
-- do js/quadro-colunas-setup.sql). Cada roteiro pertence a um vídeo
-- (quadro_cards). No card, "Enviar roteiro" sobe o arquivo do roteiro,
-- gera um token único e move o card para "Aprovação de Roteiro". O link
-- /roteiro/?r=TOKEN abre só aquele roteiro: a marca não lê a tabela, só
-- chama as duas funções abaixo, que enxergam a linha do próprio token.
--  - Aprovar: card vai para "Gravar".
--  - Solicitar ajuste: card vai para "Revisão de Roteiro" e os
--    comentários de cada cena ficam guardados no roteiro.
--  - Aprovar também conclui a etapa "Roteiro" do vídeo.
-- Nova versão (pelo painel) guarda a anterior em "historico".
-- =====================================================================

create table if not exists roteiros (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references quadro_cards(id) on delete cascade,
  token text not null unique,
  versao int not null default 1,
  conteudo jsonb not null,                          -- o roteiro (marca, título, ficha, cenas, seções)
  status text not null default 'aprovacao' check (status in ('aprovacao', 'ajuste', 'aprovado')),
  comentarios jsonb not null default '{}'::jsonb,   -- { "cenas": { "0": "..." }, "geral": "..." }
  historico jsonb not null default '[]'::jsonb,     -- versões anteriores com os comentários de cada uma
  enviado_em timestamptz not null default now(),
  respondido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_roteiros_card on roteiros(card_id);

alter table roteiros enable row level security;

drop policy if exists "autenticados podem tudo em roteiros" on roteiros;
create policy "autenticados podem tudo em roteiros"
  on roteiros for all to authenticated using (true) with check (true);

-- Abre o roteiro do link. Token errado devolve null.
create or replace function roteiro_abrir(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'conteudo', r.conteudo,
    'versao', r.versao,
    'status', r.status,
    'comentarios', r.comentarios,
    'respondido_em', r.respondido_em
  )
  from roteiros r
  where r.token = p_token
  limit 1;
$$;

-- Resposta da marca: p_acao = 'aprovar' ou 'ajuste'. Só vale enquanto o
-- roteiro está em aprovação (depois disso, só uma nova versão reabre).
-- Move o card para a fase certa. Devolve true se gravou.
create or replace function roteiro_responder(p_token text, p_acao text, p_comentarios jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card uuid;
  v_coluna uuid;
  v_status text;
begin
  if p_token is null or length(p_token) < 20 or p_acao not in ('aprovar', 'ajuste') then
    return false;
  end if;
  v_status := case when p_acao = 'aprovar' then 'aprovado' else 'ajuste' end;

  update roteiros set
    status = v_status,
    comentarios = coalesce(p_comentarios, '{}'::jsonb),
    respondido_em = now(),
    updated_at = now()
  where token = p_token and status = 'aprovacao'
  returning card_id into v_card;

  if v_card is null then
    return false;
  end if;

  select id into v_coluna
  from quadro_colunas
  where lower(trim(nome)) = case when v_status = 'aprovado' then 'gravar' else 'revisão de roteiro' end
  order by ordem
  limit 1;

  if v_coluna is not null then
    update quadro_cards set coluna_id = v_coluna, updated_at = now() where id = v_card;
  end if;

  -- Roteiro aprovado conclui a etapa "Roteiro" do vídeo
  if v_status = 'aprovado' then
    update quadro_subtarefas set feito = true, status = 'concluido', updated_at = now()
    where card_id = v_card and lower(trim(nome)) = 'roteiro';
  end if;
  return true;
end;
$$;

revoke all on function roteiro_abrir(text) from public;
revoke all on function roteiro_responder(text, text, jsonb) from public;
grant execute on function roteiro_abrir(text) to anon, authenticated;
grant execute on function roteiro_responder(text, text, jsonb) to anon, authenticated;
