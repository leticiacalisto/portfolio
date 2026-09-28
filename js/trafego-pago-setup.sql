-- Direitos de uso em ads (Tráfego Pago) por vídeo: lançados ao criar/editar
-- um job na aba Detalhes do card, e listados na aba "Tráfego Pago" de
-- Campanhas (ativos, vencendo em 30 dias, vencidos).
alter table quadro_cards add column if not exists trafego_pago_ativo boolean not null default false;
alter table quadro_cards add column if not exists trafego_pago_inicio date;
alter table quadro_cards add column if not exists trafego_pago_fim date;
alter table quadro_cards add column if not exists trafego_pago_valor numeric;
