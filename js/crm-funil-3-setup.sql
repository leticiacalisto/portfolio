-- =====================================================================
-- CRM / FUNIL, FASE 6: aba Modelos e aba Disparo de e-mail.
-- Rode uma vez no Supabase (SQL Editor), DEPOIS de js/crm-funil-setup.sql.
-- Pode rodar de novo sem problema (os modelos já existentes não são
-- sobrescritos: se você editar um texto no painel, ele fica como está).
--
-- Variáveis aceitas nos textos: {{marca}} {{contato}} {{nicho}} {{produto}}
-- {{link_portfolio}} {{ideia_video}} {{case}} {{data_sazonal}}
-- {{gancho_casa}} {{link_optout}}
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. MODELOS DE ABORDAGEM
-- ---------------------------------------------------------------------
create table if not exists crm_modelos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  canal text not null default 'dm',
  cadencia text,
  toque text,
  assunto text,
  corpo text not null default '',
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. DISPAROS DE E-MAIL (por enquanto só o registro; o envio real vem depois)
-- ---------------------------------------------------------------------
create table if not exists disparos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sequencia text not null default 'EMAIL_SEQ',
  status text not null default 'agendado' check (status in ('rascunho', 'agendado', 'enviando', 'concluido')),
  criado_em timestamptz not null default now()
);

