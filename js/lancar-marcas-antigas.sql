-- =====================================================================
-- MARCAS JÁ TRABALHADAS + CAMPANHAS DE 2026 (rodar UMA VEZ no SQL Editor)
--
--  1) Renomeia "Broche e Crachá" -> "Laser Design" (mesma marca, não cria nova).
--  2) Cadastra as marcas antigas como FECHADAS, sem campanha vinculada.
--  3) Cria as campanhas de 2026 de: Life by Vivara, Hotel Renar, Espaço Laser,
--     Havan, Glam (1 vídeo, permuta, já concluído) e Webhoje (R$ 80, sem vídeo,
--     paga em 17/07).
--
-- Seguro rodar de novo: não duplica marca nem campanha (pula campanha que já
-- existe com a mesma marca e data). Tudo numa transação só.
-- Depende do painel já publicado com "Fechado" para marca sem campanha.
-- =====================================================================

do $$
declare
  v record;
  v_empresa uuid;
  v_contrato uuid;
  v_card uuid;
  v_coluna_final uuid;
  v_leticia uuid[];
  v_etapa text;
  v_ordem int;
  v_antigo text;
begin
  select id into v_coluna_final from quadro_colunas order by ordem desc limit 1;
  if v_coluna_final is null then
    raise exception 'Não achei nenhuma fase no quadro (quadro_colunas).';
  end if;
  select coalesce(array_agg(id), '{}') into v_leticia
  from (select id from quadro_etiquetas where lower(nome) like 'let_cia%' order by created_at limit 1) e;

  -- 1) renomear Broche e Crachá -> Laser Design
  for v_antigo in select nome from empresas where lower(nome) like '%broche%' and lower(nome) like '%crach%' loop
    if exists (select 1 from empresas where lower(trim(nome)) = 'laser design') then
      raise notice 'Já existe Laser Design; "%" não foi renomeada (junte as duas pelo painel).', v_antigo;
    else
      update empresas set nome = 'Laser Design', updated_at = now() where nome = v_antigo;
      update contratos set marca = 'Laser Design' where marca = v_antigo;
      update financas_receitas set marca = 'Laser Design' where marca = v_antigo;
      raise notice 'Renomeada: % -> Laser Design', v_antigo;
    end if;
  end loop;

  -- 2) marcas antigas, sem campanha: ficam como Fechado
  for v in
    select unnest(array[
      'Comfort','Simple Organic','Mercado Livre','Gold Spel','Basico.com','Alphahall','Lof',
      'The Therapy','Portallar','Bisyou','Wishin','Ave Rara','MAC','Laser Design'
    ]) as nome
  loop
    insert into empresas (nome, status) values (v.nome, 'Fechado')
      on conflict ((lower(trim(nome)))) do update set status = 'Fechado', updated_at = now();
  end loop;

  -- 3) campanhas de 2026 (todas 1 vídeo concluído; permuta = sem cachê)
  for v in
    select * from (values
      -- marca,           video,                 plataforma,        escopo,                          contrato,          enviado,           concluido,         cache
      ('Havan',           'Havan 01',            null,              '1 vídeo UGC (permuta)',         date '2026-06-28', date '2026-06-28', date '2026-06-28', 0::numeric),
      ('Hotel Renar',     'Hotel Renar 01',      null,              '1 vídeo UGC (permuta)',         date '2026-06-05', date '2026-06-05', date '2026-06-05', 0),
      ('Life by Vivara',  'Life by Vivara 01',   'Seu Influêncer',  '1 vídeo (influenciador, permuta)', date '2026-04-01', date '2026-05-29', date '2026-06-01', 0),
      ('Espaço Laser',    'Espaço Laser 01',     'Seu Influêncer',  '1 vídeo (influenciador, permuta)', date '2026-03-23', date '2026-03-25', date '2026-03-25', 0),
      ('Glam',            'Glam 01',             null,              '1 vídeo UGC (permuta)',         date '2026-05-26', date '2026-05-26', date '2026-05-26', 0)
    ) as t(marca, video, plataforma, escopo, contrato, enviado, concluido, cache)
  loop
    if exists (select 1 from contratos where lower(trim(marca)) = lower(trim(v.marca)) and data_assinatura = v.contrato) then
      raise notice 'Já existe campanha de % em %, pulando.', v.marca, v.contrato;
      continue;
    end if;
    insert into empresas (nome) values (v.marca) on conflict ((lower(trim(nome)))) do nothing;
    select id into v_empresa from empresas where lower(trim(nome)) = lower(trim(v.marca));

    insert into contratos (marca, empresa_id, escopo, qtde_videos, plataforma_agencia, data_assinatura, valor)
    values (v.marca, v_empresa, v.escopo, 1, v.plataforma, v.contrato, v.cache)
    returning id into v_contrato;

    insert into quadro_cards (titulo, coluna_id, contrato_id, formato, concluido_em, enviado_em, created_at)
    values (v.video, v_coluna_final, v_contrato, 'ugc', v.concluido::timestamptz + interval '12 hours', v.enviado::timestamptz + interval '12 hours', v.contrato::timestamptz + interval '12 hours')
    returning id into v_card;

    v_ordem := 0;
    foreach v_etapa in array array['Roteiro', 'Gravação', 'Edição', 'Revisão'] loop
      insert into quadro_subtarefas (card_id, nome, ordem, feito, status, etiqueta_ids)
      values (v_card, v_etapa, v_ordem, true, 'concluido', v_leticia);
      v_ordem := v_ordem + 1;
    end loop;
  end loop;

  -- Webhoje: R$ 80, combo de stories (sem vídeo), concluída e paga em 17/07
  if exists (select 1 from contratos where lower(trim(marca)) = 'webhoje' and data_assinatura = date '2026-07-17') then
    raise notice 'Já existe campanha de Webhoje em 2026-07-17, pulando.';
  else
    insert into empresas (nome) values ('Webhoje') on conflict ((lower(trim(nome)))) do nothing;
    select id into v_empresa from empresas where lower(trim(nome)) = 'webhoje';
    insert into contratos (marca, empresa_id, escopo, qtde_videos, data_assinatura, valor)
    values ('Webhoje', v_empresa, 'Combo de stories', 0, date '2026-07-17', 80)
    returning id into v_contrato;
    insert into financas_receitas
      (marca, contrato_id, tipo, categoria, descricao, contratacao, pagamento, pago_em, cache, produto, videos, status, valor_pago, etiquetas)
    values
      ('Webhoje', v_contrato, 'parcela', 'Campanhas', 'Pagamento', date '2026-07-17', date '2026-07-17', date '2026-07-17', 80, 0, 0, 'Pago', 80, '{}');
  end if;
end $$;

-- Conferência
select e.nome, e.status, count(k.id) as campanhas
from empresas e left join contratos k on k.empresa_id = e.id
where lower(e.nome) in ('comfort','simple organic','mercado livre','life by vivara','gold spel','basico.com','alphahall','lof',
  'the therapy','portallar','bisyou','wishin','ave rara','hotel renar','espaço laser','mac','laser design','webhoje','havan','glam')
group by e.nome, e.status order by e.nome;
