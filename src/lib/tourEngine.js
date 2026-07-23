/* tourEngine.js — the shared geometry behind every guided tour (merchant dashboard,
   scout app, storefront).

   Only the MATH lives here, deliberately. Each kit keeps its own Tour component because
   the three are different design systems with different class names and tokens; what
   they genuinely share is "find the visible anchor" and "place a card so it is always
   fully on screen". That math was copied per kit and drifted — each clamped against a
   guessed card height, which pushed the buttons off the bottom of a phone. Pure
   functions here, unit-tested in tourEngine.test.js, so it can't silently regress again.

   Viewport size is passed in rather than read from `window` so the placement rules are
   testable without a DOM. */

export const TOUR_M = 12;    // keep this much clear of every viewport edge
export const TOUR_GAP = 14;  // breathing room between the anchor and the card

/**
 * The visible element carrying data-tour="<anchor>" within `scope`.
 * A kit may render the same anchor twice — e.g. a desktop sidebar item AND a mobile
 * pill — with only one displayed. Hidden elements measure 0x0, so skip them and take
 * whichever is really on screen; that's what lets the spotlight work on a phone.
 * Returns null when nothing visible matches (caller should centre the card).
 */
export function measureAnchor(anchor, scope = '') {
  if (!anchor || typeof document === 'undefined') return null;
  const sel = `${scope ? scope + ' ' : ''}[data-tour="${anchor}"]`;
  let els;
  try { els = document.querySelectorAll(sel); } catch { return null; }
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;   // display:none
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch { /* older browsers */ }
    const r2 = el.getBoundingClientRect();
    return { top: r2.top, left: r2.left, width: r2.width, height: r2.height };
  }
  return null;
}

/**
 * Where to put the tour card, given the anchor and the card's MEASURED size.
 * Order of preference: beside the anchor → below it → above it → docked to whichever
 * band has more room. The final clamp is the actual guarantee: the card always ends up
 * inside the viewport on both axes, even when it can't avoid overlapping the anchor.
 * Returns null when there's no anchor (caller centres the card).
 */
export function cardPosition(rect, w, h, vw, vh) {
  if (!rect) return null;
  const M = TOUR_M; const GAP = TOUR_GAP;

  const fitsRight = rect.left + rect.width + GAP + w <= vw - M;
  const spaceBelow = vh - (rect.top + rect.height) - GAP - M;
  const spaceAbove = rect.top - GAP - M;

  let left; let top;
  if (fitsRight) {                  // desktop: beside the highlighted nav item
    left = rect.left + rect.width + GAP;
    top = rect.top;
  } else if (spaceBelow >= h) {     // narrow: under the anchor
    left = rect.left;
    top = rect.top + rect.height + GAP;
  } else if (spaceAbove >= h) {     // anchor sits low → put the card above it
    left = rect.left;
    top = rect.top - GAP - h;
  } else {                          // nothing fits cleanly → dock to the roomier side
    left = rect.left;
    top = spaceBelow >= spaceAbove ? vh - h - M : M;
  }

  left = Math.max(M, Math.min(left, vw - w - M));
  top = Math.max(M, Math.min(top, vh - h - M));
  return { left, top };
}

/** Card width that never exceeds the screen (with a floor so it stays readable). */
export function cardWidth(preferred, vw) {
  return Math.min(preferred, Math.max(232, vw - TOUR_M * 2));
}
