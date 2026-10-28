-- =====================================================================
-- REESTRUTURAÇÃO FINANCEIRA (Resultados x Fluxo de Caixa x Campanhas)
-- Rode UMA VEZ no SQL Editor do Supabase. Pode rodar de novo sem problema
-- (nada aqui apaga ou reescreve dado seu: só cria cópias, colunas e tabelas;
-- os ajustes retroativos só rodam na primeira vez que a coluna é criada).
--
-- Junta num arquivo só:
--   0. BACKUP das tabelas financeiras (bkp_*_20261028)
--   1. financas-parcelas-automaticas-setup.sql
--   2. financas-fluxo-caixa-setup.sql
--   3. financas-resultados-setup.sql
--   4. financas-competencia-setup.sql
--   5. direitos-extensao-setup.sql
--   6. colunas/tabelas NOVAS da reestruturação
--
-- NÃO inclui financas-setup.sql nem financas-receitas-campanha-setup.sql:
-- o primeiro tem os dados históricos (inserts) e não pode rodar de novo.
-- =====================================================================


-- =====================================================================
-- 0. BACKUP (cópia completa, antes de qualquer alteração)
-- Se a cópia já existe (rodou antes), não sobrescreve. Ficam trancadas
-- (RLS ligada e sem policy): só você, pelo SQL Editor/Table Editor, enxerga.
-- Para voltar atrás depois, é só copiar de volta a partir delas.
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array['financas_receitas', 'financas_despesas', 'financas_categorias', 'contratos', 'painel_config']
  loop
    if to_regclass('public.' || t) is not null
       and to_regclass('public.bkp_' || t || '_20261028') is null then
      execute format('create table public.bkp_%s_20261028 as select * from public.%I', t, t);
      execute format('alter table public.bkp_%s_20261028 enable row level security', t);
    end if;
  end loop;
end $$;


-- =====================================================================
-- 1. PARCELAS AUTOMÁTICAS + CUSTOS DE PRODUÇÃO DA CAMPANHA
-- =====================================================================
alter table financas_receitas add column if not exists auto_gerada boolean not null default false;
alter table financas_receitas add column if not exists chave_auto text;
alter table financas_receitas add column if not exists pago_em date;

alter table financas_despesas add column if not exists contrato_id uuid references contratos(id) on delete set null;
alter table financas_despesas add column if not exists status text not null default 'Pendente' check (status in ('Pendente', 'Pago'));
alter table financas_despesas add column if not exists pago_em date;

create index if not exists idx_financas_despesas_contrato on financas_despesas(contrato_id);


-- =====================================================================
-- 2. FLUXO DE CAIXA v2
-- =====================================================================
alter table financas_receitas add column if not exists categoria text;
alter table financas_receitas add column if not exists vencimento date;
alter table financas_receitas add column if not exists parent_id uuid references financas_receitas(id) on delete cascade;
alter table financas_receitas add column if not exists fixa boolean not null default false;
alter table financas_receitas add column if not exists repetir_vezes int;
alter table financas_receitas add column if not exists repetir_periodo text;
alter table financas_receitas add column if not exists grupo_repeticao uuid;
alter table financas_receitas add column if not exists emissao_nf boolean not null default false;
alter table financas_receitas add column if not exists nf_taxa numeric;

alter table financas_despesas add column if not exists categoria text;
alter table financas_despesas add column if not exists parent_id uuid references financas_despesas(id) on delete cascade;
alter table financas_despesas add column if not exists fixa boolean not null default false;
alter table financas_despesas add column if not exists repetir_vezes int;
alter table financas_despesas add column if not exists repetir_periodo text;
alter table financas_despesas add column if not exists grupo_repeticao uuid;
alter table financas_despesas add column if not exists eh_fatura boolean not null default false;
alter table financas_despesas add column if not exists fitid text;

alter table contratos add column if not exists emissao_nf boolean not null default false;
alter table contratos add column if not exists nf_taxa numeric default 6;
alter table contratos add column if not exists valor_produto numeric;

create index if not exists idx_financas_receitas_parent on financas_receitas(parent_id);
create index if not exists idx_financas_despesas_parent on financas_despesas(parent_id);
create index if not exists idx_financas_despesas_fitid on financas_despesas(fitid);

