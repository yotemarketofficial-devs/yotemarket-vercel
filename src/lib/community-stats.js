// The homepage's live figures ("A growing Kenyan community"), as pure functions over the
// store documents, so they can be tested without Firebase. community-live.js reads the
// documents and calls these; nothing here is ever a hard-coded number.
//
// The rules match what the shop and the sitemap show (lib/catalog.js, scripts/lib/catalog.mjs):
// a store is counted unless staff suspended it. A product is counted unless its store is
// suspended (community-live.js does that part, with a server-side count).
import { KE_COUNTY_NAMES } from './counties.js';

const key = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
// 'homabay' → 'Homa Bay', 'muranga' → "Murang'a", 'nairobi' → 'Nairobi'
const COUNTY_BY_KEY = new Map(KE_COUNTY_NAMES.map((n) => [key(n), n]));

/** Stores a shopper can see: everything but the staff-suspended ones. */
export function liveStores(stores) {
  return (stores || []).filter((s) => s && s.suspended !== true);
}

/** The county a store is in, by its official name, or null when it can't be told.
 *  The `county` field first (the dashboard's picker writes it). Many older stores only
 *  have a free-text area or town, so those are read too, but only a WHOLE word, or two
 *  neighbouring words, that is a county's name counts: "Homabay town" is Homa Bay and
 *  "Nairobi CBD" is Nairobi, while "Embulbul" is not Embu. */
export function countyOf(store) {
  if (!store) return null;
  const direct = COUNTY_BY_KEY.get(key(store.county));
  if (direct) return direct;
  for (const field of [store.area, store.town, store.subCounty, store.address]) {
    const words = String(field || '').split(/[\s,./()-]+/).map(key).filter(Boolean);
    for (let i = 0; i < words.length; i += 1) {
      const pair = i + 1 < words.length ? COUNTY_BY_KEY.get(words[i] + words[i + 1]) : null;
      const one = pair || COUNTY_BY_KEY.get(words[i]);
      if (one) return one;
    }
  }
  return null;
}

/** How many different counties the given stores are in. */
export function countCounties(stores) {
  const seen = new Set();
  for (const s of stores || []) {
    const c = countyOf(s);
    if (c) seen.add(c);
  }
  return seen.size;
}

/** The band's three figures from the raw store documents and a live product count. */
export function communityStats(allStores, productCount) {
  const live = liveStores(allStores);
  return {
    stores: live.length,
    counties: countCounties(live),
    products: Number.isFinite(productCount) ? productCount : null,
  };
}
