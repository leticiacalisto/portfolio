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

  // De onde veio a visita. Prioridade: o parâmetro do link (?origem=instagram,
  // ?utm_source=..., ?ref=...) e só depois o site de referência (document.referrer).
  // Sem nenhum dos dois = acesso direto (link colado, app que não informa a origem etc.).
  var SITES_CONHECIDOS = [
    [/(^|\.)instagram\.com$/, "instagram"],
    [/(^|\.)(wa\.me|whatsapp\.com)$/, "whatsapp"],
    [/(^|\.)(tiktok\.com)$/, "tiktok"],
    [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
    [/(^|\.)(google\.[a-z.]+)$/, "google"],
    [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
    [/(^|\.)(facebook\.com|fb\.com|l\.facebook\.com)$/, "facebook"],
    [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "x"],
    [/(^|\.)seuinfluencer\.[a-z.]+$/, "seuinfluencer"],
  ];
  function origemDaVisita() {
    var origem = "";
    var meio = "";
    var campanha = "";
    try {
      var params = new URLSearchParams(location.search);
      origem = (params.get("origem") || params.get("utm_source") || params.get("ref") || params.get("src") || "").trim().toLowerCase();
      meio = (params.get("utm_medium") || "").trim().toLowerCase();
      campanha = (params.get("utm_campaign") || "").trim().toLowerCase();
    } catch (erro) {}
    var site = "";
    try {
      if (document.referrer) {
        site = new URL(document.referrer).hostname.replace(/^www\./, "");
        if (site === location.hostname.replace(/^www\./, "")) site = "";
      }
    } catch (erro) {}
    if (!origem && site) {
      origem = site;
      for (var i = 0; i < SITES_CONHECIDOS.length; i++) {
        if (SITES_CONHECIDOS[i][0].test(site)) {
          origem = SITES_CONHECIDOS[i][1];
          break;
        }
      }
    }
    return { origem: origem || "direto", site: site || null, meio: meio || null, campanha: campanha || null };
  }

  // Visita: uma vez por carregamento de página (com a origem junto)
  var origemAtual = origemDaVisita();
  evento("page_view", null, origemAtual);

  // LEITURA (só no portfólio, a página inicial): quanto tempo a pessoa ficou com
  // a página na tela, até quantos % rolou e até qual seção chegou. Vai como evento
  // "leitura" toda vez que a página sai da tela (troca de aba, app, fecha); os
  // valores são acumulados e o painel fica com o maior de cada visita.
  var caminho = location.pathname.replace(/\/index\.html$/, "/");
  if (caminho === "/") {
    var visita = "v_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    var TEMPO_MAXIMO_MS = 30 * 60 * 1000; // aba esquecida aberta não distorce a média
    var tempoAtivo = 0;
    var desde = document.visibilityState === "visible" ? Date.now() : null;
    var rolagemMaxima = 0;
    var secoes = [];
    var secoesVistas = {};
    var secaoMaisFunda = "";

    var medirRolagem = function () {
      var doc = document.documentElement;
      var total = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
      var visto = (window.scrollY || doc.scrollTop || 0) + window.innerHeight;
      var pct = total > 0 ? Math.min(100, Math.round((visto / total) * 100)) : 100;
      if (pct > rolagemMaxima) rolagemMaxima = pct;
      // seção "alcançada" = o topo dela já apareceu nos 3/4 de cima da tela
      for (var i = 0; i < secoes.length; i++) {
        var s = secoes[i];
        if (!secoesVistas[s.id] && s.getBoundingClientRect().top < window.innerHeight * 0.75) {
          secoesVistas[s.id] = true;
          secaoMaisFunda = s.id;
        }
      }
    };
    var tempoAteAgora = function () {
      return Math.min(TEMPO_MAXIMO_MS, tempoAtivo + (desde ? Date.now() - desde : 0));
    };
    var ultimoEnvio = "";
    var enviarLeitura = function () {
      medirRolagem();
      var tempoS = Math.round(tempoAteAgora() / 1000);
      var resumo = tempoS + "|" + rolagemMaxima + "|" + secaoMaisFunda;
      if (resumo === ultimoEnvio || tempoS < 1) return;
      ultimoEnvio = resumo;
      evento("leitura", "portfolio", {
        visita: visita,
        origem: origemAtual.origem,
        tempo_s: tempoS,
        rolagem: rolagemMaxima,
        secao: secaoMaisFunda || null,
        secoes: Object.keys(secoesVistas),
        largura: window.innerWidth,
      });
    };

    var iniciarLeitura = function () {
      secoes = Array.prototype.slice.call(document.querySelectorAll("section[id]"));
      medirRolagem();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarLeitura);
    else iniciarLeitura();

    var agendado = false;
    window.addEventListener("scroll", function () {
      if (agendado) return;
      agendado = true;
      setTimeout(function () {
        agendado = false;
        medirRolagem();
      }, 250);
    }, { passive: true });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        if (desde) tempoAtivo += Date.now() - desde;
        desde = null;
        enviarLeitura();
      } else {
        desde = Date.now();
      }
    });
    window.addEventListener("pagehide", enviarLeitura);
  }

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
      return;
    }
    // Qualquer outro botão ou link do site também conta (o nome vem do texto), para o
    // painel não ficar com "0 cliques" só porque o botão não foi marcado à mão.
    var alvo = evt.target.closest("button, a[href]");
    if (alvo) {
      var rotulo = (alvo.getAttribute("aria-label") || alvo.textContent || alvo.getAttribute("href") || "").replace(/\s+/g, " ").trim().slice(0, 50);
      if (rotulo) evento("button_click", "botao: " + rotulo);
    }
  });
})();
