-- Resultados (antiga aba "DRE"): despesas da empresa com recorrência fixa (data
-- de encerramento) e depreciação de infraestrutura (valor total / tempo de uso,
-- lançado mês a mês até o período de uso acabar).
alter table financas_despesas add column if not exists fixa_ate date;
alter table financas_despesas add column if not exists infra_meses int;
alter table financas_despesas add column if not exists infra_valor_total numeric;

-- Categorias padrão de despesa da empresa (a lista de categorias já é 100%
-- editável pelo próprio painel — isso só garante que essas cinco já existam).
insert into financas_categorias (tipo, nome) values
  ('despesa', 'Operacional'),
  ('despesa', 'Marketing'),
  ('despesa', 'Infraestrutura'),
  ('despesa', 'Capacitação'),
  ('despesa', 'Outros')
on conflict (tipo, nome) do nothing;
