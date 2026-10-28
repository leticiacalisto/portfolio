-- Conta de cada entrada (Nubank PJ, Mercado Pago ou Outra), igual ao que as despesas já têm.
-- Rodar uma vez no SQL Editor do projeto UGC (yqshjfzcoyiqikjnukyb). Pode rodar de novo sem problema.
--
-- Entradas que já existem ficam como "Nubank PJ" (era o que o painel já assumia).
-- O reajuste de saldo não precisa de tabela nova: fica em painel_config (chave fin_saldo_ancora).

alter table public.financas_receitas
  add column if not exists conta text not null default 'Nubank PJ';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.financas_receitas'::regclass and conname = 'financas_receitas_conta_check'
  ) then
    alter table public.financas_receitas
      add constraint financas_receitas_conta_check check (conta in ('Nubank PJ', 'Mercado Pago', 'Outra'));
  end if;
end $$;

select conta, count(*) as entradas from public.financas_receitas group by conta order by conta;
