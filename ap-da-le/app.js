/* Monta a página a partir do content.js. Para mudar textos, edite o content.js;
   este arquivo só cuida do layout e do comportamento. */
(function () {
  var C = window.CONTEUDO;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var rev = function (atraso) { return 'class="rev"' + (atraso ? ' style="--atraso:' + atraso + 's"' : ""); };
  /* título de seção: League Spartan + a cursiva, como no portfólio principal */
  var tit = function (t) { return '<h2 class="dep__titulo"><span class="dep__impacto">' + esc(t.impacto) + '</span> <span class="dep__cursiva">' + esc(t.cursiva) + "</span></h2>"; };
  var rotulo = function (t, extra) { return '<p class="rotulo ' + (extra || "") + '">' + esc(t) + "</p>"; };
  var img = function (src, alt, rotuloPh, escuro) {
    return src
      ? '<img class="img-cobre" src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy">'
      : '<div class="ph' + (escuro ? " ph--escuro" : "") + '" role="img" aria-label="' + esc(alt) + '">' + esc(rotuloPh) + "</div>";
  };
  var zap = function (msg) {
    return "https://wa.me/" + C.contato.whatsapp + "?text=" + encodeURIComponent(msg || C.contato.msgWhatsapp);
  };

  document.title = C.projeto + " · Proposta de parceria · Letícia Calisto";
  $("nomeTopo").textContent = C.projeto;
  $("menu").innerHTML = C.menu.map(function (m) {
    return '<li><a href="' + esc(m.href) + '">' + esc(m.texto) + "</a></li>";
  }).join("");

  /* ---------- 1. HERO ---------- */
  var h = C.hero;
  $("hero").innerHTML =
    '<div class="hero__palco">' +
    '<h1 class="hero__titulo" aria-label="minha reforma virando conteúdo"><span>minha</span><span>reforma</span><span>virando</span><span>conteúdo</span></h1>' +
    '<div class="hero__foto"><img src="fotos/capa-arquiteta.webp" alt="Letícia Calisto, arquiteta, com capacete de obra e projetos nas mãos" width="1166" height="1324"></div>' +
    '<div class="hero__lado">' +
    '<p class="hero__rotulo"><span class="hero__traco"></span><span>UGC</span><i>|</i><span>Arquiteta</span><i>|</i><span class="hero__local"><svg class="hero__pin" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>Florianópolis, SC</span></p>' +
    '<p class="hero__numeros"><b>+400 vídeos</b><i>|</i><b>+100 marcas</b><i>|</i><b>+20 nichos</b></p>' +
    '<div class="hero__botoes"><a class="hero__botao" href="#parceria">Quero ser parceiro</a><a class="hero__botao hero__botao--vazado" href="#procuro">Ver o que estou buscando</a></div>' +
    '</div></div>';
  var item = '<span class="marquee__item">' + esc(h.marquee) + " <i>✳</i></span>";
  $("marqueeHero").innerHTML = new Array(9).join(item);

  /* ---------- 2. QUEM ASSINA ---------- */
  var q = C.quemAssina;
  $("assinaConteudo").innerHTML =
    '<div class="sobre__grade">' +
      '<div class="sobre__visual rev"><div class="sobre__foto"><img src="' + esc(q.foto) + '" alt="' + esc(q.alt) + '" style="object-position:' + esc(q.posicaoFoto) + '" loading="lazy"></div></div>' +
      '<div class="sobre__texto rev" style="--atraso:.1s">' +
        '<p class="rotulo rotulo--traco">' + esc(q.eyebrow) + "</p>" +
        '<h2 class="titulo__manuscrita">' + q.titulo + "</h2>" +
        '<div class="sobre__corpo">' + q.paragrafos.map(function (p) { return "<p>" + p + "</p>"; }).join("") + "</div>" +
        '<ul class="sobre__selos">' + q.selos.map(function (t, i) { return "<li" + (i ? "" : ' class="destaque"') + ">" + esc(t) + "</li>"; }).join("") + (q.link ? '<li><a href="' + esc(q.link.url) + '" target="_blank" rel="noopener">' + esc(q.link.texto) + "</a></li>" : "") + "</ul>" +
      "</div></div>";

  /* ---------- 3. CARROSSEL ---------- */
  var S = C.carrossel, atual = 0;
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var icExpandir = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><path d="M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6"/></svg>';
  $("carrossel").innerHTML =
    '<div class="slider rev" role="region" aria-roledescription="carrossel" aria-label="Como vai ficar">' +
      '<div class="slider__janela" id="sjan"><div class="slider__faixa" id="sfaixa">' +
      S.map(function (s, i) {
        return '<div class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + " de " + S.length + '" data-i="' + i + '">' +
          img(s.imagem, "Render: " + s.ambiente, "Render — " + s.ambiente) + "</div>";
      }).join("") +
      '</div><button class="slider__expandir" id="sexp" type="button" aria-label="Expandir imagem">' + icExpandir + "</button></div>" +
      '<div class="container slider__info"><div class="slider__texto"><p class="rotulo">Como vai ficar</p><h3 id="samb"></h3></div>' +
      '<div class="slider__nav"><span class="slider__cont" id="scont" aria-live="polite"></span><div class="slider__setas">' +
      '<button class="seta" id="sprev" type="button" aria-label="Slide anterior">←</button>' +
      '<button class="seta" id="snext" type="button" aria-label="Próximo slide">→</button></div></div></div>' +
      '<div class="container"><div class="slider__previas" id="spag">' + S.map(function (s, i) {
        return '<button class="previa" type="button" data-i="' + i + '" aria-label="Ver ' + esc(s.ambiente) + '">' +
          (s.imagem ? '<img src="' + esc(s.imagem) + '" alt="" loading="lazy">' : "") + "<span>" + pad(i + 1) + "</span></button>";
      }).join("") + "</div></div></div>";

  var zmCx = document.createElement("div");
  zmCx.className = "lightbox"; zmCx.setAttribute("role", "dialog"); zmCx.setAttribute("aria-modal", "true"); zmCx.setAttribute("aria-label", "Imagem ampliada");
  zmCx.innerHTML = '<button class="lightbox__fechar" type="button" aria-label="Fechar">✕</button>' +
    '<button class="lightbox__ant" type="button" aria-label="Imagem anterior">←</button>' +
    '<figure class="lightbox__fig"><img alt=""><figcaption></figcaption></figure>' +
    '<button class="lightbox__prox" type="button" aria-label="Próxima imagem">→</button>';
  document.body.appendChild(zmCx);
  var zmImg = zmCx.querySelector("img"), zmLegenda = zmCx.querySelector("figcaption");

  function ir(i) {
    atual = (i + S.length) % S.length;
    $("sfaixa").style.transform = "translateX(-" + atual * 100 + "%)";
    $("scont").textContent = pad(atual + 1) + " / " + pad(S.length);
    $("samb").textContent = S[atual].ambiente;
    Array.prototype.forEach.call($("spag").children, function (b, k) {
      b.setAttribute("aria-current", k === atual ? "true" : "false");
    });
    if (zmCx.classList.contains("aberto")) pintaZoom();
  }
  function pintaZoom() {
    zmImg.src = S[atual].imagem || "";
    zmImg.alt = "Render: " + S[atual].ambiente;
    zmLegenda.innerHTML = "<b>" + esc(S[atual].ambiente) + "</b>" + pad(atual + 1) + " / " + pad(S.length);
  }
  function abre() { pintaZoom(); zmCx.classList.add("aberto"); document.body.style.overflow = "hidden"; zmCx.querySelector(".lightbox__fechar").focus(); }
  function fecha() { zmCx.classList.remove("aberto"); document.body.style.overflow = ""; $("sexp").focus(); }
  $("sexp").onclick = abre;
  $("sfaixa").onclick = function (e) { if (e.target.closest(".slide")) abre(); };
  zmCx.addEventListener("click", function (e) {
    if (e.target === zmCx || e.target.closest(".lightbox__fechar")) fecha();
    else if (e.target.closest(".lightbox__ant")) ir(atual - 1);
    else if (e.target.closest(".lightbox__prox")) ir(atual + 1);
  });
  document.addEventListener("keydown", function (e) {
    if (!zmCx.classList.contains("aberto")) return;
    if (e.key === "Escape") fecha();
    if (e.key === "ArrowLeft") ir(atual - 1);
    if (e.key === "ArrowRight") ir(atual + 1);
  });
  $("sprev").onclick = function () { ir(atual - 1); };
  $("snext").onclick = function () { ir(atual + 1); };
  $("spag").onclick = function (e) { var b = e.target.closest("button"); if (b) ir(+b.dataset.i); };
  $("sjan").tabIndex = 0;
  $("sjan").addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") ir(atual - 1);
    if (e.key === "ArrowRight") ir(atual + 1);
  });
  var x0 = null;
  $("sjan").addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  $("sjan").addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var d = e.changedTouches[0].clientX - x0;
    if (Math.abs(d) > 40) ir(atual + (d < 0 ? 1 : -1));
    x0 = null;
  });
  ir(0);

  /* ---------- 4. CRONOGRAMA (antigo "O projeto") ---------- */
  var p = C.projetoSecao;
  $("projetoConteudo").innerHTML =
    '<div class="cabecalho centro rev">' + rotulo(p.eyebrow, "rotulo--centro") + tit(p.titulo) + "</div>" +
    '<ol class="marcos marcos--4">' + p.etapas.map(function (m, i) {
      return "<li " + rev(i * .1).replace('class="rev"', 'class="marco rev' + (m.atual ? " marco--atual" : "") + (m.feito ? " marco--feito" : "") + '"') + "><small>Etapa " + pad(i + 1) + "</small><h4>" + esc(m.titulo) + "</h4><p>" + esc(m.texto) + "</p>" +
        (m.atual ? '<span class="marco__tag">Em andamento</span>' : "") + "</li>";
    }).join("") + "</ol>";

  /* ---------- 5. TOUR: montado por tour-explodido.js ---------- */

  /* ---------- 8. PROCURO ---------- */
  var pr = C.procuro, itensBusca = pr.itens;
  var abertas = itensBusca.filter(function (c) { return c.aberta; }).length;
  var msgItem = function (c) { return pr.mensagem.replace("{item}", c.nome).replace("{ambiente}", c.ambiente); };
  var linhaCat = function (c) {
    return '<li class="cat2' + (c.aberta ? "" : " cat2--fechada") + '" data-n="' + esc(c.nicho) + '"><div><h3>' + esc(c.nome) +
      "</h3><p>" + esc(c.ambiente) + "</p></div>" +
      (c.aberta ? '<a class="cat2__btn" href="' + esc(zap(msgItem(c))) + '" target="_blank" rel="noopener">' + esc(pr.botao) + "</a>" : '<span class="cat2__selo">FECHADO</span>') + "</li>";
  };
  var textoPr = esc(pr.texto).replace(/\[(.+?)\]/, '<a class="link-zap" href="' + esc(zap(pr.mensagemGeral)) + '" target="_blank" rel="noopener">$1</a>');
  $("procuroConteudo").innerHTML =
    '<div class="cabecalho rev">' + rotulo(pr.eyebrow) + tit({ impacto: abertas + " " + pr.titulo.impacto, cursiva: pr.titulo.cursiva }) + "<p>" + textoPr + "</p></div>" +
    '<div class="nichos2 rev" role="group" aria-label="Filtrar">' + pr.nichos.map(function (n, i) {
      return '<button type="button" class="nicho2" data-n="' + esc(n) + '" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + esc(n) + "</button>";
    }).join("") + "</div>" +
    '<ul class="cats2 rev" id="cats2">' + itensBusca.map(linhaCat).join("") + "</ul>";
  $("procuroConteudo").querySelector(".nichos2").addEventListener("click", function (e) {
    var b = e.target.closest(".nicho2");
    if (!b) return;
    var n = b.dataset.n, todos = n === pr.nichos[0];
    Array.prototype.forEach.call(this.children, function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    Array.prototype.forEach.call($("cats2").children, function (li) {
      li.hidden = !(todos || li.dataset.n === n);
    });
  });

  /* ---------- 9. PARCERIA ---------- */
  var pa = C.parceria;
  $("parceriaConteudo").innerHTML =
    '<div class="cabecalho centro rev">' + rotulo(pa.eyebrow, "rotulo--centro") + tit(pa.titulo) + "<p>" + esc(pa.texto) + "</p></div>" +
    '<div class="formatos">' + pa.formatos.map(function (f, i) {
      var msg = "Oi, Letícia! Quero saber mais sobre o formato “" + f.nome + "” no projeto.";
      return "<article " + rev(i * .12).replace('class="rev"', 'class="formato rev' + (f.destaque ? " formato--destaque" : "") + '"') + "><small>" + esc(f.numero) + "</small><h3>" + esc(f.nome) +
        "</h3>" + (f.sub ? '<span class="sub">' + esc(f.sub) + "</span>" : "") + (f.texto ? "<p>" + esc(f.texto) + "</p>" : "") + "<ul>" +
        f.entregas.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") +
        '</ul><a class="btn ' + (f.destaque ? "btn--principal" : "btn--contorno") + ' btn--bloco" href="' + esc(zap(msg)) + '" target="_blank" rel="noopener">' + esc(pa.botao) + "</a></article>";
    }).join("") + "</div>";

  /* ---------- 10. DÚVIDAS ---------- */
  var d = C.duvidas;
  $("duvidasConteudo").innerHTML =
    '<div class="cabecalho centro rev">' + rotulo(d.eyebrow, "rotulo--centro") + tit(d.titulo) + "</div>" +
    '<div class="faq rev">' + d.itens.map(function (it, i) {
      return '<div class="faq__item"><h3 style="font-size:inherit;letter-spacing:0"><button class="faq__q" type="button" aria-expanded="false" aria-controls="fr' + i + '" id="fq' + i + '">' +
        esc(it.p) + '<span aria-hidden="true">+</span></button></h3><div class="faq__r" id="fr' + i + '" role="region" aria-labelledby="fq' + i + '"><div><p>' + esc(it.r) + "</p></div></div></div>";
    }).join("") + "</div>";
  var qs = document.querySelectorAll(".faq__q");
  qs.forEach(function (b) {
    b.onclick = function () {
      var abrir = b.getAttribute("aria-expanded") !== "true";
      qs.forEach(function (o) {
        o.setAttribute("aria-expanded", "false");
        o.parentNode.nextElementSibling.classList.remove("aberto");
      });
      if (abrir) {
        b.setAttribute("aria-expanded", "true");
        b.parentNode.nextElementSibling.classList.add("aberto");
      }
    };
  });

  /* ---------- 11. CONTATO ---------- */
  var f = C.final, ct = C.contato;
  $("finalConteudo").innerHTML =
    '<div class="final__miolo rev">' + rotulo(f.eyebrow, "rotulo--centro") + tit(f.titulo) + '<p class="txt">' + esc(f.texto) + "</p>" +
    '<div class="botoes"><a class="btn btn--principal" href="' + esc(zap()) + '" target="_blank" rel="noopener">' + esc(f.botaoZap) + "</a>" +
    '<a class="btn btn--contorno" href="mailto:' + esc(ct.email) + "?subject=" + encodeURIComponent(f.assunto) + '">' + esc(f.botaoEmail) + "</a></div></div>" +
    '<div class="final__rodape"><ul class="canais">' +
      '<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.5-4.8A8.5 8.5 0 1 1 21 11.6z"/></svg><a href="' + esc(zap()) + '" target="_blank" rel="noopener">' + esc(ct.telefone) + "</a></li>" +
      '<li><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.6" y="5" width="18.8" height="14" rx="2.5"/><path d="M3.4 6.8 12 13l8.6-6.2"/></svg><a href="mailto:' + esc(ct.email) + '">' + esc(ct.email) + "</a></li>" +
      '<li><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/></svg><a href="' + esc(ct.instagramUrl) + '" target="_blank" rel="noopener">' + esc(ct.instagram) + "</a></li>" +
    "</ul>" +
    '<p class="assinatura">Letícia Calisto · UGC Creator · SC, Brasil</p></div>';

  /* ---------- animação de entrada ---------- */
  var els = document.querySelectorAll(".rev");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add("visto"); });
  }
})();