-- valor_pago + retroativo: só na primeira vez (se a coluna já existe, não mexe em nada)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'financas_receitas' and column_name = 'valor_pago') then
    alter table financas_receitas add column valor_pago numeric not null default 0;
    update financas_receitas set valor_pago = coalesce(cache, 0)
      where status = 'Pago' and contrato_id is null and parent_id is null and valor_pago = 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'financas_despesas' and column_name = 'valor_pago') then
    alter table financas_despesas add column valor_pago numeric not null default 0;
    update financas_despesas set valor_pago = valor where status = 'Pago' and valor_pago = 0;
  end if;
end $$;

-- Categoria: só preenche onde está vazia (não troca nenhuma que você já escolheu)
update financas_receitas set categoria = 'Campanhas' where contrato_id is not null and categoria is null;
update financas_despesas set categoria = 'Campanhas' where contrato_id is not null and categoria is null;
update financas_receitas set categoria = etiquetas[1]
  where categoria is null and contrato_id is null and array_length(etiquetas, 1) > 0;
update financas_despesas set categoria = etiquetas[1]
  where categoria is null and contrato_id is null and array_length(etiquetas, 1) > 0;

create table if not exists financas_categorias (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('receita', 'despesa')),
  nome text not null,
  created_at timestamptz not null default now(),
  unique (tipo, nome)
);

alter table financas_categorias enable row level security;
drop policy if exists "autenticados podem tudo em financas_categorias" on financas_categorias;
create policy "autenticados podem tudo em financas_categorias"
  on financas_categorias for all to authenticated using (true) with check (true);

insert into financas_categorias (tipo, nome) values ('receita', 'Campanhas'), ('despesa', 'Campanhas')
  on conflict do nothing;
insert into financas_categorias (tipo, nome)
  select distinct 'receita', categoria from financas_receitas where categoria is not null
  on conflict do nothing;
insert into financas_categorias (tipo, nome)
  select distinct 'despesa', categoria from financas_despesas where categoria is not null
  on conflict do nothing;


-- =====================================================================
-- 3. RESULTADOS: despesa fixa com encerramento + depreciação
-- =====================================================================
alter table financas_despesas add column if not exists fixa_ate date;
alter table financas_despesas add column if not exists infra_meses int;
alter table financas_despesas add column if not exists infra_valor_total numeric;

insert into financas_categorias (tipo, nome) values
  ('despesa', 'Operacional'),
  ('despesa', 'Marketing'),
  ('despesa', 'Infraestrutura'),
  ('despesa', 'Capacitação'),
  ('despesa', 'Outros')
on conflict (tipo, nome) do nothing;


-- =====================================================================
-- 4. CUSTO (Resultados) x PAGAMENTO (Fluxo de Caixa)
--   data             = data do PAGAMENTO  -> Fluxo de Caixa
--   data_competencia = data do CUSTO      -> Resultados
--   so_resultado     = linha só de Resultados (ex.: depreciação mensal)
--   so_fluxo         = linha só do Fluxo (ex.: parcela da compra do equipamento)
-- A conversão das despesas de infraestrutura antigas só roda na 1ª vez.
-- =====================================================================
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'financas_despesas' and column_name = 'so_resultado') then
    alter table financas_despesas add column if not exists data_competencia date;
    alter table financas_despesas add column so_resultado boolean not null default false;
    alter table financas_despesas add column if not exists so_fluxo boolean not null default false;

    update financas_despesas set data_competencia = data where data_competencia is null and data is not null;

    insert into financas_despesas (nome, categoria, data, data_competencia, valor, status, valor_pago, so_fluxo, grupo_repeticao, contrato_id, parent_id)
    select distinct on (grupo_repeticao)
      nome, categoria, data, data, infra_valor_total, 'Pendente', 0, true, grupo_repeticao, null, null
    from financas_despesas
    where infra_meses is not null and grupo_repeticao is not null and so_resultado = false and so_fluxo = false
    order by grupo_repeticao, data;

    update financas_despesas set so_resultado = true
    where infra_meses is not null and so_fluxo = false;
  else
    alter table financas_despesas add column if not exists data_competencia date;
    alter table financas_despesas add column if not exists so_fluxo boolean not null default false;
  end if;
end $$;


-- =====================================================================
-- 5. DIREITOS DE USO (extensão em dias)
-- =====================================================================
alter table quadro_cards add column if not exists direitos_extensao_dias integer not null default 0;


-- =====================================================================
-- 6. NOVO NA REESTRUTURAÇÃO
-- =====================================================================

