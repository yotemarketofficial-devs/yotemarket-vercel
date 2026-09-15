/* Soft-404 signal.
 *
 * This is a static SPA: Vercel rewrites every unmatched path to index.html, so a URL
 * that no longer has anything behind it — a deleted product, a store that was taken
 * down — still answers HTTP 200. Google calls that a SOFT 404 and reports it as a
 * defect for as long as the URL stays crawled.
 *
 * robotsFor() already noindexes paths matching NO route, but that doesn't cover this:
 * /product/:pid IS a real route, so it stays "index, follow" no matter whether the id
 * in it still resolves. Only the screen that looked the id up knows, and it learns it
 * long after RouteSeo has written the meta tag.
 *
 * Hence a signal rather than a second writer. RouteSeo stays the ONE thing that sets
 * <meta name="robots">; the screen just reports what it found. Two components writing
 * the same tag would come down to effect ordering, and child effects run before parent
 * ones — the screen would set noindex and RouteSeo would immediately overwrite it.
 */
let missing = false;
const subs = new Set();

export const isMissing = () => missing;

/** Called by the screen that resolved an id to nothing (and cleared on unmount). */
export function setMissing(value) {
  const next = !!value;
  if (next === missing) return;
  missing = next;
  subs.forEach((fn) => fn());
}

export function subscribeMissing(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** Test seam — the module-level flag outlives a single test otherwise. */
export function resetMissing() { missing = false; subs.clear(); }
