-- =====================================================================
-- DRE DA EMPRESA + ACESSOS (rodar UMA VEZ no SQL Editor do projeto do PAINEL UGC).
-- Seguro rodar de novo. Não apaga nem altera nenhum dado seu (só acrescenta).
--
-- Depende, nesta ordem, de: financeiro-reestruturacao-setup, -2-setup,
-- financeiro-permissoes-setup (parte 3), financeiro-permissoes-demais-tabelas-setup
-- (parte 4) e empresa-resumo-setup. Se algum faltar, o script avisa e não muda nada.
--
-- O que este arquivo faz:
--   1. Permissão POR PESSOA (permissoes_usuario): vale antes da permissão do papel.
--   2. Recursos novos: empresa_lancamentos (lançamentos da empresa) e retiradas.
--   3. Segurança POR LINHA em financas_despesas: linhas da frente 'Empresa' seguem
--      empresa_lancamentos; as do UGC seguem ugc_financas. Quem só vê a empresa nunca
--      lê campanha/despesa do UGC, nem direto pela API.
--   4. Tipos novos de lançamento (compartilhada, das, prolabore, distribuicao) e as
--      colunas de INSS/IRRF do pró-labore.
--   5. "Recebido na PF" sai da tabela do resumo e vai para resumo_mensal_retiradas
--      (permissão própria: dá pra esconder de alguém no banco, não só na tela).
--      Os valores atuais são COPIADOS antes de zerar na tabela antiga.
--   6. empresa_config (INSS padrão, saldo inicial das contas), acessos_log (quem entrou
--      e quando) e a função minhas_permissoes() que as páginas usam.
-- =====================================================================

-- 0. Conferência de pré-requisitos (para antes de mudar qualquer coisa)
do $$
begin
  if to_regprocedure('public.pode(text, text)') is null or to_regprocedure('public.aplicar_politicas(text, text[], text)') is null then
    raise exception 'Rode antes js/financeiro-permissoes-setup.sql (parte 3). Nada foi alterado.';
  end if;
  if to_regclass('public.resumo_mensal_frente') is null then
    raise exception 'Rode antes js/financeiro-reestruturacao-2-setup.sql e js/empresa-resumo-setup.sql. Nada foi alterado.';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'resumo_mensal_frente' and column_name = 'transferencias_liquidas') then
    raise exception 'Rode antes js/empresa-resumo-setup.sql. Nada foi alterado.';
  end if;
end $$;

-- 1. E-mail no perfil (pra listar quem tem acesso) e permissão por pessoa.
alter table perfis add column if not exists email text;
update perfis p set email = u.email from auth.users u where u.id = p.user_id and p.email is null;

create table if not exists permissoes_usuario (
  user_id uuid not null references auth.users(id) on delete cascade,
  recurso text not null,
  pode_ler boolean not null default false,
  pode_escrever boolean not null default false,
  primary key (user_id, recurso)
);

-- pode(): primeiro a exceção da PESSOA (se existir), senão a regra do PAPEL. Usuário inativo = nada.
create or replace function public.pode(p_recurso text, p_acao text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case p_acao when 'ler' then u.pode_ler when 'escrever' then u.pode_escrever else false end
       from permissoes_usuario u
       join perfis p on p.user_id = u.user_id and p.ativo
      where u.user_id = auth.uid() and u.recurso = p_recurso),
    (select case p_acao when 'ler' then m.pode_ler when 'escrever' then m.pode_escrever else false end
       from perfis p
       join permissoes m on m.papel = p.papel
      where p.user_id = auth.uid() and p.ativo and m.recurso = p_recurso),
    false
  );
$$;
revoke all on function public.pode(text, text) from public;
grant execute on function public.pode(text, text) to authenticated;

-- 2. Recursos novos na matriz dos papéis (editável depois; "retiradas" = bloco Retiradas e valor recebido na PF).
insert into permissoes (papel, recurso, pode_ler, pode_escrever) values
  ('dono',     'empresa_lancamentos', true,  true),
  ('dono',     'retiradas',           true,  true),
  ('socio',    'empresa_lancamentos', true,  true),
  ('socio',    'retiradas',           true,  false),
  ('contador', 'empresa_lancamentos', true,  false),
  ('contador', 'retiradas',           true,  false)
on conflict (papel, recurso) do nothing;

-- O contador, por padrão, NÃO lê nada do painel UGC (a parte 3 tinha dado leitura de finanças a ele).
-- Quem precisar vê o UGC ganha isso por pessoa (permissoes_usuario), pela área Acessos.
update permissoes set pode_ler = false, pode_escrever = false where papel = 'contador' and recurso = 'ugc_financas';

-- 3. Tipos de lançamento da empresa e colunas do pró-labore.
do $$
begin
  alter table financas_despesas drop constraint if exists financas_despesas_tipo_despesa_check;
  alter table financas_despesas add constraint financas_despesas_tipo_despesa_check
    check (tipo_despesa in ('campanha', 'avulsa', 'recorrente', 'equipamento', 'compartilhada', 'das', 'prolabore', 'distribuicao'));
end $$;
alter table financas_despesas add column if not exists inss_retido numeric;
alter table financas_despesas add column if not exists irrf numeric;

-- 4. Segurança por linha em financas_despesas (Empresa x UGC). Troca as políticas de usuário logado.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'financas_despesas'
      and 'authenticated' = any(roles) and not ('anon' = any(roles) or 'public' = any(roles))
  loop
    execute format('drop policy %I on public.financas_despesas', pol.policyname);
  end loop;
