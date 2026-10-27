-- Status da campanha definido à mão (Lead / Em produção / Aguardando pagamento / Fechada).
-- Vazio = automático, como sempre foi. Rode uma vez no SQL Editor do Supabase.
alter table contratos add column if not exists status_manual text;
