-- =====================================================================
-- REESTRUTURAÇÃO FINANCEIRA — PARTE 2 (rodar UMA VEZ no SQL Editor).
-- Depende de js/financeiro-reestruturacao-setup.sql (parte 1) já ter rodado.
-- Seguro rodar de novo. Não altera nem apaga nenhum dado seu.
--
--   * aliquota_manual: alíquota digitada na linha de uma receita/campanha
--     (sobrescreve a alíquota do Simples do mês). Vazio = usa a do mês.
--   * fornecedor: campo opcional da "Nova despesa".
--   * resumo_mensal_frente: um resumo por frente e por mês, gravado pelo
--     painel, pra futura página da empresa somar as frentes (UGC + loja).
--     Só o usuário que gravou lê e grava (user_id = auth.uid()).
-- =====================================================================

alter table contratos add column if not exists aliquota_manual numeric;
alter table financas_receitas add column if not exists aliquota_manual numeric;
alter table financas_despesas add column if not exists fornecedor text;

create table if not exists resumo_mensal_frente (
  frente text not null,
  mes text not null check (mes ~ '^[0-9]{4}-[0-9]{2}$'),
  receita_bruta numeric not null default 0,
  impostos_estimados numeric not null default 0,
  custos_diretos numeric not null default 0,
  despesas_proprias numeric not null default 0,
  depreciacao numeric not null default 0,
  resultado_frente numeric not null default 0,
  recebido_pf numeric not null default 0,
  caixa_entradas numeric not null default 0,
  caixa_saidas numeric not null default 0,
  saldo_conta numeric not null default 0,
  atualizado_em timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  primary key (frente, mes)
);

alter table resumo_mensal_frente enable row level security;
drop policy if exists "so o dono le e grava resumo_mensal_frente" on resumo_mensal_frente;
create policy "so o dono le e grava resumo_mensal_frente"
  on resumo_mensal_frente for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Conferência (opcional), numa query separada:
--   select column_name from information_schema.columns
--   where table_schema = 'public' and column_name in ('aliquota_manual', 'fornecedor');
--   select count(*) from resumo_mensal_frente;
