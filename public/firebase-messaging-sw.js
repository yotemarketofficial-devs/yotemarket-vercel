/* firebase-messaging-sw.js — background push for YoteMarket web (chat + order
   notifications). Served at the site root by Vercel's filesystem handler. The
   Firebase web config is not a secret (it ships in every client bundle), so the
   project's public config is inlined here — service workers can't read Vite env.
   Keep these values in sync with src/lib/firebase.js. */
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDXt0Rpw_Cll8RQ_BO0riSKb8q7oZWvgYY',
  authDomain: 'yotemarket-app.firebaseapp.com',
  projectId: 'yotemarket-app',
  storageBucket: 'yotemarket-app.firebasestorage.app',
  messagingSenderId: '494092523203',
  appId: '1:494092523203:web:6543ab44b7b1afceb77476',
});

const messaging = firebase.messaging();

// Show the notification ourselves so the icon/click target are consistent.
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const data = payload.data || {};
  const title = n.title || 'YoteMarket';
  self.registration.showNotification(title, {
    body: n.body || '',
    icon: '/assets/logo.png',
    badge: '/assets/logo.png',
    tag: data.convId || 'ym-message',
    data,
  });
});

// Focus an open tab (or open one) when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow('/storefront');
    }),
  );
});
