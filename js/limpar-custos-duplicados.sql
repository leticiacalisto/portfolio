-- Custos duplicados em Resultados (lançados de novo, todos em outubro).
-- PASSO 1: rode só este SELECT e confira a lista (são as linhas que seriam apagadas).
-- Critério: mesma despesa (nome + valor) já existe com data em OUTRO mês e foi criada antes;
-- a cópia é a mais nova, tem data em outubro/2026, não é parcela/compra de fatura nem série.

create temp view custos_duplicados as
select d.id, d.nome, d.valor, d.data, d.created_at, o.data as data_original
from financas_despesas d
join financas_despesas o
  on o.id <> d.id
 and lower(trim(o.nome)) = lower(trim(d.nome))
 and o.valor = d.valor
 and o.created_at < d.created_at
 and o.contrato_id is not distinct from d.contrato_id
 and date_trunc('month', o.data) <> date_trunc('month', d.data)
where d.data >= date '2026-10-01' and d.data < date '2026-11-01'
  and d.parent_id is null
  and d.grupo_repeticao is null
  and coalesce(d.eh_fatura, false) = false
  and coalesce(d.so_fluxo, false) = false
  and coalesce(d.so_resultado, false) = false;

select * from custos_duplicados order by nome, created_at;

-- PASSO 2: se a lista acima for mesmo só duplicata, rode (tire os dois traços da frente):
-- delete from financas_despesas where id in (select id from custos_duplicados);
