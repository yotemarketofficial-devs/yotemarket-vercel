/* monitoring.js — production error reporting (Sentry).
 *
 * Why this exists: until now nothing watched the browser. Every crash reached us
 * only because a person typed "the screen is blank" — the merchant Insight
 * white-screen, the chat you couldn't type in. Cloud Functions at least log to
 * Cloud Logging; the browser logged to nobody.
 *
 * Two deliberate choices:
 *  1. DSN-gated. No VITE_SENTRY_DSN → this is inert and the app is untouched, so
 *     dev and demo builds never phone home. Set the DSN in Vercel for prod.
 *  2. Lazily imported. Sentry never lands in the entry chunk and never blocks
 *     first paint — the bundle is already heavy (see the platform audit).
 */

let sentry = null;          // the loaded SDK, once ready
let pending = null;         // in-flight import, so we only load it once
let queuedUser = null;      // setUser called before the SDK finished loading

/** Start reporting. Safe to call always; no-ops without a DSN. */
export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || pending) return pending || Promise.resolve();
  pending = import('@sentry/react')
    .then((S) => {
      S.init({
        dsn,
        environment: import.meta.env.MODE,
        // Traces are sampled low: this is an error tool first, and Kenyan mobile
        // data is not ours to spend.
        tracesSampleRate: 0.05,
        // Noise we can't act on: browser extensions and cancelled navigations.
        ignoreErrors: ['ResizeObserver loop', 'Non-Error promise rejection captured'],
      });
      sentry = S;
      if (queuedUser) { S.setUser(queuedUser); queuedUser = null; }
      return S;
    })
    .catch(() => { pending = null; }); // reporting must never break the app
  return pending;
}

/**
 * Report a caught error. Always logs to the console too, so local debugging is
 * unchanged whether or not a DSN is configured.
 * @param {unknown} error the thrown value
 * @param {object} [context] extra key/values to attach
 */
export function reportError(error, context) {
  console.error('[YoteMarket]', error, context || '');
  if (sentry) sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Tag reports with who hit them — "which merchant saw this" is usually the first
 * question. Only the uid: no email, no phone.
 * @param {{uid?: string}|null} user signed-in user, or null on sign-out
 */
export function setMonitoringUser(user) {
  const u = user && user.uid ? { id: user.uid } : null;
  if (sentry) sentry.setUser(u);
  else queuedUser = u;
}
