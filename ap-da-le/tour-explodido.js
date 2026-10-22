/* Tour do apartamento: a abertura toca em vídeo (tour/montagem.mp4, 3 s). Antes de
   acabar já dá para passar o mouse nos ambientes (na lista ou no desenho 3D), que
   se destacam em verde; clicar abre o ambiente: o prédio encolhe para a esquerda,
   o vídeo do ambiente toca no centro e a barra com a bolinha gira entre as duas
   vistas. Cada item do ambiente tem um marcador oculto no desenho (surge quando o mouse chega perto).
   Textos, vídeos, itens e posições dos marcadores ficam no content.js.
   O mapa de cliques do 3D (tour/hit.js) foi gerado do modelo, então funciona até
   abrindo o arquivo direto do disco.
   Para reposicionar marcadores: abra a página com ?ajustar no endereço, arraste os
   pontos e use "Copiar posições" (cola o trecho "itens" pronto no content.js). */
(function () {
  var C = window.CONTEUDO && window.CONTEUDO.tour;
  var raiz = document.getElementById("tourConteudo");
  if (!C || !raiz) return;

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var P = C.pasta || "tour/";
  var EDITAR = /[?&]ajustar/.test(location.search);

  /* ---------- montagem ---------- */
  raiz.innerHTML =
    '<header class="tx__cab"><p class="rotulo">' + esc(C.rotulo) + "</p>" +
    '<h2 class="dep__titulo tx__titulo"><span class="dep__impacto">' + esc(C.titulo.impacto) + '</span><span class="dep__cursiva">' + esc(C.titulo.cursiva) + "</span></h2></header>" +
    '<div class="tx' + (EDITAR ? " tx--ajustar" : "") + '" id="tx">' +
      '<aside class="tx__mat" id="txMat" aria-label="Materiais"><p class="tx__rot">Materiais</p><ul>' +
        C.materiais.map(function (m) {
          return '<li><i style="background:' + esc(m.cor) + (m.textura ? " url(" + esc(m.textura) + ") center/cover" : "") + '"></i><span><b>' + esc(m.nome) + "</b>" + (m.marca ? "<small>" + esc(m.marca) + "</small>" : "") + "</span></li>";
        }).join("") + "</ul></aside>" +
      '<div class="tx__palco" id="txPalco">' +
        '<video class="tx__video" id="txVideo" src="' + P + 'montagem.mp4" muted playsinline preload="auto" aria-label="Montagem do apartamento"></video>' +
        C.ambientes.map(function (a) { return '<img class="tx__dest" src="' + P + "dest-" + esc(a.id) + '.webp" alt="" draggable="false" data-amb="' + esc(a.id) + '">'; }).join("") +
      "</div>" +
      '<nav class="tx__amb" id="txAmb" aria-label="Ambientes"><p class="tx__rot">Ambientes</p><ul>' +
        C.ambientes.map(function (a, i) {
          return '<li><button type="button" class="tx__item" data-amb="' + esc(a.id) + '"><small>' + (i < 9 ? "0" : "") + (i + 1) + "</small><span>" + esc(a.nome) + "</span></button></li>";
        }).join("") + "</ul></nav>" +
      '<section class="tx__sala" id="txSala" aria-label="Ambiente" aria-live="polite"></section>' +
      '<aside class="tx__itens" id="txItens" aria-label="Itens do ambiente"></aside>' +
    "</div>" +
    '<div class="tx__rodape"><p class="tx__dica" id="txDica">Passe o mouse nos ambientes</p></div>';

  var el = function (id) { return document.getElementById(id); };
  var tx = el("tx"), palco = el("txPalco"), vid = el("txVideo"), amb = el("txAmb");
  var dica = el("txDica");
  var dests = {};
  Array.prototype.forEach.call(palco.querySelectorAll(".tx__dest"), function (d) { dests[d.dataset.amb] = d; });

  var ease = function (t) { return t < 0 ? 0 : t > 1 ? 1 : t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var tween = function (de, para, dur, fn, fim) {
    var t0 = null;
    var passo = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      fn(de + (para - de) * ease(p));
      if (p < 1) requestAnimationFrame(passo); else if (fim) fim();
    };
    requestAnimationFrame(passo);
  };
  var paraOFim = function (v) { try { if (v.duration) v.currentTime = Math.max(0, v.duration - 0.04); } catch (e) {} };

  /* ---------- a abertura (3 s) ---------- */
  var LIBERA_EM = 0.9;                  // segundos: daí em diante já dá para passar o mouse e clicar
  var rodando = false, jaFoi = false, sala = null, ativo = null;
  function libera() {
    if (tx.classList.contains("pronto")) return;
    rodando = false; tx.classList.add("ui", "pronto");
  }
  vid.addEventListener("timeupdate", function () { if (rodando && vid.currentTime > LIBERA_EM) libera(); });
  vid.addEventListener("ended", libera);
  vid.addEventListener("error", libera);
  vid.addEventListener("loadedmetadata", function () { if (!jaFoi) vid.currentTime = 0.01; });

  function toca() {
    rodando = true;
    vid.currentTime = 0;
    var p = vid.play();
    if (p && p.catch) p.catch(function () { paraOFim(vid); libera(); });   // sem autoplay: mostra o prédio pronto
  }
  var reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduz || !("IntersectionObserver" in window)) {
    jaFoi = true;
    var mostra = function () { paraOFim(vid); libera(); };
    if (vid.readyState >= 1) mostra(); else vid.addEventListener("loadedmetadata", mostra, { once: true });
  } else {
    new IntersectionObserver(function (es, ob) {
      if (es[0].isIntersecting && !jaFoi) { jaFoi = true; ob.disconnect(); setTimeout(toca, 250); }
    }, { threshold: 0.45 }).observe(palco);
  }

  /* ---------- destaque (mouse na lista ou no desenho) ---------- */
  var dadosAmb = function (id) { return C.ambientes.filter(function (a) { return a.id === id; })[0]; };
  function destaca(id) {
    if (id === ativo) return;
    ativo = id;
    Object.keys(dests).forEach(function (k) { dests[k].classList.toggle("on", k === id); });
    Array.prototype.forEach.call(amb.querySelectorAll(".tx__item"), function (b) { b.classList.toggle("on", b.dataset.amb === id); });
    dica.textContent = id ? dadosAmb(id).nome : "Passe o mouse nos ambientes";
  }
  function limpaDestaque() { destaca(sala); }      // dentro de um ambiente, o destaque volta para ele

  Array.prototype.forEach.call(amb.querySelectorAll(".tx__item"), function (b) {
    b.addEventListener("mouseenter", function () { if (tx.classList.contains("pronto")) destaca(b.dataset.amb); });
    b.addEventListener("focus", function () { if (tx.classList.contains("pronto")) destaca(b.dataset.amb); });
    b.addEventListener("mouseleave", limpaDestaque);
    b.addEventListener("blur", limpaDestaque);
    b.addEventListener("click", function () { abreSala(b.dataset.amb); });
  });

  /* mapa de cliques do 3D: lê a posição do mouse no quadro final da montagem */
  var HIT = window.TOUR_HIT, mapa = null;
  if (HIT && HIT.rle) {
    mapa = new Uint8Array(HIT.w * HIT.h);
    for (var i = 0, k = 0; i < HIT.rle.length; i += 2) { mapa.fill(HIT.rle[i], k, k + HIT.rle[i + 1]); k += HIT.rle[i + 1]; }
  }
  function ambienteEm(cx, cy) {
    if (!mapa) return null;
    var r = vid.getBoundingClientRect();       // acompanha a escala quando o prédio encolhe
    var u = (cx - r.left) / r.width, v = (cy - r.top) / r.height;
    if (u < 0 || v < 0 || u >= 1 || v >= 1) return null;
    var n = mapa[Math.floor(v * HIT.h) * HIT.w + Math.floor(u * HIT.w)];
    return n ? HIT.ids[n - 1] : null;
  }
  palco.addEventListener("mousemove", function (e) {
    if (!tx.classList.contains("pronto")) return;
    var id = ambienteEm(e.clientX, e.clientY);
    destaca(id || sala);
    palco.style.cursor = id ? "pointer" : "default";
  });
  palco.addEventListener("mouseleave", limpaDestaque);
  palco.addEventListener("click", function (e) {
    if (!tx.classList.contains("pronto")) return;
    var id = ambienteEm(e.clientX, e.clientY);
    if (id && id !== sala) abreSala(id);
  });

  /* ---------- dentro de um ambiente ---------- */
  var elSala = el("txSala"), elItens = el("txItens"), videosSala = [];
  var tituloItem = function (it) { return it.titulo || ""; };
  var zapItem = function (it, a) {   // botão "Quero patrocinar esse item": abre o WhatsApp com a mensagem pronta
    var ct = window.CONTEUDO.contato;
    return "https://wa.me/" + ct.whatsapp + "?text=" + encodeURIComponent("Oi, Letícia! Vi o tour 3D do AP da Lê e quero patrocinar o item “" + tituloItem(it) + "” (" + a.nome + "). Podemos conversar?");
  };

  function abreSala(id) {
    if (!tx.classList.contains("pronto") || rodando) return;
    var a = dadosAmb(id); if (!a) return;
    if (typeof C.aoClicar === "function") C.aoClicar(id);
    var troca = !!sala;
    sala = id; destaca(id);
    var v = (a.views || []).slice(0, 2), dois = v.length > 1 && !!a.giro;
    var itens = a.itens || [];

    var pontos = "";
    for (var vi = 0; vi < (dois ? 2 : 1); vi++) {
      pontos += '<div class="sala__pontos" data-vista="' + vi + '">';
      itens.forEach(function (it, i) {
        ((it.pontos && it.pontos[vi]) || []).forEach(function (p, kk) {
          pontos += '<button type="button" class="sala__ponto" data-i="' + i + '" data-k="' + kk + '" data-t="' + esc(tituloItem(it)) + '" aria-label="' + esc(tituloItem(it)) + '" style="left:' + p[0] + "%;top:" + p[1] + '%"><i></i></button>';
        });
      });
      pontos += "</div>";
    }
    elSala.innerHTML =
      '<div class="sala__palco" id="salaPalco"><div class="sala__cena" id="salaCena"><div class="sala__quadro" id="salaQuadro">' +
        '<video class="sala__video" src="' + P + esc(v[0].video) + '" muted playsinline preload="auto" aria-label="' + esc(v[0].nome || a.nome) + '"></video>' +
        (dois ? '<video class="sala__video sala__giro" src="' + P + esc(a.giro) + '" muted playsinline preload="auto" aria-hidden="true"></video>' : "") +
        pontos +
      "</div></div></div>" +
      (dois ?
        '<div class="sala__ctl">' +
          '<button type="button" class="sala__lado" data-v="0" aria-pressed="true">' + esc(v[0].nome) + "</button>" +
          '<div class="sala__trilho" id="salaTrilho" role="slider" tabindex="0" aria-label="Girar o ambiente" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="' + esc(v[0].nome) + '"><b class="sala__bola"></b></div>' +
          '<button type="button" class="sala__lado" data-v="1" aria-pressed="false">' + esc(v[1].nome) + "</button>" +
        "</div>" : "") +
      (EDITAR ? '<button type="button" class="sala__copiar" id="salaCopiar">Copiar posições</button>' : "");
    elItens.innerHTML =
      '<div class="itens__topo"><button type="button" class="itens__voltar" id="salaVoltar">← Todos os ambientes</button>' +
      '<h3 class="itens__nome">' + esc(a.nome) + '</h3><p class="itens__conta">' + itens.length + " itens neste ambiente</p></div>" +
      '<div class="itens__rolagem" id="itensRolagem" data-topo="1"><ol class="itens__lista">' +
      itens.map(function (it, i) {
        return '<li data-i="' + i + '" tabindex="0" role="button"><small>' + (i < 9 ? "0" : "") + (i + 1) + '</small><div class="itens__txt"><b>' + esc(tituloItem(it)) + "</b>" +
          '<a class="itens__cta" href="' + esc(zapItem(it, a)) + '" target="_blank" rel="noopener">Quero patrocinar esse item</a></div></li>';
      }).join("") + "</ol></div>";
    tx.classList.add("sala"); tx.classList.toggle("sala--troca", troca);
    // em telas baixas, rola um pouco para a barra da bolinha ficar à vista
    setTimeout(function () {
      var r = elSala.getBoundingClientRect(), falta = r.bottom + 16 - window.innerHeight;
      if (falta > 0 && r.top > 90) window.scrollBy({ top: Math.min(falta, r.top - 90), behavior: "smooth" });
    }, 350);
    videosSala = Array.prototype.slice.call(elSala.querySelectorAll("video"));
    var api = ligaSala(dois);
    ligaPontos(a, dois, api);
    // a montagem do ambiente começa logo depois do prédio ir para a esquerda
    var meu = id;
    setTimeout(function () { if (sala === meu) tocaCena(0); }, troca ? 60 : 650);
  }

  function tocaCena(i) {
    var x = videosSala[i]; if (!x) return;
    try { x.currentTime = 0; } catch (e) {}
    var p = x.play();
    if (p && p.catch) p.catch(function () { paraOFim(x); el("salaCena") && el("salaCena").classList.add("fim"); });
  }

  /* O giro é um vídeo do ambiente pronto, renderizado em vários ângulos entre as duas
     vistas (cada quadro é um ângulo; 30 quadros/s). A bolinha só escolhe o quadro. */
  var FPS_GIRO = 30;
  function ligaSala(dois) {
    var cena = el("salaCena");
    var rol = el("itensRolagem");
    var marca = function () {
      rol.dataset.topo = rol.scrollTop <= 2 ? "1" : "0";
      rol.dataset.fim = rol.scrollTop + rol.clientHeight >= rol.scrollHeight - 2 ? "1" : "0";
    };
    rol.addEventListener("scroll", marca, { passive: true }); marca();
    el("salaVoltar").onclick = fechaSala;

    var montagem = videosSala[0], giro = videosSala[1];
    var mostraFim = function () { cena.classList.add("fim"); };      // marcadores só depois da montagem do ambiente
    montagem.addEventListener("ended", mostraFim); montagem.addEventListener("error", mostraFim);
    var api = { vista: 0, vaPara: function () {} };
    var vistaDe = function (t) { return t <= 0.03 ? 0 : t >= 0.97 ? 1 : -1; };   // -1: girando, sem marcadores
    var mostraVista = function (n) {
      api.vista = n;
      Array.prototype.forEach.call(elSala.querySelectorAll(".sala__pontos"), function (g) { g.classList.toggle("on", +g.dataset.vista === n); });
    };
    mostraVista(0);
    if (!dois) return api;

    var palcoSala = el("salaPalco"), trilho = el("salaTrilho"), bola = trilho.querySelector(".sala__bola");
    var lados = Array.prototype.slice.call(elSala.querySelectorAll(".sala__lado"));
    var nomes = lados.map(function (b) { return b.textContent; });
    var t = 0, arrasto = null, pendente = null, emUso = false, n = 0;

    var quadros = function () { n = Math.max(2, Math.round(giro.duration * FPS_GIRO)); };
    if (giro.readyState >= 1) quadros(); else giro.addEventListener("loadedmetadata", quadros, { once: true });
    giro.addEventListener("seeked", function () {
      if (pendente !== null) { var p = pendente; pendente = null; giro.currentTime = p; }
      else if (emUso) giro.classList.add("on");       // só aparece depois do 1º quadro do giro estar pronto
    });
    var vaiParaQuadro = function (u) {
      if (!n) return;
      var alvo = (Math.round(u * (n - 1)) + 0.5) / FPS_GIRO;       // meio do quadro
      if (giro.seeking) pendente = alvo; else giro.currentTime = alvo;
    };
    var aplica = function (u) {
      t = Math.max(0, Math.min(1, u));
      if (!emUso) { emUso = true; montagem.pause(); cena.classList.add("fim"); }   // o giro parte do ambiente já pronto
      vaiParaQuadro(t);
      bola.style.left = (t * 100).toFixed(2) + "%";
      trilho.setAttribute("aria-valuenow", String(Math.round(t * 100)));
      var b = t > .5 ? 1 : 0;
      trilho.setAttribute("aria-valuetext", nomes[b]);
      lados.forEach(function (x, i) { x.setAttribute("aria-pressed", String(i === b)); });
      mostraVista(vistaDe(t));
    };
    var vaPara = function (alvo) { tween(t, alvo, 900, aplica); };
    api.vaPara = vaPara;

    /* arrastar a bolinha ou o próprio ambiente */
    var daPosicao = function (e) {
      var r = trilho.getBoundingClientRect();
      aplica((e.clientX - r.left) / r.width);
    };
    var solta = function (alvo) { if (arrasto) { arrasto = null; alvo.classList.remove("arrastando"); } };
    trilho.addEventListener("pointerdown", function (e) {
      arrasto = { trilho: true }; trilho.setPointerCapture(e.pointerId); trilho.classList.add("arrastando"); daPosicao(e); e.preventDefault();
    });
    trilho.addEventListener("pointermove", function (e) { if (arrasto && arrasto.trilho) daPosicao(e); });
    trilho.addEventListener("pointerup", function () { solta(trilho); });
    trilho.addEventListener("pointercancel", function () { solta(trilho); });
    trilho.addEventListener("keydown", function (e) {
      var k = e.key;
      if (k === "ArrowLeft" || k === "ArrowDown") { aplica(t - 0.05); e.preventDefault(); }
      else if (k === "ArrowRight" || k === "ArrowUp") { aplica(t + 0.05); e.preventDefault(); }
      else if (k === "Home") { vaPara(0); e.preventDefault(); }
      else if (k === "End") { vaPara(1); e.preventDefault(); }
    });
    lados.forEach(function (b) { b.addEventListener("click", function () { vaPara(+b.dataset.v); }); });

    palcoSala.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".sala__ponto")) return;             // clicar num marcador não arrasta
      arrasto = { x: e.clientX, t0: t }; palcoSala.setPointerCapture(e.pointerId); palcoSala.classList.add("arrastando");
    });
    palcoSala.addEventListener("pointermove", function (e) {
      if (arrasto && !arrasto.trilho) aplica(arrasto.t0 - (e.clientX - arrasto.x) / (palcoSala.clientWidth * 0.7));
    });
    palcoSala.addEventListener("pointerup", function () { solta(palcoSala); });
    palcoSala.addEventListener("pointercancel", function () { solta(palcoSala); });
    return api;
  }

  /* ---------- marcadores dos itens ----------
     Ficam ocultos. Quando o mouse chega perto de um item, o marcador dele surge
     (pulsando de leve) e o item da lista acende. Clicar fixa a seleção. */
  function ligaPontos(a, dois, api) {
    var itens = a.itens || [];
    var RAIO = 28, RAIO_TOQUE = 40;                 // px na tela
    var hovL = null, perto = null, sel = null;
    var palcoSala = el("salaPalco");
    var todos = function () { return Array.prototype.slice.call(elSala.querySelectorAll(".sala__pontos.on .sala__ponto")); };
    var pinta = function () {
      Array.prototype.forEach.call(elSala.querySelectorAll(".sala__ponto"), function (b) {
        var i = +b.dataset.i;
        b.classList.toggle("near", b === perto); b.classList.toggle("hov", i === hovL); b.classList.toggle("sel", i === sel);
      });
      Array.prototype.forEach.call(elItens.querySelectorAll(".itens__lista li"), function (li) {
        var i = +li.dataset.i;
        li.classList.toggle("hov", i === hovL || (!!perto && +perto.dataset.i === i)); li.classList.toggle("sel", i === sel);
      });
    };
    var maisPerto = function (cx, cy, raio) {
      var melhor = null, d2 = raio * raio;
      todos().forEach(function (b) {
        var r = b.getBoundingClientRect(), dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2), d = dx * dx + dy * dy;
        if (d < d2) { d2 = d; melhor = b; }
      });
      return melhor;
    };
    var temNaVista = function (i, vi) { return !!(itens[i] && itens[i].pontos && itens[i].pontos[vi] && itens[i].pontos[vi].length); };
    var escolhe = function (i, daLista) {
      sel = sel === i ? null : i; pinta();
      if (sel === null) return;
      var li = elItens.querySelector('.itens__lista li[data-i="' + i + '"]');
      if (li) setTimeout(function () { li.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 40);   // já com o botão aberto
      // item que só aparece na outra vista: gira até lá
      if (dois && api.vista !== -1 && !temNaVista(i, api.vista) && temNaVista(i, 1 - api.vista)) api.vaPara(1 - api.vista);
    };

    if (!EDITAR) {
      var down = null;
      palcoSala.addEventListener("pointermove", function (e) {
        if (e.buttons || e.pointerType === "touch") { if (perto) { perto = null; pinta(); } return; }
        var n = maisPerto(e.clientX, e.clientY, RAIO);
        if (n !== perto) { perto = n; pinta(); }
        palcoSala.style.cursor = n ? "pointer" : "";
      });
      palcoSala.addEventListener("pointerleave", function () { if (perto) { perto = null; pinta(); } palcoSala.style.cursor = ""; });
      palcoSala.addEventListener("pointerdown", function (e) { down = { x: e.clientX, y: e.clientY }; });
      palcoSala.addEventListener("pointerup", function (e) {
        if (!down) return;
        var moveu = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 8; down = null;
        if (moveu) return;
        var n = maisPerto(e.clientX, e.clientY, e.pointerType === "touch" ? RAIO_TOQUE : RAIO);
        if (n) { perto = e.pointerType === "touch" ? null : n; escolhe(+n.dataset.i, false); }
      });
    }
    var lista = elItens.querySelector(".itens__lista");
    lista.addEventListener("mouseover", function (e) { var li = e.target.closest("li"); if (li) { hovL = +li.dataset.i; pinta(); } });
    lista.addEventListener("mouseout", function (e) { if (e.target.closest("li")) { hovL = null; pinta(); } });
    lista.addEventListener("click", function (e) {
      if (e.target.closest(".itens__cta")) return;           // o botão só abre o WhatsApp, não mexe na seleção
      var li = e.target.closest("li"); if (li) escolhe(+li.dataset.i, true);
    });
    lista.addEventListener("keydown", function (e) {
      var li = e.target.closest("li");
      if (li && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); escolhe(+li.dataset.i, true); }
    });

    if (!EDITAR) return;
    /* modo de ajuste: arrastar os marcadores e copiar as posições */
    var quadro = el("salaQuadro"), movendo = null;
    elSala.addEventListener("pointerdown", function (e) {
      var b = e.target.closest(".sala__ponto"); if (!b) return;
      e.stopPropagation(); e.preventDefault();
      movendo = b; b.setPointerCapture(e.pointerId);
    }, true);
    elSala.addEventListener("pointermove", function (e) {
      if (!movendo) return;
      var r = quadro.getBoundingClientRect();
      var x = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)), y = Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100));
      movendo.style.left = x.toFixed(1) + "%"; movendo.style.top = y.toFixed(1) + "%";
      var vi = +movendo.parentNode.dataset.vista;
      itens[+movendo.dataset.i].pontos[vi][+movendo.dataset.k] = [+x.toFixed(1), +y.toFixed(1)];
    });
    var fim = function () { movendo = null; };
    elSala.addEventListener("pointerup", fim); elSala.addEventListener("pointercancel", fim);
    el("salaCopiar").onclick = function () {
      var txt = "itens: [\n" + itens.map(function (it) {
        return '        { titulo: "' + it.titulo + '", pontos: ' + JSON.stringify(it.pontos).replace(/,/g, ", ").replace(/\], \[\[/g, "], [[") + " }";
      }).join(",\n") + "\n      ]";
      console.log(txt);
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { el("salaCopiar").textContent = "Copiado!"; setTimeout(function () { el("salaCopiar").textContent = "Copiar posições"; }, 1500); });
    };
  }

  function fechaSala() {
    if (!sala) return;
    sala = null;
    tx.classList.remove("sala", "sala--troca"); destaca(null);
    videosSala.forEach(function (x) { x.pause(); });
    setTimeout(function () { if (!sala) { elSala.innerHTML = ""; elItens.innerHTML = ""; videosSala = []; } }, 700);
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sala) fechaSala(); });
})();
