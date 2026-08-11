/* Service worker só pra push notifications — sem cache/offline, de propósito. */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (erro) {
    dados = { title: 'Controle de Produção', body: event.data ? event.data.text() : '' };
  }

  const titulo = dados.title || 'Controle de Produção';
  const opcoes = {
    body: dados.body || '',
    icon: '/logoNF.jpg',
    badge: '/logoNF.jpg',
    data: { url: dados.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rota = (event.notification.data && event.notification.data.url) || '/';
  const urlAlvo = new URL(`#${rota}`, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ('focus' in janela) {
          janela.navigate(urlAlvo);
          return janela.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlAlvo);
      }
    })
  );
});
