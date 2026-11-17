-- =====================================================================
-- ROTEIROS: biblioteca de vídeos transcritos (rodar UMA VEZ no SQL
-- Editor do Supabase). Pode rodar de novo sem problema.
--
-- A tabela se chama "transcricoes" porque o nome "roteiros" já é usado
-- pela aprovação de roteiro das marcas (js/roteiros-setup.sql).
--
-- A chave da Supadata NÃO tem tabela nova: ela fica em painel_config
-- (chave "supadata_chave"), que só a dona do painel lê e grava.
-- =====================================================================

create table if not exists transcricoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fonte text not null default 'manual' check (fonte in ('instagram', 'tiktok', 'youtube', 'manual')),
  url text,
  perfil text,
  de_quem text not null default 'outra' check (de_quem in ('minha', 'outra')),
  titulo text,
  transcricao text,
  legenda text,
  postado_em date,
  tags text[] not null default '{}',
  obs text,
  status text not null default 'pronto' check (status in ('processando', 'pronto', 'falhou')),
  erro text,
  segmentos jsonb
);

create index if not exists idx_transcricoes_created on transcricoes (created_at desc);

alter table transcricoes enable row level security;

-- Permissões: se o painel já usa os papéis (js/financeiro-permissoes-setup.sql),
-- segue a mesma regra da operação de UGC. Se não, só quem está logada.
-- Ninguém deslogado (anon) enxerga nada.
do $$
begin
  if to_regprocedure('public.aplicar_politicas(text, text[], text)') is not null then
    perform public.aplicar_politicas('transcricoes', array['ugc_operacao'], 'ugc_operacao');
  else
    drop policy if exists "autenticados podem tudo em transcricoes" on transcricoes;
    create policy "autenticados podem tudo em transcricoes"
      on transcricoes for all to authenticated using (true) with check (true);
  end if;
end $$;
