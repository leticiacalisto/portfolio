-- =====================================================================
-- CRM / FUNIL DE VENDAS, FASE 1: campos novos, etapas novas e backfill.
-- Rode uma vez no Supabase (SQL Editor). Pode rodar de novo sem problema.
-- Depende de: comercial-setup, oportunidades-setup, oportunidades-etapas-setup,
-- dashboard-setup e (se existir) portfolio-setup de portfolio_leads.
--
-- NÃO coloca NOT NULL em captacao nem check em origem_lead/motivo_perda ainda:
-- o formulário atual grava texto livre e quebraria. Isso entra junto com a
-- fase 2 (botões e selects do card), depois que o backfill estiver completo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. OPORTUNIDADES: campos novos
-- ---------------------------------------------------------------------

-- captacao ganha o terceiro valor 'Reativação'
alter table oportunidades drop constraint if exists oportunidades_captacao_check;
alter table oportunidades add constraint oportunidades_captacao_check
  check (captacao is null or captacao in ('Inbound', 'Outbound', 'Reativação'));

alter table oportunidades add column if not exists cadencia text;
alter table oportunidades add column if not exists toque_n int not null default 0;
alter table oportunidades add column if not exists proxima_acao text;
alter table oportunidades add column if not exists modelo_sugerido text;
alter table oportunidades add column if not exists qualificacao jsonb not null default '{}'::jsonb;
alter table oportunidades add column if not exists proposta_enviada_em date;
alter table oportunidades add column if not exists data_retorno date;

create index if not exists idx_oportunidades_data_retorno on oportunidades(data_retorno);

-- ---------------------------------------------------------------------
-- 2. EMPRESAS (marcas): campos novos
-- ---------------------------------------------------------------------
alter table empresas add column if not exists porte text;
alter table empresas drop constraint if exists empresas_porte_check;
alter table empresas add constraint empresas_porte_check
  check (porte is null or porte in ('pequena', 'grande'));

alter table empresas add column if not exists seguidores_instagram int;
alter table empresas add column if not exists uf text;
alter table empresas add column if not exists usa_ugc boolean;
alter table empresas add column if not exists email_marketing text;
alter table empresas add column if not exists optout boolean not null default false;
alter table empresas add column if not exists proxima_reativacao date;
alter table empresas add column if not exists reativacao_toque int not null default 0;
-- ex.: {dia_das_maes, black_friday, natal}
alter table empresas add column if not exists datas_sazonais text[] not null default '{}';

create index if not exists idx_empresas_proxima_reativacao on empresas(proxima_reativacao);

-- ---------------------------------------------------------------------
-- 3. PORTFOLIO_LEADS: vínculo com a oportunidade criada (evita duplicar)
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.portfolio_leads') is not null then
    alter table portfolio_leads add column if not exists oportunidade_id uuid
      references oportunidades(id) on delete set null;
  else
    raise notice 'Tabela portfolio_leads não existe; pulei o vínculo com oportunidade.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. ETAPAS NOVAS DO FUNIL
-- Lista > Abordado > Qualificação > Proposta enviada > Negociação > Fechado > Perdido
-- Renomeia as etapas existentes no lugar (mantém o id, então as oportunidades
-- continuam apontando certo). Adiado e Negado são absorvidas por Perdido.
-- ---------------------------------------------------------------------
do $$
declare
  v_lista uuid;
  v_abordado uuid;
  v_qualif uuid;
  v_proposta uuid;
  v_negoc uuid;
  v_fechado uuid;
  v_perdido uuid;
  v_adiado uuid;
  v_negado uuid;
  v_enviar uuid;
  v_contatada uuid;
  v_prospectar uuid;
