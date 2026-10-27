-- Custo (Resultados) x Pagamento (Fluxo de Caixa) na mesma despesa.
--
--   data             = data do PAGAMENTO  -> aparece no Fluxo de Caixa
--   data_competencia = data do CUSTO      -> aparece em Resultados (vazia = igual à data)
--   so_resultado     = linha que existe só em Resultados (ex.: depreciação mensal)
--   so_fluxo         = linha que existe só no Fluxo (ex.: parcela paga da compra do equipamento)
--   grupo_repeticao  = o que liga as linhas (depreciação + parcelas do mesmo item)
--
-- Rodar UMA vez no SQL Editor. Seguro rodar de novo.
alter table financas_despesas add column if not exists data_competencia date;
alter table financas_despesas add column if not exists so_resultado boolean not null default false;
alter table financas_despesas add column if not exists so_fluxo boolean not null default false;

-- Tudo que já existe: custo na mesma data do pagamento.
update financas_despesas set data_competencia = data where data_competencia is null and data is not null;

-- Infraestrutura já lançada: as linhas mensais eram a depreciação, então passam a valer só em
-- Resultados, e entra UM pagamento à vista com o valor total no Fluxo (ajuste a data/parcelas
-- depois, pelo Fluxo de Caixa, se foi parcelado).
insert into financas_despesas (nome, categoria, data, data_competencia, valor, status, valor_pago, so_fluxo, grupo_repeticao, contrato_id, parent_id)
select distinct on (grupo_repeticao)
  nome, categoria, data, data, infra_valor_total, 'Pendente', 0, true, grupo_repeticao, null, null
from financas_despesas
where infra_meses is not null and grupo_repeticao is not null and so_resultado = false and so_fluxo = false
order by grupo_repeticao, data;

update financas_despesas set so_resultado = true
where infra_meses is not null and so_fluxo = false;
