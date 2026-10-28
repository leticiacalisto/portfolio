-- =====================================================================
-- PAPÉIS E PERMISSÕES (parte 5) — os ARQUIVOS (Storage): anexos de briefing e anexos de contrato.
-- Rodar DEPOIS das partes 3 e 4 e ANTES de convidar o contador e o sócio. Seguro rodar de novo.
--
-- Hoje qualquer pessoa logada lê, sobe e apaga esses arquivos (as políticas só olham o bucket).
-- Aqui cada ação passa a exigir o recurso 'ugc_operacao' (hoje só o dono tem). Pra você nada muda.
--
--   bucket "briefings": o visitante do site continua podendo ENVIAR (formulário público de briefing).
--                       Ler = ugc_operacao.ler · apagar = ugc_operacao.escrever
--   bucket "contratos": ler = ugc_operacao.ler · subir, trocar e apagar = ugc_operacao.escrever
-- =====================================================================
do $$
begin
  if to_regprocedure('public.pode(text, text)') is null then
    raise exception 'Rode primeiro js/financeiro-permissoes-setup.sql (parte 3).';
  end if;
end $$;

-- briefings
drop policy if exists "autenticados leem anexos de briefing" on storage.objects;
drop policy if exists "autenticados apagam anexos de briefing" on storage.objects;
drop policy if exists "ler anexos de briefing" on storage.objects;
drop policy if exists "apagar anexos de briefing" on storage.objects;
create policy "ler anexos de briefing" on storage.objects for select to authenticated
  using (bucket_id = 'briefings' and (select public.pode('ugc_operacao', 'ler')));
create policy "apagar anexos de briefing" on storage.objects for delete to authenticated
  using (bucket_id = 'briefings' and (select public.pode('ugc_operacao', 'escrever')));

-- contratos
drop policy if exists "autenticados leem anexos de contrato" on storage.objects;
drop policy if exists "autenticados sobem anexos de contrato" on storage.objects;
drop policy if exists "autenticados atualizam anexos de contrato" on storage.objects;
drop policy if exists "autenticados apagam anexos de contrato" on storage.objects;
drop policy if exists "ler anexos de contrato" on storage.objects;
drop policy if exists "subir anexos de contrato" on storage.objects;
drop policy if exists "atualizar anexos de contrato" on storage.objects;
drop policy if exists "apagar anexos de contrato" on storage.objects;
create policy "ler anexos de contrato" on storage.objects for select to authenticated
  using (bucket_id = 'contratos' and (select public.pode('ugc_operacao', 'ler')));
create policy "subir anexos de contrato" on storage.objects for insert to authenticated
  with check (bucket_id = 'contratos' and (select public.pode('ugc_operacao', 'escrever')));
create policy "atualizar anexos de contrato" on storage.objects for update to authenticated
  using (bucket_id = 'contratos' and (select public.pode('ugc_operacao', 'escrever')))
  with check (bucket_id = 'contratos' and (select public.pode('ugc_operacao', 'escrever')));
create policy "apagar anexos de contrato" on storage.objects for delete to authenticated
  using (bucket_id = 'contratos' and (select public.pode('ugc_operacao', 'escrever')));

-- Conferência: todas as políticas de arquivos e os buckets. Nenhum bucket deve estar "público"
-- sem você querer, e nenhuma política de "authenticated" deve olhar só o bucket.
select p.policyname, p.cmd, p.roles::text as papeis, p.qual
from pg_policies p
where p.schemaname = 'storage' and p.tablename = 'objects'
order by p.policyname;
