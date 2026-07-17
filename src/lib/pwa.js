/* pwa.js — the four installable browser apps.
 *
 * Each surface is a separate PWA: its own manifest, scope, name and theme, so a
 * merchant can install the dashboard, a cashier the till, and a shopper the mall —
 * as distinct icons that open at the right place. Order matters below: /marketers/app
 * must be tested before /marketers so the scout app doesn't match the landing.
 */

const APPS = [
  { prefix: '/pos', manifest: '/manifest-pos.webmanifest', theme: '#4338CA' },
  { prefix: '/dashboard', manifest: '/manifest-merchant.webmanifest', theme: '#5B16A8' },
  { prefix: '/marketers/app', manifest: '/manifest-marketer.webmanifest', theme: '#E89B0C' },
  { prefix: '/storefront', manifest: '/manifest-shop.webmanifest', theme: '#7C2BD4' },
];
const DEFAULT_THEME = '#7C2BD4'; // marketing chrome

/** The app a path belongs to, or null for the marketing site / staff / hub. */
export function appFor(pathname) {
  const p = String(pathname || '');
  return APPS.find((a) => p === a.prefix || p.startsWith(a.prefix + '/')) || null;
}

/** Point <link rel="manifest"> at this route's app (or remove it off-app). */
export function applyAppManifest(pathname) {
  if (typeof document === 'undefined') return;
  const app = appFor(pathname);
  let link = document.querySelector('link[rel="manifest"]');

  if (app) {
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== app.manifest) link.setAttribute('href', app.manifest);
  } else if (link) {
    // Off-app (marketing/staff/hub) → no install offer.
    link.remove();
  }

  // Standalone windows paint their title bar from this.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', app ? app.theme : DEFAULT_THEME);
}

/**
 * Ensure the service worker exists. A browser won't offer "install" without one
 * handling fetch. NOTE: this is the SAME worker lib/push.js uses — a scope can hold
 * only one worker, so registering a second at "/" would replace it and kill push.
 * register() is idempotent, so calling it here just means the worker is up on load
 * rather than only after someone grants notification permission.
 */
export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const go = () => { navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {}); };
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}
