-- =====================================================================
-- PAPÉIS E PERMISSÕES (parte 3) — rodar UMA VEZ no SQL Editor do Supabase.
-- Depende da parte 1 (financeiro-reestruturacao-setup.sql); a parte 2 pode
-- rodar antes ou depois. Seguro rodar de novo.
--
-- MODELO (fácil de estender, sem regra amarrada a um usuário):
--   perfis      -> quem é cada usuário (user_id) e o papel dele
--   permissoes  -> o que cada PAPEL pode em cada RECURSO (ler / escrever)
--   pode(recurso, acao) -> função usada por TODAS as políticas de RLS
--
-- Para dar acesso a alguém no futuro NÃO se mexe em política nenhuma:
--   1) cria o usuário em Authentication > Users
--   2) insert into perfis (user_id, papel, nome) values ('<uuid>', 'contador', 'Fulano');
-- Para um papel novo ou uma mudança de regra, é só inserir/alterar linhas
-- de `permissoes`.
--
-- RECURSOS (agrupam tabelas):
--   ugc_financas -> financas_receitas, financas_despesas, financas_categorias,
--                   financas_aliquotas (e leitura de contratos)
--   ugc_operacao -> contratos (escrita) e, na parte 4, o resto do painel
--   config       -> painel_config
--   empresa_dre  -> resumo_mensal_frente (base da página de DRE da empresa)
--   usuarios     -> perfis e permissoes
--
-- NÃO cria nenhum usuário além de você. Se você ainda não tem exatamente
-- UM usuário em Authentication > Users, o script para antes de mudar qualquer
-- coisa (pra não dar o papel de dono à pessoa errada nem te trancar pra fora).
-- =====================================================================

-- 0. Trava de segurança: precisa existir exatamente um usuário agora (você)
--    ou os perfis já estarem criados.
do $$
begin
  if to_regclass('public.perfis') is null and (select count(*) from auth.users) <> 1 then
    raise exception 'Esperava exatamente 1 usuário em Authentication > Users (o seu). Encontrei %. Nada foi alterado.', (select count(*) from auth.users);
  end if;
end $$;

-- 1. Perfis: um por usuário.
create table if not exists perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  papel text not null check (papel in ('dono', 'socio', 'contador')),
  nome text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Permissões por papel e recurso (editável: novos papéis/recursos = novas linhas).
create table if not exists permissoes (
  papel text not null,
  recurso text not null,
  pode_ler boolean not null default false,
  pode_escrever boolean not null default false,
  primary key (papel, recurso)
);
-- papéis novos além dos três: remova o check de perfis.papel ou troque por uma tabela de papéis.

-- 3. Você (o único usuário agora) vira dono.
insert into perfis (user_id, papel, nome)
select id, 'dono', 'Dona' from auth.users
where not exists (select 1 from perfis)
limit 1;

-- 4. Matriz inicial. Só o dono escreve; o resto é leitura. Ajuste à vontade.
insert into permissoes (papel, recurso, pode_ler, pode_escrever) values
  ('dono',     'ugc_financas', true,  true),
  ('dono',     'ugc_operacao', true,  true),
  ('dono',     'config',       true,  true),
  ('dono',     'empresa_dre',  true,  true),
  ('dono',     'usuarios',     true,  true),
  ('contador', 'ugc_financas', true,  false),
  ('contador', 'empresa_dre',  true,  false),
  ('socio',    'empresa_dre',  true,  false)
on conflict (papel, recurso) do nothing;

-- 5. A função que as políticas usam. SECURITY DEFINER pra ler perfis/permissoes
--    sem cair em recursão de RLS.
create or replace function public.pode(p_recurso text, p_acao text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from perfis p
    join permissoes m on m.papel = p.papel
    where p.user_id = auth.uid()
      and p.ativo
      and m.recurso = p_recurso
      and case p_acao when 'ler' then m.pode_ler when 'escrever' then m.pode_escrever else false end
  );
$$;
revoke all on function public.pode(text, text) from public;
grant execute on function public.pode(text, text) to authenticated;