-- 6a. Despesa: tipo, frente, conta e forma de pagamento.
--     Despesas que já existem ficam como UGC / Nubank PJ (o padrão que você definiu).
--     tipo_despesa fica vazio nas antigas; o painel mostra uma tela de conferência
--     pra você classificar em lote (nada é reclassificado sozinho).
alter table financas_despesas add column if not exists tipo_despesa text
  check (tipo_despesa in ('campanha', 'avulsa', 'recorrente', 'equipamento'));
alter table financas_despesas add column if not exists frente text not null default 'UGC'
  check (frente in ('UGC', 'Empresa'));
alter table financas_despesas add column if not exists conta text not null default 'Nubank PJ'
  check (conta in ('Nubank PJ', 'Mercado Pago', 'Outra'));
alter table financas_despesas add column if not exists forma_pagamento text;      -- Pix, À vista, Cartão, Boleto
alter table financas_despesas add column if not exists recorrencia text
  check (recorrencia in ('mensal', 'anual'));
alter table financas_despesas add column if not exists amortizar_meses int;       -- capacitação "amortizar em N meses"

-- 6b. Faturamento da receita (Empresa PJ com nota, etc.). Texto livre de propósito:
--     as opções exatas entram quando o painel for atualizado.
alter table contratos add column if not exists faturamento text;
alter table financas_receitas add column if not exists faturamento text;

-- 6c. Alíquota do Simples (frente UGC) por mês. Mês sem linha usa o último informado.
--     mes = sempre o dia 1º do mês.
create table if not exists financas_aliquotas (
  mes date primary key check (extract(day from mes) = 1),
  aliquota numeric not null check (aliquota >= 0 and aliquota <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table financas_aliquotas enable row level security;
drop policy if exists "autenticados podem tudo em financas_aliquotas" on financas_aliquotas;
create policy "autenticados podem tudo em financas_aliquotas"
  on financas_aliquotas for all to authenticated using (true) with check (true);

insert into financas_aliquotas (mes, aliquota) values ('2026-09-01', 6) on conflict (mes) do nothing;

-- 6d. Configurações (usa painel_config, que já existe pelo menu-principal-setup.sql).
--     Só cria se ainda não existir: nunca sobrescreve o que você já editou.
create table if not exists painel_config (
  chave text primary key,
  valor jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table painel_config enable row level security;
drop policy if exists "autenticados podem tudo em painel_config" on painel_config;
create policy "autenticados podem tudo em painel_config"
  on painel_config for all to authenticated using (true) with check (true);

insert into painel_config (chave, valor) values
  ('fin_deprec_minimo', '500'::jsonb),
  ('fin_vida_util', '{"Celular": 24, "Câmera": 36, "Notebook": 36, "Microfone": 36, "Iluminação": 36, "Tripé": 36}'::jsonb),
  ('fin_regime', '{"mei_ate": "2026-08", "simples_desde": "2026-09"}'::jsonb)
on conflict (chave) do nothing;

-- 6e. Categorias da lista nova (as que você já tinha continuam; nenhuma é apagada).
insert into financas_categorias (tipo, nome) values
  ('despesa', 'Edição'),
  ('despesa', 'Produtos/props'),
  ('despesa', 'Frete'),
  ('despesa', 'Comissão de plataforma'),
  ('despesa', 'Software e assinaturas'),
  ('despesa', 'Equipamentos'),
  ('despesa', 'Impostos e taxas'),
  ('despesa', 'Despesa da empresa (compartilhada)'),
  ('despesa', 'Transferência entre contas'),
  ('receita', 'Transferência entre contas')
on conflict (tipo, nome) do nothing;

-- =====================================================================
-- CONFERÊNCIA (opcional): rode isto depois, numa query separada. Tem que
-- listar todas as colunas abaixo; se faltar alguma, algo não rodou.
--
--   select table_name, column_name from information_schema.columns
--   where table_schema = 'public'
--     and ((table_name = 'financas_despesas' and column_name in
--            ('valor_pago','parent_id','fixa_ate','infra_meses','so_resultado','so_fluxo','data_competencia','tipo_despesa','frente','conta'))
--       or (table_name = 'financas_receitas' and column_name in ('valor_pago','pago_em','faturamento'))
--       or (table_name = 'quadro_cards' and column_name = 'direitos_extensao_dias'))
--   order by 1, 2;
-- =====================================================================
