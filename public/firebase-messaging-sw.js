/* firebase-messaging-sw.js — the ONE service worker for YoteMarket web. It does two
   jobs: background push (chat + order notifications) AND the install/offline shell
   that makes our four surfaces installable browser apps (shop, POS, merchant,
   scout — see /manifest-*.webmanifest).

   Why both live here: a scope can only have ONE service worker, and this is already
   registered at the root scope (lib/push.js). A second worker at "/" would REPLACE
   this one and silently kill push. So the PWA logic is added here rather than beside it.

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

/* ── PWA: install + offline shell ───────────────────────────────────────────────
   A browser only treats a site as installable if a service worker handles `fetch`.

   Strategy is deliberately conservative — this app is money-critical (M-Pesa, the
   POS till, live orders), so NOTHING dynamic is cached:
     • Vite build assets (/assets/*, content-hashed) → cache-first. Safe: a new build
       emits new filenames, so a stale file can never be served for new code.
     • Navigations → network-first, falling back to the cached app shell only when
       genuinely offline. Never cache-first: that would pin an old index.html and
       keep shipping yesterday's app.
     • Everything else (Firestore, callables, Daraja, Storage) → untouched. Caching
       an API response could show a stale balance or a paid order as unpaid.
   Cross-origin, non-GET and Range requests are skipped entirely.                */
const SHELL_CACHE = 'ym-shell-v1';
const ASSET_CACHE = 'ym-assets-v1';
const OFFLINE_URLS = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(OFFLINE_URLS))
      .catch(() => {}) // a failed precache must never block activation
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;        // never touch Firebase/Daraja/etc
  if (req.headers.has('range')) return;                    // video seeking (YoteFeed)

  // Hashed build output — immutable, so cache-first is safe and fast.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(ASSET_CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      })),
    );
    return;
  }

  // Page loads: always try the network so a deploy lands immediately; fall back to
  // the shell only when the device is actually offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/').then((hit) => hit || new Response(
        '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;padding:40px;text-align:center"><h1>You\'re offline</h1><p>Reconnect and try again.</p></body>',
        { headers: { 'Content-Type': 'text/html' } },
      ))),
    );
  }
});
