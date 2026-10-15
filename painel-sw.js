// Service worker do painel: mostra as notificações no aparelho (no celular
// o navegador só aceita notificação vinda de service worker) e abre o painel
// quando você toca nelas. O "push" já está pronto pra quando houver um envio
// pelo servidor (com o app fechado); hoje os avisos saem do próprio painel.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch (erro) {
    dados = { titulo: "Painel", texto: evento.data ? evento.data.text() : "" };
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || "Painel", {
      body: dados.texto || "",
      icon: "/imagens/icone-painel-180.png",
      tag: dados.chave || undefined,
      data: { url: dados.url || "/painel.html" },
    })
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = (evento.notification.data && evento.notification.data.url) || "/painel.html";
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => j.url.includes("painel.html"));
      if (aberta) return aberta.focus();
      return self.clients.openWindow(url);
    })
  );
});