begin
  select id into v_prospectar from oportunidades_etapas where lower(trim(nome)) = 'prospectar' limit 1;
  select id into v_contatada  from oportunidades_etapas where lower(trim(nome)) = 'contatada' limit 1;
  select id into v_enviar     from oportunidades_etapas where lower(trim(nome)) = 'enviar proposta' limit 1;
  select id into v_adiado     from oportunidades_etapas where lower(trim(nome)) = 'adiado' limit 1;
  select id into v_negado     from oportunidades_etapas where lower(trim(nome)) = 'negado' limit 1;

  -- Lista (era Prospectar)
  select id into v_lista from oportunidades_etapas where lower(trim(nome)) = 'lista' limit 1;
  if v_lista is null then
    if v_prospectar is not null then
      update oportunidades_etapas set nome = 'Lista', ordem = 0, tipo = 'aberta' where id = v_prospectar;
      v_lista := v_prospectar;
    else
      insert into oportunidades_etapas (nome, cor, ordem, tipo) values ('Lista', '#8d8d8d', 0, 'aberta') returning id into v_lista;
    end if;
  end if;

  -- Abordado (era Contatada)
  select id into v_abordado from oportunidades_etapas where lower(trim(nome)) = 'abordado' limit 1;
  if v_abordado is null then
    if v_contatada is not null then
      update oportunidades_etapas set nome = 'Abordado', ordem = 1, tipo = 'aberta' where id = v_contatada;
      v_abordado := v_contatada;
    else
      insert into oportunidades_etapas (nome, cor, ordem, tipo) values ('Abordado', '#0091ff', 1, 'aberta') returning id into v_abordado;
    end if;
  end if;

  -- Qualificação (era Enviar Proposta; o checklist dessas já vem completo)
  select id into v_qualif from oportunidades_etapas where lower(trim(nome)) in ('qualificação', 'qualificacao') limit 1;
  if v_qualif is null then
    if v_enviar is not null then
      update oportunidades_etapas set nome = 'Qualificação', ordem = 2, tipo = 'aberta' where id = v_enviar;
      v_qualif := v_enviar;
      -- só marca como completo o que veio de "Enviar Proposta" e ainda não tem checklist
      update oportunidades
      set qualificacao = '{"produto":"ok","qtd_videos":"ok","budget":"ok","prazo":"ok"}'::jsonb
      where etapa_id = v_enviar and (qualificacao is null or qualificacao = '{}'::jsonb);
    else
      insert into oportunidades_etapas (nome, cor, ordem, tipo) values ('Qualificação', '#f76808', 2, 'aberta') returning id into v_qualif;
    end if;
  end if;

  -- Proposta enviada, Negociação, Fechado, Perdido: reaproveita ou cria
  select id into v_proposta from oportunidades_etapas where lower(trim(nome)) = 'proposta enviada' limit 1;
  if v_proposta is null then
    insert into oportunidades_etapas (nome, cor, ordem, tipo) values ('Proposta enviada', '#ffc53d', 3, 'aberta') returning id into v_proposta;
  end if;

  select id into v_negoc from oportunidades_etapas where lower(trim(nome)) in ('negociação', 'negociacao') limit 1;
  if v_negoc is null then
    insert into oportunidades_etapas (nome, cor, ordem, tipo) values ('Negociação', '#a18072', 4, 'aberta') returning id into v_negoc;
  end if;

  select id into v_fechado from oportunidades_etapas where lower(trim(nome)) = 'fechado' limit 1;
  if v_fechado is null then
    insert into oportunidades_etapas (nome, cor, ordem, tipo) values ('Fechado', '#008844', 5, 'ganha') returning id into v_fechado;
  end if;

  select id into v_perdido from oportunidades_etapas where lower(trim(nome)) = 'perdido' limit 1;
  if v_perdido is null then
    insert into oportunidades_etapas (nome, cor, ordem, tipo) values ('Perdido', '#e5484d', 6, 'perdida') returning id into v_perdido;
  end if;

  -- Adiado -> Perdido (timing); Negado -> Perdido (sem_interesse)
  if v_adiado is not null then
    update oportunidades set etapa_id = v_perdido, motivo_perda = 'timing' where etapa_id = v_adiado;
  end if;
  if v_negado is not null then
    update oportunidades set etapa_id = v_perdido, motivo_perda = 'sem_interesse' where etapa_id = v_negado;
  end if;

  -- Ordem e tipo finais
  update oportunidades_etapas set ordem = 0, tipo = 'aberta'  where id = v_lista;
  update oportunidades_etapas set ordem = 1, tipo = 'aberta'  where id = v_abordado;
  update oportunidades_etapas set ordem = 2, tipo = 'aberta'  where id = v_qualif;
  update oportunidades_etapas set ordem = 3, tipo = 'aberta'  where id = v_proposta;
  update oportunidades_etapas set ordem = 4, tipo = 'aberta'  where id = v_negoc;
  update oportunidades_etapas set ordem = 5, tipo = 'ganha'   where id = v_fechado;
  update oportunidades_etapas set ordem = 6, tipo = 'perdida' where id = v_perdido;

  -- Remove as etapas que sobraram (Adiado, Negado e qualquer outra fora do funil novo),
  -- depois de garantir que nenhuma oportunidade aponta pra elas.
  update oportunidades set etapa_id = v_lista
  where etapa_id is not null
    and etapa_id not in (v_lista, v_abordado, v_qualif, v_proposta, v_negoc, v_fechado, v_perdido);

  delete from oportunidades_etapas
  where id not in (v_lista, v_abordado, v_qualif, v_proposta, v_negoc, v_fechado, v_perdido);

  -- coluna legada "etapa" (texto) acompanha o nome da etapa nova
  update oportunidades o set etapa = e.nome
  from oportunidades_etapas e
  where o.etapa_id = e.id and o.etapa is distinct from e.nome;
end $$;

-- ---------------------------------------------------------------------
-- 5. BACKFILL de captação
-- Só o que é certo. 'Whatsapp' e 'DM Instagram' podem ser Inbound ou Outbound,
-- então ficam de fora até a Letícia decidir (veja a conferência no fim).
-- ---------------------------------------------------------------------
update oportunidades set captacao = 'Outbound'
where captacao is null and origem_lead = 'Importação de planilha';

-- ---------------------------------------------------------------------
-- 6. CONFERÊNCIA (rode separado e me mande o resultado)
-- ---------------------------------------------------------------------
-- select e.nome as etapa, e.tipo, count(o.id) as qtde
--   from oportunidades_etapas e left join oportunidades o on o.etapa_id = e.id
--  group by e.nome, e.tipo, e.ordem order by e.ordem;
--
-- select origem_lead, captacao, count(*) from oportunidades
--  group by 1, 2 order by 3 desc;