end $$;
create policy "ler financas_despesas" on financas_despesas for select to authenticated
  using (public.pode(case when frente = 'Empresa' then 'empresa_lancamentos' else 'ugc_financas' end, 'ler'));
create policy "inserir financas_despesas" on financas_despesas for insert to authenticated
  with check (public.pode(case when frente = 'Empresa' then 'empresa_lancamentos' else 'ugc_financas' end, 'escrever'));
create policy "alterar financas_despesas" on financas_despesas for update to authenticated
  using (public.pode(case when frente = 'Empresa' then 'empresa_lancamentos' else 'ugc_financas' end, 'escrever'))
  with check (public.pode(case when frente = 'Empresa' then 'empresa_lancamentos' else 'ugc_financas' end, 'escrever'));
create policy "excluir financas_despesas" on financas_despesas for delete to authenticated
  using (public.pode(case when frente = 'Empresa' then 'empresa_lancamentos' else 'ugc_financas' end, 'escrever'));

-- 5. Resumo: receita na PF (competência) fica no resumo; o recebido na PF (caixa pessoal) vai pra tabela própria.
alter table resumo_mensal_frente add column if not exists receita_pf numeric not null default 0;

create table if not exists resumo_mensal_retiradas (
  frente text not null,
  mes text not null check (mes ~ '^[0-9]{4}-[0-9]{2}$'),
  recebido_pf numeric not null default 0,
  atualizado_em timestamptz not null default now(),
  user_id uuid not null default auth.uid(),
  primary key (frente, mes)
);
select public.aplicar_politicas('resumo_mensal_retiradas', array['retiradas'], 'empresa_dre');

-- copia o que já estava no resumo e só então zera lá (rodar de novo não faz nada: já está zerado)
insert into resumo_mensal_retiradas (frente, mes, recebido_pf, user_id)
  select frente, mes, recebido_pf, user_id from resumo_mensal_frente where recebido_pf <> 0
  on conflict (frente, mes) do update set recebido_pf = excluded.recebido_pf, atualizado_em = now();
update resumo_mensal_frente set recebido_pf = 0 where recebido_pf <> 0;

-- 6. Configurações da empresa: legíveis por quem vê o DRE, alteráveis só por quem gerencia usuários (você).
create table if not exists empresa_config (
  chave text primary key,
  valor jsonb,
  atualizado_em timestamptz not null default now()
);
select public.aplicar_politicas('empresa_config', array['empresa_dre'], 'usuarios');
insert into empresa_config (chave, valor) values
  ('inss_retido_pct', '11'::jsonb),             -- INSS descontado do pró-labore (padrão 11%, editável a cada lançamento)
  ('irrf_padrao', '0'::jsonb),                  -- IRRF padrão do pró-labore (R$)
  ('inss_patronal_pct', '0'::jsonb),            -- INSS patronal sobre o pró-labore (no Simples costuma vir no DAS: 0)
  ('saldo_inicial', '{"nubank": 0, "mercado_pago": 0}'::jsonb)  -- somado ao movimento calculado pelo painel UGC
on conflict (chave) do nothing;

-- 7. Registro de acessos (quem entrou e quando). Cada pessoa grava só o próprio; só quem gerencia usuários lê.
create table if not exists acessos_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  email text,
  pagina text,
  em timestamptz not null default now()
);
create index if not exists idx_acessos_log_user_em on acessos_log (user_id, em desc);
alter table acessos_log enable row level security;
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'acessos_log' loop
    execute format('drop policy %I on public.acessos_log', pol.policyname);
  end loop;
end $$;
create policy "registrar o proprio acesso" on acessos_log for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from perfis p where p.user_id = auth.uid() and p.ativo));
create policy "ver acessos" on acessos_log for select to authenticated
  using ((select public.pode('usuarios', 'ler')));

-- 8. Permissões por pessoa: cada um lê as próprias; só quem gerencia usuários altera.
alter table permissoes_usuario enable row level security;
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'permissoes_usuario' loop
    execute format('drop policy %I on public.permissoes_usuario', pol.policyname);
  end loop;
end $$;
create policy "ver as proprias permissoes" on permissoes_usuario for select to authenticated
  using (user_id = auth.uid() or (select public.pode('usuarios', 'ler')));
create policy "gerir permissoes por pessoa" on permissoes_usuario for all to authenticated
  using ((select public.pode('usuarios', 'escrever'))) with check ((select public.pode('usuarios', 'escrever')));

-- 9. O que as páginas perguntam ao entrar: papel e permissões efetivas de quem está logado.
create or replace function public.minhas_permissoes()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'papel', p.papel, 'nome', p.nome, 'email', p.email, 'ativo', p.ativo,
    'permissoes', (
      select jsonb_object_agg(r, jsonb_build_object('ler', public.pode(r, 'ler'), 'escrever', public.pode(r, 'escrever')))
      from unnest(array['ugc_financas', 'ugc_operacao', 'config', 'empresa_dre', 'empresa_lancamentos', 'retiradas', 'usuarios']) as r
    )
  )
  from perfis p where p.user_id = auth.uid();
$$;
revoke all on function public.minhas_permissoes() from public;
grant execute on function public.minhas_permissoes() to authenticated;

-- Conferência (opcional), numa query separada:
--   select nome, papel, ativo, email from perfis;                       -- você como 'dono'
--   select tablename, policyname from pg_policies where schemaname = 'public'
--     and tablename in ('financas_despesas', 'resumo_mensal_retiradas', 'acessos_log', 'permissoes_usuario') order by 1, 2;
