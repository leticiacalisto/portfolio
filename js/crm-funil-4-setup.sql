-- =====================================================================
-- CRM / FUNIL, FASE 7: histórico do funil para o Dashboard.
-- Rode uma vez no Supabase (SQL Editor), DEPOIS de js/crm-funil-setup.sql.
-- Pode rodar de novo sem problema.
--
-- Guarda automaticamente (por gatilho no banco, então vale para botão,
-- arrastar no Kanban, formulário e qualquer outra tela):
--   - cada mudança de etapa de uma oportunidade (tempo médio por etapa);
--   - cada contato registrado (follow-ups feitos no mês).
-- O histórico começa agora: o que já passou não tem como ser reconstruído.
-- Cada oportunidade existente entra com a etapa atual, datada pela última
-- alteração dela.
-- =====================================================================

create table if not exists oportunidades_eventos (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references oportunidades(id) on delete cascade,
  tipo text not null check (tipo in ('etapa', 'contato')),
  etapa_id uuid references oportunidades_etapas(id) on delete set null,
  etapa_anterior_id uuid references oportunidades_etapas(id) on delete set null,
  toque_n int,
  created_at timestamptz not null default now()
);

create index if not exists idx_oportunidades_eventos_op on oportunidades_eventos(oportunidade_id, created_at);
create index if not exists idx_oportunidades_eventos_tipo on oportunidades_eventos(tipo, created_at);

-- Gatilho (roda com o direito de quem criou a função, para valer para qualquer usuário do painel)
create or replace function public.registrar_evento_oportunidade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into oportunidades_eventos (oportunidade_id, tipo, etapa_id, etapa_anterior_id, toque_n)
    values (new.id, 'etapa', new.etapa_id, null, new.toque_n);
    return new;
  end if;

  if new.etapa_id is distinct from old.etapa_id then
    insert into oportunidades_eventos (oportunidade_id, tipo, etapa_id, etapa_anterior_id, toque_n)
    values (new.id, 'etapa', new.etapa_id, old.etapa_id, new.toque_n);
  end if;

  -- contato registrado: o toque subiu, ou foi a 1ª mensagem de uma cadência de qualificação
  if coalesce(new.toque_n, 0) > coalesce(old.toque_n, 0)
     or (new.cadencia like 'QUALIF%' and old.proximo_followup is null and new.proximo_followup is not null) then
    insert into oportunidades_eventos (oportunidade_id, tipo, etapa_id, toque_n)
    values (new.id, 'contato', new.etapa_id, new.toque_n);
  end if;
  return new;
end $$;

drop trigger if exists trg_evento_oportunidade on oportunidades;
create trigger trg_evento_oportunidade
  after insert or update on oportunidades
  for each row execute function public.registrar_evento_oportunidade();

-- Quem opera o UGC lê e escreve (mesmo padrão das outras tabelas)
do $$
begin
  if to_regprocedure('public.aplicar_politicas(text, text[], text)') is not null then
    perform public.aplicar_politicas('oportunidades_eventos', array['ugc_operacao'], 'ugc_operacao');
  else
    alter table oportunidades_eventos enable row level security;
    drop policy if exists "autenticados podem tudo em oportunidades_eventos" on oportunidades_eventos;
    create policy "autenticados podem tudo em oportunidades_eventos"
      on oportunidades_eventos for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Ponto de partida: a etapa em que cada oportunidade está hoje
insert into oportunidades_eventos (oportunidade_id, tipo, etapa_id, toque_n, created_at)
select o.id, 'etapa', o.etapa_id, o.toque_n, coalesce(o.updated_at, o.created_at)
from oportunidades o
where not exists (select 1 from oportunidades_eventos e where e.oportunidade_id = o.id);
