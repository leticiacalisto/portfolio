// =====================================================================
// RASTREAMENTO DO PORTFÓLIO (sem biblioteca — chama a API do Supabase
// direto por fetch, pra não pesar o carregamento do site público).
// Alimenta as tabelas portfolio_events e portfolio_leads, que o
// painel.html lê para mostrar visitas, cliques, vídeos e mensagens.
// =====================================================================
(function () {
  var SUPABASE_URL = "https://yqshjfzcoyiqikjnukyb.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxc2hqZnpjb3lpcWlram51a3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzIzNDgsImV4cCI6MjEwNDU0ODM0OH0.QBseFaGdtG_6g2c_7EUeGnbhb9_JIa0hBsA2AzGnkp4";

  function idSessao() {
    try {
      var chave = "sessao_portfolio";
      var atual = sessionStorage.getItem(chave);
      if (!atual) {
        atual = "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
        sessionStorage.setItem(chave, atual);
      }
      return atual;
    } catch (erro) {
      return "sem_sessao";
    }
  }

  function enviar(tabela, corpo) {
    fetch(SUPABASE_URL + "/rest/v1/" + tabela, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(corpo),
      keepalive: true,
    }).catch(function () {
      /* Sem internet ou Supabase fora do ar: não atrapalha a navegação do visitante */
    });
  }

  function evento(tipo, nome, metadata) {
    enviar("portfolio_events", {
      event_type: tipo,
      event_name: nome || null,
      session_id: idSessao(),
      metadata: metadata || null,
    });
  }

  function lead(dados) {
    enviar("portfolio_leads", dados);
  }

  window.Rastreamento = { evento: evento, lead: lead };

  // Visita: uma vez por carregamento de página
  evento("page_view");

  // Cliques: vídeos abertos (data-youtube) e qualquer elemento com data-rastrear
  document.addEventListener("click", function (evt) {
    var video = evt.target.closest("[data-youtube]");
    if (video) {
      evento("video_view", video.dataset.youtube, { title: video.dataset.titulo || video.dataset.youtube });
      return;
    }
    var marcado = evt.target.closest("[data-rastrear]");
    if (marcado) {
      evento("button_click", marcado.dataset.rastrear);
    }
  });
})();
