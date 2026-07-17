/* firebase-messaging-sw.js — the ONE service worker for YoteMarket web. It does two
   jobs: background push (chat + order notifications) AND the install shell that makes
   our surfaces installable browser apps (shop, POS, merchant, scout — see
   /manifest-*.webmanifest).

   Why both live here: a scope can only have ONE service worker, and this is already
   registered at the root scope (lib/push.js). A second worker at "/" would REPLACE
   this one and silently kill push. So the PWA logic is added here rather than beside it.

   ── Caching policy: deliberately minimal ────────────────────────────────────────
   This app is money-critical (M-Pesa, the POS till, live orders), so the worker
   caches NOTHING it doesn't have to:

     • Build assets (/assets/*, /icons/*) are NEVER intercepted. They are content-
       hashed and Vercel serves them with revalidation headers, so the browser's own
       HTTP cache already handles them correctly and safely. An earlier version of
       this worker cached them itself (cache-first); a browser that got stuck on a bad
       entry there could stop a stylesheet from ever applying — it did, and unstyled
       the whole staff console. Letting the network / HTTP cache own assets removes
       that entire class of failure.
     • Navigations → network-first, falling back to a tiny offline page only when the
       device is genuinely offline. Never cache-first: that would pin an old app.
     • Everything else (Firestore, callables, Daraja, Storage) → untouched.

   Served at the site root by Vercel's filesystem handler. The Firebase web config is
   not a secret (it ships in every client bundle), so the project's public config is
   inlined here — service workers can't read Vite env. Keep in sync with
   src/lib/firebase.js. */
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

/* ── PWA: install + offline navigation shell ─────────────────────────────────────
   A browser treats a site as installable when a service worker handles `fetch`. We
   handle ONLY navigations (never assets), so a stuck cache can never break the app. */

self.addEventListener('install', () => {
  // Nothing to precache — take over as soon as possible.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Purge EVERY cache this or any previous worker created — including the old
    // ym-assets-v1 / ym-shell-v1 asset caches, which are what broke styling. This is
    // what lets an already-affected browser self-heal on its next load.
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const OFFLINE_HTML =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Offline · YoteMarket</title>' +
  '<body style="font-family:system-ui,sans-serif;padding:48px;text-align:center;color:#1e1b4b">' +
  '<h1 style="margin:0 0 8px">You’re offline</h1><p style="color:#6b7280">Reconnect and try again.</p></body>';

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;          // never touch writes
  if (req.mode !== 'navigate') return;        // assets & APIs: let the browser handle them natively
  // Page loads: always try the network so a deploy lands immediately; show a tiny
  // offline page only when the device genuinely can't reach us.
  event.respondWith(
    fetch(req).catch(() => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
  );
});
