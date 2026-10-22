/* Nicho Casa e Decor, 3 depoimentos e a tarja de marcas: o mesmo comportamento do
   portfólio principal (leticiacalisto.com): prévia em vídeo ao passar o mouse,
   balão de play no lugar do cursor, balão de seta perto das pontas do carrossel e
   janela do vídeo por cima da página.
   Os dados vêm do nicho-dados.js (cópia do portfólio principal). Quando a página
   está num endereço http(s), os vídeos são atualizados com a versão mais recente do
   mesmo banco do portfólio principal. */
(function () {
  var D = window.NICHO_DADOS;
  var secao = document.getElementById("nicho");
  if (!D || !secao) return;
  var $ = function (id) { return document.getElementById(id); };
  var escapar = function (t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  };
  var SETAS = {
    play: "M8 5v14l11-7z",
    anterior: "M15.4 4.6L14 3.2 5.2 12l8.8 8.8 1.4-1.4L8 12z",
    proximo: "M8.6 4.6L10 3.2 18.8 12 10 20.8l-1.4-1.4L15 12z"
  };
  var GRADIENTES = {
    grafiteProfundo: "linear-gradient(150deg, #545454 0%, #3d3d3d 55%, #14110d 100%)",
    grafiteCreme: "linear-gradient(145deg, #545454 0%, #a09a95 48%, #f3eee9 100%)",
    laranjaSol: "linear-gradient(150deg, #991a0e 0%, #c9705f 52%, #f3eee9 100%)",
    laranjaTinta: "linear-gradient(160deg, #991a0e 0%, #6b1109 50%, #14110d 100%)",
    cremeSuave: "linear-gradient(145deg, #f3eee9 0%, #e0d4c6 55%, #c9b7a4 100%)",
    tintaNoite: "linear-gradient(150deg, #14110d 0%, #2e2a24 50%, #545454 100%)",
    duoQuente: "linear-gradient(140deg, #545454 0%, #991a0e 100%)",
    areiaGrafite: "linear-gradient(145deg, #e8e0d7 0%, #b5b0ab 50%, #545454 100%)",
    vinhoSuave: "linear-gradient(155deg, #991a0e 0%, #6f2c16 55%, #14110d 100%)"
  };
  var gradiente = function (n) { return GRADIENTES[n] || n || GRADIENTES.cremeSuave; };
  var idDoYoutube = function (link) {
    if (!link) return null;
    var m = String(link).match(/(?:youtube(?:-nocookie)?\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  };
  var capaYoutube = function (id) { return "https://i.ytimg.com/vi/" + id + "/maxresdefault.jpg"; };
  var capaAlternativa = function (id) { return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; };
  var comMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var http = location.protocol !== "file:";
  var svg = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; };

  /* ---------- cabeçalho, setas e carrossel ---------- */
  var T = (window.CONTEUDO && window.CONTEUDO.nicho) || {};
  $("nicho-cab").innerHTML =
    '<div class="n-cab__texto">' + (T.rotulo ? '<p class="rotulo">' + escapar(T.rotulo) + "</p>" : "") +
      '<h2 class="dep__titulo" id="titulo-nicho"><span class="dep__impacto">' + escapar((T.titulo || {}).impacto || "") + '</span> <span class="dep__cursiva">' + escapar((T.titulo || {}).cursiva || "") + "</span></h2>" +
      (T.sub ? '<p class="n-cab__sub">' + escapar(T.sub) + "</p>" : "") + "</div>" +
    '<div class="n-setas">' +
      '<button type="button" class="n-seta" id="nicho-ant" aria-label="Ver os vídeos anteriores">' + svg(SETAS.anterior) + "</button>" +
      '<button type="button" class="n-seta" id="nicho-prox" aria-label="Ver os próximos vídeos">' + svg(SETAS.proximo) + "</button>" +
    "</div>";
  secao.setAttribute("aria-labelledby", "titulo-nicho");
  var carrossel = $("nicho-car"), trilho = $("nicho-trilho");

  var atualizarSetas = function () {
    var fim = carrossel.scrollWidth - carrossel.clientWidth - 2;
    $("nicho-ant").disabled = carrossel.scrollLeft <= 2;
    $("nicho-prox").disabled = carrossel.scrollLeft >= fim;
  };
  carrossel.addEventListener("scroll", atualizarSetas, { passive: true });
  window.addEventListener("resize", atualizarSetas);
  var rolar = function (sentido) { carrossel.scrollBy({ left: sentido * carrossel.clientWidth, behavior: "smooth" }); };
  $("nicho-ant").addEventListener("click", function () { rolar(-1); });
  $("nicho-prox").addEventListener("click", function () { rolar(1); });

  /* ---------- prévia ao passar o mouse (só com mouse e em http/https) ---------- */
  var observarCards = function () {};
  if (comMouse && http) {
    var aquecidos = new Map(), cardPrevia = null;
    var comando = function (frame, func, args) {
      try { frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: args || [] }), "*"); } catch (e) {}
    };
    var tocar = function (info) {
      comando(info.frame, "playVideo");
      info.card.classList.add("com-previa");
      info.frame.classList.add("visivel");
    };
    var aquecer = function (card) {
      if (aquecidos.has(card) || !card.isConnected) return;
      var id = card.getAttribute("data-youtube");
      var frame = document.createElement("iframe");
      frame.className = "n-video__previa";
      frame.tabIndex = -1;
      frame.setAttribute("aria-hidden", "true");
      frame.setAttribute("scrolling", "no");
      frame.allow = "autoplay; encrypted-media";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.src = "https://www.youtube.com/embed/" + encodeURIComponent(id) +
        "?autoplay=0&mute=1&controls=0&loop=1&playlist=" + encodeURIComponent(id) +
        "&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&cc_load_policy=0&fs=0&vq=small" +
        "&enablejsapi=1&origin=" + encodeURIComponent(location.origin);
      var info = { card: card, frame: frame, pronto: false, quer: false };
      frame.addEventListener("load", function () {
        [0, 400, 1200].forEach(function (t) {
          window.setTimeout(function () {
            if (info.pronto) return;
            try { frame.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); } catch (e) {}
            comando(frame, "unloadModule", ["captions"]);
          }, t);
        });
      });
      card.insertBefore(frame, card.firstChild.nextSibling);
      aquecidos.set(card, info);
      return info;
    };
    var esfriar = function (card) {
      var info = aquecidos.get(card);
      if (!info || card === cardPrevia) return;
      info.frame.remove();
      aquecidos.delete(card);
    };
    window.addEventListener("message", function (evento) {
      if (evento.origin.indexOf("youtube.com") < 0) return;
      var dados = evento.data;
      if (typeof dados === "string") { try { dados = JSON.parse(dados); } catch (e) { return; } }
      if (!dados || (dados.event !== "onReady" && dados.event !== "initialDelivery")) return;
      aquecidos.forEach(function (info) {
        if (info.frame.contentWindow !== evento.source || info.pronto) return;
        info.pronto = true;
        if (info.quer) tocar(info);
      });
    });
    var pararPrevia = function () {
      if (!cardPrevia) return;
      var info = aquecidos.get(cardPrevia);
      cardPrevia.classList.remove("com-previa");
      if (info) {
        info.quer = false;
        info.frame.classList.remove("visivel");
        if (info.pronto) { comando(info.frame, "pauseVideo"); comando(info.frame, "seekTo", [0, true]); }
      }
      cardPrevia = null;
    };
    trilho.addEventListener("mouseover", function (evento) {
      var card = evento.target.closest ? evento.target.closest(".n-video[data-youtube]") : null;
      if (!card || card === cardPrevia) return;
      pararPrevia();
      cardPrevia = card;
      var info = aquecidos.get(card) || aquecer(card);
      info.quer = true;
      if (info.pronto) tocar(info);
    });
    trilho.addEventListener("mouseout", function (evento) {
      if (!cardPrevia) return;
      var para = evento.relatedTarget;
      if (para && para.closest && para.closest(".n-video") === (evento.target.closest && evento.target.closest(".n-video"))) return;
      pararPrevia();
    });
    carrossel.addEventListener("scroll", pararPrevia, { passive: true });
    var vigia = "IntersectionObserver" in window ? new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) aquecer(e.target); else esfriar(e.target); });
    }, { threshold: 0.5 }) : null;
    observarCards = function () {
      pararPrevia();
      aquecidos.clear();
      if (!vigia) return;
      vigia.disconnect();
      Array.prototype.forEach.call(trilho.querySelectorAll(".n-video[data-youtube]"), function (c) { vigia.observe(c); });
    };
  }

  /* ---------- balões no lugar do cursor ---------- */
  if (comMouse) {
    var ZONA_DENTRO = 110;
    var balao = document.createElement("div");
    balao.className = "n-cursor";
    document.body.appendChild(balao);
    var sentidoAtual = 0;
    var sentidoDoPonteiro = function (evento) {
      if (evento.target.closest && evento.target.closest(".n-video__play")) return 0;
      var area = carrossel.getBoundingClientRect();
      if (evento.clientY < area.top || evento.clientY > area.bottom) return 0;
      var fim = carrossel.scrollWidth - carrossel.clientWidth - 2;
      if (evento.clientX <= area.left + ZONA_DENTRO && carrossel.scrollLeft > 2) return -1;
      if (evento.clientX >= area.right - ZONA_DENTRO && carrossel.scrollLeft < fim) return 1;
      return 0;
    };
    var esconderBalao = function () {
      sentidoAtual = 0;
      balao.classList.remove("visivel");
      carrossel.classList.remove("sem-cursor");
    };
    secao.addEventListener("mousemove", function (evento) {
      var sentido = sentidoDoPonteiro(evento);
      if (sentido === 0) { esconderBalao(); return; }
      if (sentido !== sentidoAtual) {
        sentidoAtual = sentido;
        balao.innerHTML = svg(sentido < 0 ? SETAS.anterior : SETAS.proximo);
      }
      balao.style.left = evento.clientX + "px";
      balao.style.top = evento.clientY + "px";
      balao.classList.add("visivel");
      carrossel.classList.add("sem-cursor");
    });
    secao.addEventListener("mouseleave", esconderBalao);

    var balaoPlay = document.createElement("div");
    balaoPlay.className = "n-cursor n-cursor--play";
    balaoPlay.innerHTML = svg(SETAS.play);
    document.body.appendChild(balaoPlay);
    var esconderPlay = function () { balaoPlay.classList.remove("visivel"); };
    secao.addEventListener("mousemove", function (evento) {
      var card = evento.target.closest ? evento.target.closest(".n-video") : null;
      if (!card || sentidoAtual !== 0) { esconderPlay(); return; }
      balaoPlay.style.left = evento.clientX + "px";
      balaoPlay.style.top = evento.clientY + "px";
      balaoPlay.classList.add("visivel");
    });
    secao.addEventListener("mouseleave", esconderPlay);
    carrossel.addEventListener("scroll", esconderPlay, { passive: true });
    carrossel.addEventListener("scroll", esconderBalao, { passive: true });
    /* na fase de captura, para o clique valer como "avançar" mesmo em cima de um card */
    secao.addEventListener("click", function (evento) {
      if (sentidoAtual === 0) return;
      evento.preventDefault();
      evento.stopPropagation();
      rolar(sentidoAtual);
      esconderBalao();
    }, true);
  }

  /* ---------- os cards ---------- */
  var htmlVideos = function (nicho) {
    return nicho.videos.map(function (v) {
      var id = idDoYoutube(v.link);
      var capa = v.capa || (id ? capaYoutube(id) : "");
      var fundo = capa
        ? '<img src="' + escapar(capa) + '" alt=""' + (id ? ' data-capa-alternativa="' + escapar(capaAlternativa(id)) + '"' : "") + ' loading="lazy">'
        : '<span class="n-video__fundo" style="background:' + gradiente(v.gradiente) + '"></span>';
      var miolo = fundo +
        (v.marca ? '<span class="n-video__marca">' + escapar(v.marca) + "</span>" : "") +
        '<span class="n-video__play">' + svg(SETAS.play) + "</span>" +
        (v.conteudo ? '<span class="n-video__base"><span>' + escapar(v.conteudo) + "</span></span>" : "");
      if (id) {
        var titulo = v.marca ? (v.marca + (v.conteudo ? " — " + v.conteudo : "")) : "";
        return '<button type="button" class="n-video' + (nicho.horizontal ? " n-video--horizontal" : "") + '" data-youtube="' + escapar(id) + '"' +
          (titulo ? ' data-titulo="' + escapar(titulo) + '"' : "") +
          (String(v.link).indexOf("/shorts/") > -1 ? ' data-vertical="1"' : "") + ' aria-haspopup="dialog">' + miolo + "</button>";
      }
      return v.link
        ? '<a class="n-video" href="' + escapar(v.link) + '" target="_blank" rel="noopener">' + miolo + "</a>"
        : '<div class="n-video">' + miolo + "</div>";
    }).join("");
  };
  var mostraNicho = function (nicho) {
    carrossel.classList.toggle("n-car--horizontal", !!nicho.horizontal);
    trilho.innerHTML = htmlVideos(nicho);
    carrossel.scrollLeft = 0;
    observarCards();
    $("nicho-aviso").textContent = nicho.videos.length + " vídeos em " + nicho.nome + ".";
    requestAnimationFrame(atualizarSetas);
  };
  mostraNicho(D.nicho);

  /* Se a capa em qualidade máxima não existir, troca pela que o YouTube sempre gera */
  var trocaCapa = function (img) {
    if (img && img.matches && img.matches(".n-video img[data-capa-alternativa]")) {
      img.src = img.dataset.capaAlternativa;
      img.removeAttribute("data-capa-alternativa");
    }
  };
  document.addEventListener("error", function (e) { trocaCapa(e.target); }, true);
  document.addEventListener("load", function (e) {
    var img = e.target;
    if (img && img.tagName === "IMG" && img.naturalWidth > 0 && img.naturalWidth < 400) trocaCapa(img);
  }, true);

  /* ---------- janela do vídeo ---------- */
  var lightbox = $("n-lightbox"), player = $("n-lightbox-player"), focoAntes = null;
  var abrirVideo = function (id, origem) {
    focoAntes = origem || document.activeElement;
    lightbox.querySelector(".n-lightbox__caixa").classList.toggle("n-lightbox__caixa--horizontal",
      !!(origem && origem.classList && origem.classList.contains("n-video--horizontal")));
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () { lightbox.classList.add("aberto"); });
    $("n-lightbox-fechar").focus();
    player.innerHTML = '<iframe src="https://www.youtube.com/embed/' + encodeURIComponent(id) +
      "?autoplay=1&playsinline=1&rel=0&modestbranding=1&vq=hd1080&cc_load_policy=0&hl=pt" +
      (http ? "&enablejsapi=1&origin=" + encodeURIComponent(location.origin) : "") +
      '" title="Vídeo" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    if (http) {
      var frame = player.querySelector("iframe");
      [500, 1200, 2500].forEach(function (t) {
        window.setTimeout(function () {
          try { frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: "unloadModule", args: ["captions"] }), "*"); } catch (e) {}
        }, t);
      });
    }
  };
  var fecharVideo = function () {
    if (lightbox.hidden) return;
    lightbox.classList.remove("aberto");
    document.body.style.overflow = "";
    window.setTimeout(function () { lightbox.hidden = true; player.innerHTML = ""; }, 250);
    if (focoAntes && focoAntes.focus) focoAntes.focus();
  };
  document.addEventListener("click", function (e) {
    var card = e.target.closest("#nicho [data-youtube]");
    if (card) { abrirVideo(card.dataset.youtube, card); return; }
    if (e.target.closest("#n-lightbox-fechar")) { fecharVideo(); return; }
    if (e.target === lightbox) fecharVideo();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !lightbox.hidden) fecharVideo(); });

  /* ---------- 3 melhores depoimentos ---------- */
  var AVATARES = ["grafiteProfundo", "laranjaTinta", "tintaNoite"];
  var iniciais = function (nome) { return nome.split(" ").filter(Boolean).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join(""); };
  $("nicho-dep").innerHTML = D.depoimentos.map(function (d, i) {
    var logo = d.logo
      ? '<img class="dep3__logo" src="' + escapar(d.logo) + '" alt="" loading="lazy">'
      : '<span class="dep3__logo dep3__iniciais" aria-hidden="true" style="background:' + gradiente(AVATARES[i % AVATARES.length]) + '">' + escapar(iniciais(d.marca)) + "</span>";
    return '<figure class="dep3__card rev" style="--atraso:' + (i * 0.1) + 's"><blockquote>“' + escapar(d.texto) + "”</blockquote>" +
      "<figcaption>" + logo + '<span class="dep3__quem"><b>' + escapar(d.marca) + "</b>" + (d.legenda ? "<span>" + escapar(d.legenda) + "</span>" : "") + "</span></figcaption></figure>";
  }).join("");

  /* ---------- marcas que confiam no meu trabalho ---------- */
  var secMarcas = $("marcas");
  if (secMarcas && D.logos && D.logos.length) {
    secMarcas.querySelector(".rotulo").innerHTML = "<span>" + escapar(D.rotuloMarcas || "Marcas que confiam no meu trabalho") + "</span>";
    var grupo = '<ul class="n-marq__grupo">' + D.logos.map(function (m) {
      var cls = "n-logo" + (m.preenchida ? " n-logo--preenchida" : "") + (m.preta ? " n-logo--preta" : "");
      return '<li class="' + cls + '"><img src="../imagens/logos/' + escapar(m.arquivo) + '" alt="Logo ' + escapar(m.nome) + '" loading="lazy"></li>';
    }).join("") + "</ul>";
    $("marcas-trilho").innerHTML = grupo + grupo.replace('<ul class="n-marq__grupo">', '<ul class="n-marq__grupo" aria-hidden="true">');
    /* logo comprida (uma palavra deitada) usa mais largura dentro da bolinha */
    Array.prototype.forEach.call(secMarcas.querySelectorAll(".n-logo img"), function (img) {
      var mede = function () { if (img.naturalWidth && img.naturalWidth / img.naturalHeight >= 1.9) img.parentNode.classList.add("n-logo--larga"); };
      if (img.complete) mede(); else img.addEventListener("load", mede, { once: true });
    });
  }

  /* ---------- celular: depoimentos empilhados, passam sozinhos a cada 3 s e também arrastando ---------- */
  (function () {
    var caixa = $("nicho-dep"), cards = Array.prototype.slice.call(caixa.querySelectorAll(".dep3__card"));
    var total = cards.length, movel = window.matchMedia("(max-width:620px)");
    if (total < 2) return;
    var atual = 0, relogio = null, ocupado = false, toque = null;
    var posiciona = function () {
      cards.forEach(function (c, k) { c.setAttribute("data-pos", String(Math.min((k - atual + total) % total, 3))); });
    };
    var ir = function (d) {
      if (ocupado) return;
      ocupado = true;
      var frente = cards[atual], classe = d > 0 ? "sai-esq" : "sai-dir";
      frente.style.transform = ""; frente.classList.remove("arrastando"); frente.classList.add(classe);
      window.setTimeout(function () {
        atual = (atual + d + total) % total;
        posiciona();
        frente.classList.remove(classe);
        ocupado = false;
      }, 420);
    };
    var para = function () { window.clearInterval(relogio); relogio = null; };
    var comeca = function () { para(); if (movel.matches) relogio = window.setInterval(function () { if (!toque) ir(1); }, 3000); };
    var aplica = function () {
      if (movel.matches) { posiciona(); comeca(); }
      else { para(); cards.forEach(function (c) { c.removeAttribute("data-pos"); c.classList.remove("sai-esq", "sai-dir", "arrastando"); c.style.transform = ""; }); }
    };
    caixa.addEventListener("pointerdown", function (e) {
      if (!movel.matches || ocupado) return;
      toque = { x: e.clientX, dx: 0 };
      cards[atual].classList.add("arrastando");
      try { caixa.setPointerCapture(e.pointerId); } catch (err) {}
    });
    caixa.addEventListener("pointermove", function (e) {
      if (!toque) return;
      toque.dx = e.clientX - toque.x;
      cards[atual].style.transform = "translateX(" + toque.dx + "px) rotate(" + (toque.dx / 22).toFixed(1) + "deg)";
    });
    var solta = function () {
      if (!toque) return;
      var dx = toque.dx, frente = cards[atual];
      toque = null;
      frente.classList.remove("arrastando");
      if (Math.abs(dx) > 45) ir(dx < 0 ? 1 : -1);
      else frente.style.transform = "";
      comeca();                       // depois de mexer, a contagem de 3 s recomeça
    };
    caixa.addEventListener("pointerup", solta);
    caixa.addEventListener("pointercancel", solta);
    if (movel.addEventListener) movel.addEventListener("change", aplica); else movel.addListener(aplica);
    aplica();
  })();

  /* ---------- animação de entrada dos depoimentos ---------- */
  var revs = secao.querySelectorAll(".rev");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    Array.prototype.forEach.call(revs, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(revs, function (el) { el.classList.add("visto"); });
  }

  /* ---------- versão mais recente dos vídeos (só em http/https) ---------- */
  if (http) {
    fetch("../index.html", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (texto) {
      var url = (texto.match(/SUPABASE_URL\s*=\s*"([^"]+)"/) || [])[1], chave = (texto.match(/SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/) || [])[1];
      if (!url || !chave) throw new Error("sem credenciais");
      var cab = { apikey: chave, Authorization: "Bearer " + chave };
      var buscar = function (c) { return fetch(url + "/rest/v1/" + c, { headers: cab }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); };
      return buscar("portfolio_nichos?select=id,nome,horizontal&nome=eq." + encodeURIComponent(D.nicho.nome)).then(function (ns) {
        if (!ns.length) throw new Error("nicho não encontrado");
        return buscar("portfolio_videos?select=*&visivel=eq.true&nicho_id=eq." + ns[0].id + "&order=ordem.asc").then(function (vs) {
          var novos = vs.map(function (v) { return { marca: v.marca, conteudo: v.conteudo || "", capa: v.capa || "", link: v.link, gradiente: v.gradiente || "" }; });
          if (!novos.length || JSON.stringify(novos) === JSON.stringify(D.nicho.videos)) return;
          D.nicho.videos = novos; D.nicho.horizontal = !!ns[0].horizontal;
          mostraNicho(D.nicho);
        });
      });
    }).catch(function (e) { console.warn("Mantendo a cópia local dos vídeos:", e && e.message); });
  }
})();
