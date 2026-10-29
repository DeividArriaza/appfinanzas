// Manejo de notificaciones push dentro del service worker de la PWA.
// Workbox lo incorpora con importScripts (ver vite.config.ts).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const titulo = data.title || 'Cuencla';
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: data.body || '¿Ya registraste tus gastos de hoy?',
      icon: '/icon-192.png',
      // Android pinta el badge como silueta: debe ser blanco sobre transparente.
      badge: '/badge-96.png',
      tag: 'recordatorio-diario',
      data: { url: data.url || '/' },
    }),
  );
});

// Al tocar la notificacion: enfocar la app si ya esta abierta, o abrirla.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
