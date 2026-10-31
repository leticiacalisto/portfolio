-- =====================================================================
-- CRM / FUNIL, FASE 2: captação passa a ser obrigatória.
-- Rode uma vez no Supabase (SQL Editor), DEPOIS de js/crm-funil-setup.sql.
-- Só roda se nenhuma oportunidade estiver sem captação (o painel agora
-- exige o campo no formulário e o importador de planilha grava Outbound).
-- =====================================================================
do $$
begin
  if exists (select 1 from oportunidades where captacao is null) then
    raise exception 'Ainda há oportunidades sem captação. Preencha antes de rodar este script.';
  end if;
  alter table oportunidades alter column captacao set not null;
end $$;
