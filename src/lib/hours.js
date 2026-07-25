// hours.js — store opening hours: the shape merchants edit, and the one question
// shoppers actually ask ("are they open right now?").
//
// Times are plain "HH:MM" 24h strings and are read against the DEVICE clock: Kenya is
// a single timezone with no DST, so a shopper's clock is the store's clock. Storing a
// UTC instant would be wrong here — 09:00 means 09:00 at the shop, every day.
//
// Shape on stores/{id}.hours (mirrored by the server in updateStoreProfile):
//   { mon:{closed:false, open:'09:00', close:'18:00'}, …, sun:{closed:true} }

export const DAYS = [
  { k: 'mon', label: 'Monday', short: 'Mon' },
  { k: 'tue', label: 'Tuesday', short: 'Tue' },
  { k: 'wed', label: 'Wednesday', short: 'Wed' },
  { k: 'thu', label: 'Thursday', short: 'Thu' },
  { k: 'fri', label: 'Friday', short: 'Fri' },
  { k: 'sat', label: 'Saturday', short: 'Sat' },
  { k: 'sun', label: 'Sunday', short: 'Sun' },
];

// Date.getDay() is 0=Sunday..6=Saturday — our keys start on Monday.
const KEY_BY_JS_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SHORT_BY_KEY = Object.fromEntries(DAYS.map((d) => [d.k, d.short]));

export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "09:30" → 570 minutes past midnight; null when it isn't a valid time. */
export function minutesOf(hhmm) {
  if (!HHMM.test(String(hhmm || ''))) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}

/** What the editor starts from when a store has never set hours: ordinary Kenyan
 *  retail week. Nothing is published until the merchant saves. */
export const defaultHours = () => Object.fromEntries(DAYS.map((d) => [
  d.k, d.k === 'sun' ? { closed: true } : { closed: false, open: '09:00', close: '18:00' },
]));

/** Coerce anything stored/sent into the exact 7-day shape. null when there's nothing
 *  usable (so callers can tell "no hours set" from "closed all week"). */
export function normalizeHours(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  let any = false;
  for (const d of DAYS) {
    const v = raw[d.k] || {};
    const open = HHMM.test(String(v.open || '')) ? String(v.open) : null;
    const close = HHMM.test(String(v.close || '')) ? String(v.close) : null;
    if (v.closed === true || !open || !close) { out[d.k] = { closed: true }; continue; }
    out[d.k] = { closed: false, open, close };
    any = true;
  }
  return any ? out : null;
}

/** True when at least one day is open — i.e. worth showing to a shopper. */
export const hasHours = (h) => Boolean(normalizeHours(h));

/** The window for one day: "09:00 – 18:00", or "Closed". */
export function dayWindow(hours, key) {
  const h = normalizeHours(hours);
  const d = h && h[key];
  return d && !d.closed ? `${d.open} – ${d.close}` : 'Closed';
}

/** Today's window as a shopper-facing caption. */
export const todayWindow = (hours, now = new Date()) => dayWindow(hours, KEY_BY_JS_DAY[now.getDay()]);

// A day whose close is at or before its open runs past midnight (20:00 → 02:00).
const spansMidnight = (d) => minutesOf(d.close) <= minutesOf(d.open);

/**
 * Is the store open right now, and what does a shopper need to know next?
 * -> null when no hours are set, else
 *    { open, label, closesAt?, opensAt?, opensDay? }
 * Handles windows that run past midnight (a late-night eatery is still "open" at 01:00
 * on the strength of yesterday's row).
 */
export function storeOpenState(hours, now = new Date()) {
  const h = normalizeHours(hours);
  if (!h) return null;
  const jsDay = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const today = h[KEY_BY_JS_DAY[jsDay]];
  if (!today.closed) {
    const o = minutesOf(today.open); const c = minutesOf(today.close);
    if (spansMidnight(today) ? nowMin >= o : nowMin >= o && nowMin < c) {
      return { open: true, closesAt: today.close, label: `Open now · closes ${today.close}` };
    }
  }
  // Still inside yesterday's overnight window?
  const yday = h[KEY_BY_JS_DAY[(jsDay + 6) % 7]];
  if (!yday.closed && spansMidnight(yday) && nowMin < minutesOf(yday.close)) {
    return { open: true, closesAt: yday.close, label: `Open now · closes ${yday.close}` };
  }

  // Closed: point at the next opening. i runs to 7 so a store whose only open day is
  // today (already shut) still gets "opens Sat 09:00" for next week, not a bare "Closed".
  for (let i = 0; i <= 7; i++) {
    const key = KEY_BY_JS_DAY[(jsDay + i) % 7];
    const d = h[key];
    if (d.closed) continue;
    if (i === 0 && minutesOf(d.open) <= nowMin) continue; // today's opening already passed
    const when = i === 0 ? '' : i === 1 ? ' tomorrow' : ` ${SHORT_BY_KEY[key]}`;
    return { open: false, opensAt: d.open, opensDay: key, label: `Closed · opens ${d.open}${when}` };
  }
  return { open: false, label: 'Closed' };
}
