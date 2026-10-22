/* =========================================================
   CONTEÚDO DA PÁGINA /ap-da-le
   Todo texto e dado da página mora aqui. Para editar, troque só os valores
   entre aspas. O que está entre [colchetes] é um campo a preencher.
   Imagens: deixe "" para aparecer o espaço reservado com o nome do que entra
   ali; para usar uma foto, ponha o caminho, ex.: "../imagens/cozinha.jpg".
   ========================================================= */
window.CONTEUDO = {

  projeto: "AP da Lê",
  ano: "[ANO]",

  contato: {
    whatsapp: "5548984666886",           // só números, com 55 na frente
    email: "leticiaacalisto@gmail.com",
    instagram: "@byleticiaacalisto",
    instagramUrl: "https://www.instagram.com/byleticiaacalisto",
    telefone: "(48) 98466-6886",
    msgWhatsapp: "Oi, Letícia! Vi a proposta do projeto e quero conversar sobre a parceria."
  },

  menu: [
    { texto: "Cronograma", href: "#projeto" },
    { texto: "Tour 3D",    href: "#tour" },
    { texto: "Vídeos",    href: "#nicho" },
    { texto: "O que procuro", href: "#procuro" },
    { texto: "Parceria",   href: "#parceria" }
  ],

  hero: {
    eyebrow: "Proposta de parceria",
    linha1: "[Uma reforma inteira]",
    linha2: "[virando conteúdo]",
    texto: "[Resumo do projeto: quais ambientes serão reformados, que existe projeto de arquitetura, que tudo será documentado do primeiro dia ao tour final e o convite para as marcas entrarem como parceiras.]",
    marquee: "[REFORMA DOCUMENTADA DO PRIMEIRO DIA AO TOUR FINAL]"
  },

  quemAssina: {
    eyebrow: "Sobre o AP da Lê",
    // o que estiver entre <b> e </b> sai em negrito e na cor cheia
    titulo: "oi, eu sou a <b>Letícia</b>",
    paragrafos: [
      "Tenho <b>28 anos</b>, sou <b>arquiteta por formação</b> e <b>criadora de conteúdo</b>. Estou casada há <b>um ano e meio</b> e agora vivemos a etapa de <b>transformar o nosso apartamento em um lar</b>.",
      "Como eu moro aqui, meus parceiros vão me ajudar a construir os <b>cenários que aparecerão todos os dias</b> nas minhas produções: cada produto entra na rotina real da casa, do primeiro dia da obra ao tour final."
    ],
    selos: [
      "+100 marcas parceiras"
    ],
    // pílula com link, abre em outra aba
    link: { texto: "ver o @byleticiaacalisto", url: "https://www.instagram.com/byleticiaacalisto" },
    foto: "fotos/sobre.jpg",
    alt: "Letícia Calisto sentada no sofá do apartamento, em frente à parede de pedra",
    posicaoFoto: "50% 62%"
  },

  /* Carrossel "Como vai ficar" — quantos slides quiser */
  carrossel: [
    { ambiente: "Sala integrada", frase: "[Frase curta descrevendo o ambiente.]", imagem: "fotos/render-1.jpg" },
    { ambiente: "Sala de estar", frase: "[Frase curta descrevendo o ambiente.]", imagem: "fotos/render-2.jpg" },
    { ambiente: "Quarto", frase: "[Frase curta descrevendo o ambiente.]", imagem: "fotos/render-3.jpg" },
    { ambiente: "Home office", frase: "[Frase curta descrevendo o ambiente.]", imagem: "fotos/render-4.jpg" },
    { ambiente: "Sala de jantar", frase: "[Frase curta descrevendo o ambiente.]", imagem: "fotos/render-5.jpg" },
    { ambiente: "Cozinha com ilha", frase: "[Frase curta descrevendo o ambiente.]", imagem: "fotos/render-6.jpg" },
    { ambiente: "Ambiente de gravação", frase: "[Frase curta descrevendo o ambiente.]", imagem: "fotos/render-7.jpg" },
    { ambiente: "Cozinha e lavanderia", frase: "[Frase curta descrevendo o ambiente.]", imagem: "fotos/render-8.jpg" },
    { ambiente: "Banheiro", frase: "[Frase curta descrevendo o ambiente.]", imagem: "fotos/render-9.jpg" }
  ],

  /* Cronograma: as etapas da obra (fica no lugar do antigo "O projeto").
     "atual: true" marca a etapa em andamento. */
  projetoSecao: {
    eyebrow: "Cronograma",
    titulo: { impacto: "As etapas", cursiva: "do projeto" },
    /* feito: true = etapa concluída (a linha fica em destaque até a etapa atual) · atual: true = em andamento */
    etapas: [
      { titulo: "Reforma arquitetônica", texto: "Integração de ambientes, revestimentos, pintura, gesso, iluminação e elétrica.", feito: true },
      { titulo: "Mobília", texto: "Marcenaria planejada, móveis soltos, vegetação, espelhos, eletrodomésticos e smart home.", atual: true },
      { titulo: "Decoração", texto: "Iluminação solta, quadros, estofados, cama, mesa e banho, tapetes, cortinas e ambientação." },
      { titulo: "Extras", texto: "Organizadores, aromatizadores e outros." }
    ]
  },


  /* Tour do apartamento: a animação "explodida" e os ambientes clicáveis.
     As imagens ficam na pasta tour/. */
  tour: {
    rotulo: "Tour 3D",
    titulo: { impacto: "Conheça o AP da Lê", cursiva: "por dentro" },
    pasta: "tour/",
    materiais: [
      { nome: "Nogueira Caiena", marca: "Duratex", cor: "#774935", textura: "tour/mdf-nogueira.webp" },
      { nome: "Nude quente",     marca: "Cor das paredes", cor: "#968f87" },
      { nome: "Branco",          marca: "", cor: "#f3f1ed" },
      { nome: "Verde",           marca: "", cor: "#a9b9a1" }
    ],
    /* ordem da lista. "prioridade" resolve qual ambiente vale quando o mouse
       está num ponto onde dois desenhos se sobrepõem (do mais específico ao mais amplo). */
    /* Cada ambiente tem "views" (o nome e o vídeo de montagem de cada vista; o vídeo da
       1ª vista toca ao abrir o ambiente), "itens" (a lista da direita, que rola) e, se
       tiver duas vistas, "giro": o vídeo do ambiente pronto girando de uma vista até a
       outra, que a bolinha percorre. A abertura do tour é tour/montagem.mp4.
       Na lista só aparece o "titulo" de cada item; "texto" fica guardado para depois. */
    ambientes: [
      { id: "social", nome: "Área social integrada",
        views: [{ nome: "Cozinha e jantar", video: "v-social-2.mp4" }, { nome: "Sala de estar" }],
        giro: "v-social-giro.mp4",
        itens: [
        { titulo: "Mesa de jantar", pontos: [[[50.0, 63.5]], [[53.5, 54.1]]] },
        { titulo: "Cadeiras", pontos: [[[55.8, 61.7]], [[48.2, 56.6]]] },
        { titulo: "Tapete", pontos: [[[71.2, 60.1]], []] },
        { titulo: "Mesa redonda", pontos: [[[48.9, 80.4]], [[54.5, 43.3]]] },
        { titulo: "Mesa lateral", pontos: [[[67.4, 57.9]], [[37.6, 62.4]]] },
        { titulo: "Plantas", pontos: [[[43.2, 86.6]], []] },
        { titulo: "Árvore", pontos: [[[73.5, 46.7]], []] },
        { titulo: "Luminária de piso", pontos: [[[65.6, 55.1]], [[39.2, 47.9]]] },
        { titulo: "Manta e almofadas de sofá", pontos: [[[57.4, 51.8]], [[46.7, 64.7]]] },
        { titulo: "Fechadura eletrônica", pontos: [[[59.0, 31.1]], []] },
        { titulo: "Organizadores de geladeira", pontos: [[[51.4, 36.5]], []] },
        { titulo: "Quadro (entrada)", pontos: [[[55.0, 20.8]], []] },
        { titulo: "Porta mantimentos", pontos: [[[54.2, 24.5]], []] },
        { titulo: "Lava e seca", pontos: [[[32.5, 59.8]], []] },
        { titulo: "Torneira (tanque)", pontos: [[[26.2, 57.9]], []] },
        { titulo: "Lixeira inox", pontos: [[[36.2, 78.3]], []] },
        { titulo: "Banco (varanda)", pontos: [[[47.4, 85.5]], [[57.9, 42.9]]] },
        { titulo: "Mesa posta", pontos: [[[49.0, 59.2]], [[54.4, 58.0]]] },
        { titulo: "Marcenaria sala", pontos: [[[64.8, 42.4]], [[40.0, 76.6]]] },
        { titulo: "Decoração sala", pontos: [[[66.2, 46.6]], []] },
        { titulo: "Decoração cozinha", pontos: [[[45.0, 47.2], [33.3, 50.4]], [[68.8, 63.3]]] },
        { titulo: "Espelho (pilar ao lado do sofá)", pontos: [[], [[41.0, 46.8]]] },
        { titulo: "Cortina (varanda)", pontos: [[], [[60.7, 24.8]]] }
      ] },
      { id: "escritorio", nome: "Escritório / Closet",
        views: [{ nome: "Escritório", video: "v-escritorio-1.mp4" }, { nome: "Closet" }],
        giro: "v-escritorio-giro.mp4",
        itens: [
        { titulo: "Cortina", pontos: [[[39.1, 37.0]], []] },
        { titulo: "Marcenaria", pontos: [[[44.1, 55.6]], [[59.4, 72.2]]] },
        { titulo: "Estofado", pontos: [[[39.0, 53.2]], [[61.1, 72.1]]] },
        { titulo: "Iluminação", pontos: [[[62.0, 44.5]], []] },
        { titulo: "Luminária de mesa", pontos: [[[48.4, 36.9]], []] },
        { titulo: "Decoração", pontos: [[[55.1, 32.2]], []] },
        { titulo: "Cadeira office", pontos: [[[54.6, 55.5]], []] },
        { titulo: "Espelho", pontos: [[], [[37.0, 45.6]]] },
        { titulo: "Puxadores", pontos: [[], [[51.6, 49.7]]] },
        { titulo: "Organizadores", pontos: [[], [[50.0, 42.7]]] }
      ] },
      { id: "quarto", nome: "Quarto",
        views: [{ nome: "Quarto", video: "v-quarto-1.mp4" }],
        itens: [
        { titulo: "Marcenaria", pontos: [[[45.0, 36.4]]] },
        { titulo: "Espelho redondo com led", pontos: [[[62.7, 40.0]]] },
        { titulo: "Led", pontos: [[[53.9, 15.3]]] },
        { titulo: "Cadeira", pontos: [[[60.2, 55.9]]] },
        { titulo: "Cabeceira", pontos: [[[35.1, 48.9]]] },
        { titulo: "Base da cama", pontos: [[[36.7, 64.3]]] },
        { titulo: "Jogo de cama", pontos: [[[51.2, 64.3]]] },
        { titulo: "Quadros", pontos: [[[48.5, 29.4]]] },
        { titulo: "Abajur", pontos: [[[48.7, 41.5]]] },
        { titulo: "Arandela", pontos: [[[30.4, 56.6]]] },
        { titulo: "Travesseiros", pontos: [[[40.6, 51.0]]] },
        { titulo: "Puxadores", pontos: [[[52.8, 47.5]]] }
      ] },
      { id: "banheiro", nome: "Banheiro",
        views: [{ nome: "Banheiro", video: "v-banheiro-1.mp4" }],
        itens: [
        { titulo: "Lixeira automática", pontos: [[[54.7, 70.6]]] },
        { titulo: "Torneira", pontos: [[[61.6, 60.2]]] },
        { titulo: "Espelhos", pontos: [[[57.4, 43.0]]] },
        { titulo: "Led", pontos: [[[62.5, 37.5]]] },
        { titulo: "Decoração (saboneteira, difusor)", pontos: [[[64.3, 65.5]]] },
        { titulo: "Cesto (dentro do armário)", pontos: [[[60.1, 73.4]]] },
        { titulo: "Porta shampoo", pontos: [[[39.1, 50.0]]] }
      ] }
    ],
    prioridade: ["banheiro", "escritorio", "quarto", "social"]
  },


  /* Vídeos que vêm sozinhos do portfólio principal (leticiacalisto.com).
     "nicho" é o nome exato do nicho lá. Mude lá e muda aqui. */
  portfolio: {
    nicho: "Casa e Decor",
    rotulo: "Conteúdos produzidos"
  },

  /* Página dos vídeos de casa (vem depois do tour) */
  nicho: {
    rotulo: "Casa e decoração",
    titulo: { impacto: "Vídeos produzidos pra marcas de", cursiva: "casa, móveis, reforma e organização" },
    sub: "Clique pra assistir"
  },

  procuro: {
    eyebrow: "O que estou procurando",
    titulo: { impacto: "itens que ainda", cursiva: "estou buscando" },   // o número é calculado sozinho e entra antes
    /* Os colchetes viram link para o seu WhatsApp */
    texto: "Caso o produto da sua marca não esteja na lista e fizer sentido pra obra, [entre em contato comigo!]",
    botao: "Fazer proposta",
    /* Mensagem do botão de cada item. {item} e {ambiente} são trocados na hora. */
    mensagem: "Oi, Letícia! Vi o AP da Lê e quero fazer uma proposta para o item “{item}” ({ambiente}). Podemos conversar?",
    mensagemGeral: "Oi, Letícia! Vi o AP da Lê e tenho um produto que pode fazer sentido para a obra. Podemos conversar?",
    /* Os filtros. "Todos" mostra tudo. Cada item diz em qual filtro aparece. */
    nichos: ["Todos", "Mobília", "Eletrodomésticos", "Smart home", "Decoração", "Organização", "Iluminação", "Louças e metais"],
    /* aberta: true = botão "Fazer proposta" · false = FECHADO (sem botão) */
    itens: [
      // ---- Área social
      { nome: "Mesa de jantar", ambiente: "Área social · Jantar", nicho: "Mobília", aberta: true },
      { nome: "Cadeiras", ambiente: "Área social · Jantar", nicho: "Mobília", aberta: true },
      { nome: "Tapete", ambiente: "Área social · Sala", nicho: "Decoração", aberta: true },
      { nome: "Mesa redonda", ambiente: "Área social · Varanda", nicho: "Mobília", aberta: true },
      { nome: "Mesa lateral", ambiente: "Área social · Sala", nicho: "Mobília", aberta: true },
      { nome: "Plantas", ambiente: "Área social · Varanda", nicho: "Decoração", aberta: true },
      { nome: "Árvore", ambiente: "Área social · Sala", nicho: "Decoração", aberta: true },
      { nome: "Luminária de piso", ambiente: "Área social · Sala", nicho: "Iluminação", aberta: true },
      { nome: "Manta e almofadas de sofá", ambiente: "Área social · Sala", nicho: "Decoração", aberta: true },
      { nome: "Fechadura eletrônica", ambiente: "Área social · Entrada", nicho: "Smart home", aberta: true },
      { nome: "Organizadores de geladeira", ambiente: "Área social · Cozinha", nicho: "Organização", aberta: true },
      { nome: "Quadro (entrada)", ambiente: "Área social · Entrada", nicho: "Decoração", aberta: true },
      { nome: "Porta mantimentos", ambiente: "Área social · Cozinha", nicho: "Organização", aberta: true },
      { nome: "Lava e seca", ambiente: "Área social · Lavanderia", nicho: "Eletrodomésticos", aberta: true },
      { nome: "Torneira (tanque)", ambiente: "Área social · Lavanderia", nicho: "Louças e metais", aberta: true },
      { nome: "Lixeira inox", ambiente: "Área social · Cozinha", nicho: "Organização", aberta: true },
      { nome: "Banco (varanda)", ambiente: "Área social · Varanda", nicho: "Mobília", aberta: true },
      { nome: "Mesa posta", ambiente: "Área social · Jantar", nicho: "Decoração", aberta: true },
      { nome: "Marcenaria da sala", ambiente: "Área social · Sala", nicho: "Mobília", aberta: true },
      { nome: "Decoração da sala", ambiente: "Área social · Sala", nicho: "Decoração", aberta: true },
      { nome: "Decoração da cozinha", ambiente: "Área social · Cozinha", nicho: "Decoração", aberta: true },
      { nome: "Espelho (pilar ao lado do sofá)", ambiente: "Área social · Sala", nicho: "Mobília", aberta: true },
      { nome: "Cortina (varanda)", ambiente: "Área social · Varanda", nicho: "Decoração", aberta: true },
      // ---- Escritório / Closet
      { nome: "Cortina", ambiente: "Escritório / Closet", nicho: "Decoração", aberta: true },
      { nome: "Marcenaria", ambiente: "Escritório / Closet", nicho: "Mobília", aberta: true },
      { nome: "Estofado", ambiente: "Escritório / Closet", nicho: "Mobília", aberta: true },
      { nome: "Iluminação", ambiente: "Escritório / Closet", nicho: "Iluminação", aberta: true },
      { nome: "Luminária de mesa", ambiente: "Escritório / Closet", nicho: "Iluminação", aberta: true },
      { nome: "Decoração", ambiente: "Escritório / Closet", nicho: "Decoração", aberta: true },
      { nome: "Cadeira office", ambiente: "Escritório / Closet", nicho: "Mobília", aberta: true },
      { nome: "Espelho", ambiente: "Escritório / Closet", nicho: "Mobília", aberta: true },
      { nome: "Puxadores", ambiente: "Escritório / Closet", nicho: "Mobília", aberta: true },
      { nome: "Organizadores", ambiente: "Escritório / Closet", nicho: "Organização", aberta: true },
      // ---- Quarto
      { nome: "Marcenaria", ambiente: "Quarto", nicho: "Mobília", aberta: true },
      { nome: "Espelho redondo com LED", ambiente: "Quarto", nicho: "Mobília", aberta: true },
      { nome: "LED", ambiente: "Quarto", nicho: "Iluminação", aberta: true },
      { nome: "Cadeira", ambiente: "Quarto", nicho: "Mobília", aberta: true },
      { nome: "Cabeceira", ambiente: "Quarto", nicho: "Mobília", aberta: true },
      { nome: "Base da cama", ambiente: "Quarto", nicho: "Mobília", aberta: true },
      { nome: "Jogo de cama", ambiente: "Quarto", nicho: "Decoração", aberta: true },
      { nome: "Quadros", ambiente: "Quarto", nicho: "Decoração", aberta: true },
      { nome: "Abajur", ambiente: "Quarto", nicho: "Iluminação", aberta: true },
      { nome: "Arandela", ambiente: "Quarto", nicho: "Iluminação", aberta: true },
      { nome: "Travesseiros", ambiente: "Quarto", nicho: "Decoração", aberta: true },
      { nome: "Puxadores", ambiente: "Quarto", nicho: "Mobília", aberta: true },
      // ---- Banheiro
      { nome: "Lixeira automática", ambiente: "Banheiro", nicho: "Organização", aberta: true },
      { nome: "Torneira", ambiente: "Banheiro", nicho: "Louças e metais", aberta: true },
      { nome: "Espelhos", ambiente: "Banheiro", nicho: "Louças e metais", aberta: true },
      { nome: "LED", ambiente: "Banheiro", nicho: "Iluminação", aberta: true },
      { nome: "Decoração (saboneteira, difusor)", ambiente: "Banheiro", nicho: "Decoração", aberta: true },
      { nome: "Cesto (dentro do armário)", ambiente: "Banheiro", nicho: "Organização", aberta: true },
      { nome: "Porta shampoo", ambiente: "Banheiro", nicho: "Organização", aberta: true }
    ]
  },

  parceria: {
    eyebrow: "Formatos de parceria",
    titulo: { impacto: "Três jeitos", cursiva: "de entrar" },
    texto: "Em todos os formatos a marca entra com produto + cachê de produção.",
    botao: "Quero esse formato",
    formatos: [
      { numero: "01", nome: "Assine o projeto comigo", destaque: true,
        entregas: [
          "2 reels dedicados + destaque nos tours de todos os ambientes aplicáveis",
          "4 sequências de stories ao longo da execução do projeto, com link opcional",
          "Exclusividade na categoria",
          "Fotos de todos os ambientes em alta qualidade",
          "Direito de uso por 6 meses"
        ] },
      { numero: "02", nome: "Participação combo", destaque: false,
        entregas: [
          "2 vídeos: 1 vídeo UGC dedicado + 1 reel dedicado ou integrado ao conteúdo da obra",
          "2 sequências de stories (unboxing e instalação), com link opcional",
          "Fotos em alta qualidade",
          "Direitos de uso por 4 meses"
        ] },
      { numero: "03", nome: "Participação pontual", destaque: false,
        entregas: [
          "1 vídeo UGC dedicado ou 1 reel com integração ao conteúdo da obra",
          "1 sequência de stories com link opcional",
          "Direitos de uso por 3 meses"
        ] }
    ]
  },

  duvidas: {
    eyebrow: "Dúvidas comuns",
    titulo: { impacto: "O que as marcas", cursiva: "costumam perguntar" },
    itens: [
      { p: "Como funciona o pagamento?",
        r: "O pagamento tem duas partes. A marca entra com o produto, que é enviado ou instalado aqui e passa a fazer parte da obra, e com o cachê de produção do conteúdo. O produto é o material do projeto e o conteúdo é o meu trabalho, então cada um tem o seu valor. Tudo é fechado em contrato antes de começar, com o volume de entregas e os prazos combinados." },
      { p: "Posso participar com um item só?",
        r: "Pode. A Participação pontual foi pensada para isso: um produto, um conteúdo (vídeo UGC dedicado ou reel integrado à obra), uma sequência de stories com link opcional e direitos de uso por 3 meses." },
      { p: "Tenho exclusividade na minha categoria?",
        r: "A exclusividade faz parte do formato “Assine o projeto comigo”. O prazo de duração, e se ela vai cobrir toda a necessidade da obra ou só parte dela, ficam por conta da negociação." },
      { p: "Posso usar os vídeos nos meus anúncios?",
        r: "Pode. Os direitos de uso estão incluídos em todos os formatos: 6 meses em “Assine o projeto comigo”, 4 meses na Participação combo e 3 meses na Participação pontual." }
    ]
  },

  final: {
    eyebrow: "Vamos construir juntos",
    titulo: { impacto: "Seu produto dentro", cursiva: "do AP da Lê" },
    texto: "Me conta qual item interessa à sua marca e eu volto com os detalhes do formato ideal.",
    botaoZap: "Chamar no WhatsApp",
    botaoEmail: "Mandar e-mail",
    assunto: "Parceria no projeto de reforma"
  }
};
