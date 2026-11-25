-- Deixa ocultar um nicho do portfólio pelo painel (botão ⚙ Nichos > olhinho)
-- sem apagar os vídeos dele. Roda uma vez só; pode rodar de novo sem problema.
alter table portfolio_nichos add column if not exists visivel boolean not null default true;
