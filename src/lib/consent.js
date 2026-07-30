/* consent.js — cookie consent + device persistence for YoteMarket.
 *
 * Essential storage (the Firebase auth session + the cart, both already in localStorage)
 * is always on — it's what keeps a user signed in and their cart intact. NON-essential
 * cookies (analytics / retargeting) wait for explicit consent, per Kenya's Data Protection
 * Act 2019 (which our Terms + Privacy pages reference).
 *
 * The consent choice is itself a first-party cookie, so it persists on the user's phone
 * across sessions. On "Accept all" we also mint a stable device id used for analytics /
 * retargeting; choosing "Essentials only" (or later withdrawing) deletes it.
 */

const CONSENT_COOKIE = 'ym_consent'; // 'all' | 'essential'
const DEVICE_COOKIE = 'ym_did';      // stable device id — only exists after 'all'
const ONE_YEAR = 365 * 24 * 60 * 60;

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name, value, maxAge = ONE_YEAR) {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}
function deleteCookie(name) {
  document.cookie = `${name}=; Max-Age=0; Path=/`;
}

function newId() {
  try { return crypto.randomUUID(); } catch { /* older browsers */ }
  return 'did-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** The stored choice, or null until the user has chosen. */
export function getConsent() { return readCookie(CONSENT_COOKIE); }
export function hasChosenConsent() { return getConsent() != null; }
/** Non-essential (analytics / retargeting) cookies are only allowed after "Accept all". */
export function analyticsAllowed() { return getConsent() === 'all'; }
/** The persistent device id for analytics/retargeting (null unless the user accepted all). */
export function deviceId() { return readCookie(DEVICE_COOKIE); }

/** Record the user's choice; mint (or clear) the retargeting device id accordingly. */
export function setConsent(level) {
  const lvl = level === 'all' ? 'all' : 'essential';
  writeCookie(CONSENT_COOKIE, lvl);
  if (lvl === 'all') {
    if (!readCookie(DEVICE_COOKIE)) writeCookie(DEVICE_COOKIE, newId());
  } else {
    deleteCookie(DEVICE_COOKIE); // withdraw non-essential cookies
  }
  try { window.dispatchEvent(new Event('ym-consent-change')); } catch { /* noop */ }
  return lvl;
}
