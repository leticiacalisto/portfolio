-- Campo "Observação" (ex.: conta usada) nas entradas e saídas do Fluxo de Caixa.
-- Rode uma vez no SQL Editor do Supabase.
alter table financas_receitas add column if not exists observacao text;
alter table financas_despesas add column if not exists observacao text;
