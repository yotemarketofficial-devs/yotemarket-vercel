import { describe, it, expect, beforeEach } from 'vitest';
import { isMissing, setMissing, subscribeMissing, resetMissing } from './soft404.js';

describe('soft404 signal', () => {
  beforeEach(() => resetMissing());

  it('starts clean — an ordinary page is not a soft 404', () => {
    expect(isMissing()).toBe(false);
  });

  it('notifies subscribers when a screen reports a dead id', () => {
    let hits = 0;
    subscribeMissing(() => { hits += 1; });
    setMissing(true);
    expect(isMissing()).toBe(true);
    expect(hits).toBe(1);
  });

  it('does not re-notify on an unchanged value — RouteSeo would re-render for nothing', () => {
    let hits = 0;
    subscribeMissing(() => { hits += 1; });
    setMissing(true);
    setMissing(true);
    expect(hits).toBe(1);
  });

  it('clears when the screen unmounts, so the next route is indexable again', () => {
    setMissing(true);
    setMissing(false);
    expect(isMissing()).toBe(false);
  });

  it('stops notifying after unsubscribe', () => {
    let hits = 0;
    const off = subscribeMissing(() => { hits += 1; });
    off();
    setMissing(true);
    expect(hits).toBe(0);
  });
});
