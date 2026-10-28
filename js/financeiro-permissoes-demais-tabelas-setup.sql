-- =====================================================================
-- PAPÉIS E PERMISSÕES (parte 4) — as OUTRAS tabelas do painel.
-- Rodar DEPOIS da parte 3 e ANTES de criar o primeiro usuário extra.
-- Seguro rodar de novo.
--
-- Hoje as demais tabelas (quadro_*, oportunidades, empresas, afiliados,
-- roteiros, portfólio…) têm a política "autenticados podem tudo em …":
-- qualquer usuário logado lê e escreve. Com contador e sócio no mesmo projeto
-- isso vazaria o painel inteiro. Aqui cada uma passa a exigir o recurso
-- 'ugc_operacao' (hoje só o dono tem). Pra você nada muda.
--
-- NÃO mexe em tabelas sem a política padrão (ex.: as de visitas do site,
-- que podem ter regra própria para o visitante anônimo gravar).
-- =====================================================================
do $$
declare
  r record;
begin
  if to_regprocedure('public.pode(text, text)') is null then
    raise exception 'Rode primeiro js/financeiro-permissoes-setup.sql (parte 3).';
  end if;
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and policyname like 'autenticados podem tudo em %'
  loop
    perform public.aplicar_politicas(r.tablename, array['ugc_operacao'], 'ugc_operacao');
    raise notice 'Protegida: %', r.tablename;
  end loop;
end $$;

-- Conferência: não deve sobrar nenhuma política "autenticados podem tudo".
--   select tablename, policyname from pg_policies where policyname like 'autenticados podem tudo%';