-- 6. Política padrão por tabela: apaga TODAS as políticas atuais da tabela (os nomes
--    variam entre os SQLs antigos) e cria as novas: ler / inserir / alterar / excluir.
create or replace function public.aplicar_politicas(p_tabela text, p_recurso_leitura text[], p_recurso_escrita text)
returns void
language plpgsql
as $$
declare
  pol record;
  cond_leitura text;
begin
  if to_regclass('public.' || p_tabela) is null then
    return;
  end if;
  execute format('alter table public.%I enable row level security', p_tabela);
  -- só as políticas de usuário logado: as de visitante anônimo ("to anon"/"to public",
  -- ex.: formulário e visitas do site público) ficam intactas
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = p_tabela
      and 'authenticated' = any(roles) and not ('anon' = any(roles) or 'public' = any(roles))
  loop
    execute format('drop policy %I on public.%I', pol.policyname, p_tabela);
  end loop;
  select string_agg(format('(select public.pode(%L, ''ler''))', r), ' or ') into cond_leitura from unnest(p_recurso_leitura) r;
  execute format('create policy %I on public.%I for select to authenticated using (%s)', 'ler ' || p_tabela, p_tabela, cond_leitura);
  execute format('create policy %I on public.%I for insert to authenticated with check ((select public.pode(%L, ''escrever'')))', 'inserir ' || p_tabela, p_tabela, p_recurso_escrita);
  execute format('create policy %I on public.%I for update to authenticated using ((select public.pode(%L, ''escrever''))) with check ((select public.pode(%L, ''escrever'')))', 'alterar ' || p_tabela, p_tabela, p_recurso_escrita, p_recurso_escrita);
  execute format('create policy %I on public.%I for delete to authenticated using ((select public.pode(%L, ''escrever'')))', 'excluir ' || p_tabela, p_tabela, p_recurso_escrita);
end $$;

-- 7. Aplicação nas tabelas financeiras e de configuração.
select public.aplicar_politicas('financas_receitas',    array['ugc_financas'],                'ugc_financas');
select public.aplicar_politicas('financas_despesas',    array['ugc_financas'],                'ugc_financas');
select public.aplicar_politicas('financas_categorias',  array['ugc_financas'],                'ugc_financas');
select public.aplicar_politicas('financas_aliquotas',   array['ugc_financas'],                'ugc_financas');
select public.aplicar_politicas('contratos',            array['ugc_operacao', 'ugc_financas'], 'ugc_operacao');
select public.aplicar_politicas('painel_config',        array['config'],                      'config');
select public.aplicar_politicas('resumo_mensal_frente', array['empresa_dre'],                 'empresa_dre');

-- Backups da parte 1 (bkp_*): sem política = ninguém além do dono do banco enxerga.
-- (RLS ligada e nenhuma política: o Supabase só deixa ler pelo SQL Editor.)

-- 8. As próprias tabelas de papéis: cada um lê o próprio perfil; só quem tem
--    'usuarios' escreve.
alter table perfis enable row level security;
alter table permissoes enable row level security;
do $$
declare pol record; t text;
begin
  foreach t in array array['perfis', 'permissoes'] loop
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
  end loop;
end $$;
create policy "ver o proprio perfil" on perfis for select to authenticated
  using (user_id = auth.uid() or (select public.pode('usuarios', 'ler')));
create policy "gerir perfis" on perfis for all to authenticated
  using ((select public.pode('usuarios', 'escrever'))) with check ((select public.pode('usuarios', 'escrever')));
create policy "ver permissoes" on permissoes for select to authenticated using (true);
create policy "gerir permissoes" on permissoes for all to authenticated
  using ((select public.pode('usuarios', 'escrever'))) with check ((select public.pode('usuarios', 'escrever')));

-- 9. resumo_mensal_frente: user_id vira só "quem gravou" (não manda mais no acesso).
--    A leitura/gravação agora é pelo recurso 'empresa_dre' (aplicado acima), então
--    seu marido (sócio) lê a mesma tabela sem precisar ser o autor das linhas.

-- Conferência (opcional), numa query separada:
--   select * from perfis;                       -- você como 'dono'
--   select public.pode('ugc_financas', 'escrever');   -- true quando logado como você no painel
--   select tablename, policyname from pg_policies where schemaname = 'public'
--     and tablename in ('financas_despesas', 'resumo_mensal_frente') order by 1, 2;
