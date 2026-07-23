/* Tour placement rules. The bug these exist to prevent: the card was clamped against a
   GUESSED height, so a step whose text wrapped on a phone rendered taller than the guess
   and its Back/Next buttons ended up below the fold — unreachable, with no way to
   continue or go back. The invariant is simple and absolute: whatever the anchor, the
   card is fully inside the viewport. */
import { describe, it, expect } from 'vitest';
import { cardPosition, cardWidth, TOUR_M } from './tourEngine.js';

const inViewport = (pos, w, h, vw, vh) =>
  pos.left >= TOUR_M && pos.top >= TOUR_M &&
  pos.left + w <= vw - TOUR_M + 0.001 &&
  pos.top + h <= vh - TOUR_M + 0.001;

describe('cardPosition — the card is always fully on screen', () => {
  it('sits beside the anchor when there is room (desktop sidebar)', () => {
    const rect = { top: 200, left: 40, width: 220, height: 44 };
    const pos = cardPosition(rect, 300, 240, 1440, 900);
    expect(pos.left).toBe(40 + 220 + 14);   // to the right of the anchor
    expect(pos.top).toBe(200);
    expect(inViewport(pos, 300, 240, 1440, 900)).toBe(true);
  });

  it('drops below the anchor when there is no room beside it (phone)', () => {
    const rect = { top: 64, left: 12, width: 300, height: 40 };   // pill strip
    const pos = cardPosition(rect, 300, 260, 360, 780);
    expect(pos.top).toBeGreaterThanOrEqual(64 + 40);
    expect(inViewport(pos, 300, 260, 360, 780)).toBe(true);
  });

  it('goes ABOVE an anchor sitting low on screen', () => {
    const rect = { top: 700, left: 12, width: 300, height: 44 };
    const pos = cardPosition(rect, 300, 240, 360, 780);
    expect(pos.top + 240).toBeLessThanOrEqual(700);   // clears the anchor
    expect(inViewport(pos, 300, 240, 360, 780)).toBe(true);
  });

  /* The regression that motivated this module: a tall card on a short screen. It cannot
     avoid the anchor, but it must still be fully reachable. */
  it('keeps a card TALLER than the space fully on screen', () => {
    const rect = { top: 300, left: 12, width: 300, height: 44 };
    const vw = 360; const vh = 640;
    const pos = cardPosition(rect, 300, 560, vw, vh);
    expect(inViewport(pos, 300, 560, vw, vh)).toBe(true);
  });

  it('never lets the buttons fall below the fold, across many viewports', () => {
    const viewports = [[320, 568], [360, 640], [390, 844], [412, 915], [768, 1024], [1440, 900]];
    const heights = [180, 240, 300, 380, 460];
    for (const [vw, vh] of viewports) {
      const w = cardWidth(306, vw);
      for (const h of heights) {
        for (const top of [0, 60, 200, vh - 120, vh - 40]) {
          for (const left of [0, 12, vw - 60]) {
            const pos = cardPosition({ top, left, width: 48, height: 44 }, w, Math.min(h, vh - TOUR_M * 2), vw, vh);
            const hh = Math.min(h, vh - TOUR_M * 2);
            expect(inViewport(pos, w, hh, vw, vh)).toBe(true);
          }
        }
      }
    }
  });

  it('returns null with no anchor, so the caller centres the card', () => {
    expect(cardPosition(null, 300, 240, 360, 640)).toBe(null);
  });
});

describe('cardWidth', () => {
  it('never exceeds the screen on a narrow phone', () => {
    expect(cardWidth(306, 320)).toBeLessThanOrEqual(320 - TOUR_M * 2);
  });
  it('uses the preferred width on desktop', () => {
    expect(cardWidth(306, 1440)).toBe(306);
  });
  it('keeps a readable floor on a very narrow screen', () => {
    expect(cardWidth(306, 240)).toBeGreaterThanOrEqual(232);
  });
});
