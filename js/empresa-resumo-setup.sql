-- =====================================================================
-- DRE DA EMPRESA — colunas novas do resumo mensal (rodar UMA VEZ no SQL Editor
-- do projeto do PAINEL, o mesmo do painel UGC). Seguro rodar de novo.
-- Depende de js/financeiro-reestruturacao-2-setup.sql (cria resumo_mensal_frente).
--
-- A frente 'ugc' é gravada pelo painel UGC, logado. A frente 'mercado_livre' chega da
-- loja Bela Ordem pela função receber-resumo-frente (chave secreta, sem login).
-- Convenção: todos os valores em reais; saídas e pagamentos POSITIVOS.
--   caixa_entradas / caixa_saidas  -> SEM transferência entre contas e sem a caixinha
--   transferencias_liquidas        -> o líquido das transferências entre contas (Mercado Pago <-> Nubank PJ)
--   saldo_conta                    -> caixa total da conta no fim do mês
--   *_pago                         -> quanto saiu DESTA conta no mês para pró-labore, despesas
--                                     compartilhadas, distribuição de lucros e DAS
-- =====================================================================
alter table resumo_mensal_frente add column if not exists outras_receitas numeric not null default 0;
alter table resumo_mensal_frente add column if not exists consumo_e_perdas numeric not null default 0;
alter table resumo_mensal_frente add column if not exists transferencias_liquidas numeric not null default 0;
alter table resumo_mensal_frente add column if not exists prolabore_pago numeric not null default 0;
alter table resumo_mensal_frente add column if not exists despesas_compartilhadas_pagas numeric not null default 0;
alter table resumo_mensal_frente add column if not exists distribuicao_lucros_paga numeric not null default 0;
alter table resumo_mensal_frente add column if not exists das_pago numeric not null default 0;

-- Conferência (opcional), numa query separada:
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'resumo_mensal_frente' order by ordinal_position;