create table if not exists disparo_envios (
  id uuid primary key default gen_random_uuid(),
  disparo_id uuid not null references disparos(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  email text not null,
  passo text not null default 'EM-1',
  status text not null default 'agendado' check (status in ('agendado', 'enviado', 'respondeu', 'erro', 'optout')),
  enviado_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_disparo_envios_disparo on disparo_envios(disparo_id);
create index if not exists idx_disparo_envios_empresa on disparo_envios(empresa_id);

-- ---------------------------------------------------------------------
-- 3. PERMISSÕES (mesmo padrão das outras tabelas: quem opera o UGC)
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['crm_modelos', 'disparos', 'disparo_envios'] loop
    if to_regprocedure('public.aplicar_politicas(text, text[], text)') is not null then
      perform public.aplicar_politicas(t, array['ugc_operacao'], 'ugc_operacao');
    else
      execute format('alter table %I enable row level security', t);
      execute format('drop policy if exists "autenticados podem tudo em %s" on %I', t, t);
      execute format('create policy "autenticados podem tudo em %s" on %I for all to authenticated using (true) with check (true)', t, t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. TEXTOS DOS MODELOS
-- ---------------------------------------------------------------------
insert into crm_modelos (codigo, nome, canal, cadencia, toque, assunto, corpo, ordem) values

('IN-1', 'Primeira resposta a um inbound', 'dm/email', 'IN_RESPOSTA', '1', 'Re: Conteúdo UGC para a {{marca}}',
$m$Oi, {{contato}}! Que bom receber sua mensagem, obrigada pelo interesse no meu trabalho 💛

Para eu te mandar uma proposta certinha, me conta rapidinho:
1. Qual produto (ou produtos) vocês querem divulgar?
2. Quantos vídeos estão buscando?
3. Já têm um budget em mente para esse projeto?
4. Tem algum prazo ou data importante, como lançamento ou campanha?

Enquanto isso, meu portfólio está aqui: {{link_portfolio}}$m$, 10),

('QF-1', 'Qualificação: 1º lembrete', 'dm/email', 'QUALIF_DM / QUALIF_EMAIL', '1', null,
$m$Oi, {{contato}}! Passando para saber se conseguiu ver minhas perguntas 😊 Com essas informações eu já consigo montar uma proposta pensada para a {{marca}}.$m$, 20),

('QF-2', 'Qualificação: 2º lembrete', 'dm/email', 'QUALIF_DM / QUALIF_EMAIL', '2', null,
$m$Oi, {{contato}}! Imagino que a rotina esteja corrida por aí. Se ficar mais fácil, me diz só o produto e quantos vídeos vocês imaginam, que eu monto uma sugestão inicial e a gente ajusta a partir dela.$m$, 21),

('QF-3', 'Qualificação: encerramento', 'dm/email', 'QUALIF_DM / QUALIF_EMAIL', '3', null,
$m$Oi, {{contato}}! Vou deixar nossa conversa por aqui para não ficar insistindo. Quando fizer sentido retomar, é só me chamar que eu monto a proposta rapidinho. Sucesso para a {{marca}}! ✨$m$, 22),

('OUT-P1', 'Marca pequena: primeira mensagem', 'dm', 'OUT_PEQUENA', '1', null,
$m$Oi, {{contato}}! Tudo bem? Sou a Letícia, criadora de conteúdo UGC aqui de Floripa. Já fiz mais de 400 vídeos para mais de 100 marcas.

Conheci o {{produto}} de vocês e na hora imaginei um vídeo assim: {{ideia_video}}. {{gancho_casa}}

Vocês já trabalham com conteúdo UGC? Se quiserem, te mando alguns exemplos do meu trabalho no nicho de {{nicho}} 💛$m$, 30),

('OUT-P2', 'Marca pequena: follow-up curto', 'dm', 'OUT_PEQUENA', '2', null,
$m$Oi, {{contato}}! Conseguiu ver minha mensagem? 😊$m$, 31),

('OUT-P3', 'Marca pequena: follow-up com valor', 'dm', 'OUT_PEQUENA', '3', null,
$m$Oi, {{contato}}! Separei uma referência que acho que combina muito com a {{marca}}: {{ideia_video}}. Esse formato costuma funcionar bem em anúncio porque mostra o produto em uso real, logo nos primeiros segundos. Se quiser, te mostro como eu faria com o {{produto}} de vocês.$m$, 32),

('OUT-P4', 'Marca pequena: encerramento', 'dm', 'OUT_PEQUENA', '4', null,
$m$Oi, {{contato}}! Vou deixar essa mensagem aqui caso faça sentido mais para frente. Quando quiserem conteúdo UGC para a {{marca}}, é só me chamar. Meu portfólio: {{link_portfolio}} ✨$m$, 33),

('OUT-G1', 'Marca grande: pedido de e-mail', 'dm', 'OUT_GRANDE', '1', null,
$m$Oi, time {{marca}}! Tudo bem? Sou a Letícia, criadora de conteúdo UGC, com mais de 400 vídeos produzidos para mais de 100 marcas. Gostaria de enviar uma apresentação do meu trabalho para o time de marketing ou de parcerias. Qual é o melhor e-mail para isso? 💛$m$, 40),

('OUT-G2', 'Marca grande: lembrete', 'dm', 'OUT_GRANDE', '2', null,
$m$Oi, time {{marca}}! Passando para relembrar minha mensagem: vocês podem me indicar o e-mail do marketing ou de parcerias? Obrigada! 😊$m$, 41),

('EM-1', 'E-mail 1: apresentação', 'email', 'EMAIL_SEQ', '1', 'Conteúdo UGC para a {{marca}}',
$m$Olá, {{contato}}!

Sou a Letícia Calisto, criadora de conteúdo UGC. Produzo vídeos com cara de recomendação real, pensados para anúncios e redes sociais. Já são mais de 400 vídeos para mais de 100 marcas, em mais de 20 nichos, incluindo {{nicho}}.

Acredito que o {{produto}} de vocês renderia ótimos vídeos nesse formato. Você pode ver alguns trabalhos aqui: {{link_portfolio}}

Faz sentido conversarmos sobre conteúdo para os próximos meses?

Um abraço,
Letícia Calisto
leticiacalisto.com

Não quer mais receber meus e-mails? Clique aqui: {{link_optout}}$m$, 50),

('EM-2', 'E-mail 2: prova', 'email', 'EMAIL_SEQ', '2', 'Re: Conteúdo UGC para a {{marca}}',
$m$Oi, {{contato}}! Retomando meu último e-mail com um exemplo concreto: {{case}}.

Vídeos UGC funcionam porque o público vê o produto sendo usado por uma pessoa real, e não por uma propaganda. Posso montar uma sugestão de roteiros para a {{marca}}, sem compromisso?

Letícia

Não quer mais receber meus e-mails? Clique aqui: {{link_optout}}$m$, 51),

('EM-3', 'E-mail 3: ideia específica ou data sazonal', 'email', 'EMAIL_SEQ', '3', 'Uma ideia de vídeo para a {{marca}}',
$m$Oi, {{contato}}! Pensei numa ideia para vocês: {{ideia_video}}.

Com {{data_sazonal}} chegando, esse é o momento em que as marcas mais precisam de criativos novos para anúncio, e eu entrego em 7 a 10 dias úteis. Quer que eu te mande uma proposta?

Letícia

Não quer mais receber meus e-mails? Clique aqui: {{link_optout}}$m$, 52),

('EM-4', 'E-mail 4: encerramento', 'email', 'EMAIL_SEQ', '4', 'Encerrando por aqui',
$m$Oi, {{contato}}! Vou parar de te escrever por aqui para não lotar sua caixa de entrada 😊

Se em algum momento a {{marca}} precisar de conteúdo UGC, é só responder este e-mail. Meu portfólio continua aqui: {{link_portfolio}}

Sucesso para vocês!
Letícia

Não quer mais receber meus e-mails? Clique aqui: {{link_optout}}$m$, 53),

('PROP-1', 'Proposta: dúvidas', 'dm/email', 'PROPOSTA', '1', null,
$m$Oi, {{contato}}! Conseguiu dar uma olhada na proposta? Se ficou alguma dúvida sobre escopo, prazos ou direitos de uso, me fala que eu explico 😊$m$, 60),

('PROP-2', 'Proposta: flexibilidade', 'dm/email', 'PROPOSTA', '2', null,
$m$Oi, {{contato}}! Queria reforçar que consigo adaptar a proposta à realidade de vocês. Dá para começar com menos vídeos, ajustar o prazo ou montar um pacote para testar o formato. O que faria mais sentido para a {{marca}} agora?$m$, 61),

('PROP-3', 'Proposta: pergunta direta', 'dm/email', 'PROPOSTA', '3', null,
$m$Oi, {{contato}}! Para eu organizar minha agenda de produção: seguimos com a proposta ou prefere deixar para outro momento? Qualquer resposta me ajuda 💛$m$, 62),

('PROP-4', 'Proposta: encerramento', 'dm/email', 'PROPOSTA', '4', null,
$m$Oi, {{contato}}! Vou considerar que agora não é o momento e deixar a proposta em aberto. Quando quiserem retomar, é só me chamar que eu atualizo tudo. Obrigada pela conversa! ✨$m$, 63),

('REAT-7', 'Reativação: pós-entrega (7 dias)', 'dm/email', 'REATIVACAO', '1', null,
$m$Oi, {{contato}}! Os vídeos da {{marca}} já estão rodando? Queria saber o que vocês acharam do resultado 💛

Se puderem, eu adoraria um depoimento curtinho sobre a parceria. E, se tiverem os números dos vídeos (views, CTR, vendas), me ajudaria muito a entender o que performou melhor para as próximas.$m$, 70),

('REAT-30', 'Reativação: performance e nova pauta (30 dias)', 'dm/email', 'REATIVACAO', '2', null,
$m$Oi, {{contato}}! Já faz um mês dos vídeos. Como eles performaram? Pensando no que costuma funcionar no nicho de {{nicho}}, tive uma ideia para uma nova leva: {{ideia_video}}. Quer que eu monte uma proposta?$m$, 71),

('REAT-CHECK', 'Reativação: check-in periódico', 'dm/email', 'REATIVACAO', '3+', null,
$m$Oi, {{contato}}! Tudo bem por aí? Lembrei da {{marca}} porque vi {{ideia_video}} e pensei que funcionaria muito bem com o {{produto}}. Estão precisando de criativos novos?$m$, 72),

('REAT-SAZ', 'Reativação: data sazonal (45 dias antes)', 'dm/email', 'REATIVACAO', 'sazonal', null,
$m$Oi, {{contato}}! {{data_sazonal}} está chegando e eu já estou organizando minha agenda de produção. Querem garantir vídeos novos para a {{marca}} a tempo de rodar nos anúncios? Tenho algumas ideias para o {{produto}} 💛$m$, 73)

on conflict (codigo) do nothing;
