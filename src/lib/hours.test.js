/* Unit tests for store opening hours.
 *
 * "Open now" is a promise to a shopper: if it's wrong they walk to a shut shop, or
 * skip an open one. The clock maths (overnight windows, the next opening, closed
 * days) is worth pinning down properly. The server mirrors the same shape in
 * functions/index.js (cleanStoreHours) — keep the two in step.
 */
import { describe, it, expect } from 'vitest';
import {
  DAYS, minutesOf, defaultHours, normalizeHours, hasHours, dayWindow, todayWindow, storeOpenState,
} from './hours.js';

// A real date at a known weekday/time. 2026-07-20 is a Monday.
const MON = (h, m = 0) => new Date(2026, 6, 20, h, m);
const SAT = (h, m = 0) => new Date(2026, 6, 25, h, m);
const SUN = (h, m = 0) => new Date(2026, 6, 26, h, m);

const week = (over = {}) => ({ ...defaultHours(), ...over });

describe('minutesOf', () => {
  it('reads a valid HH:MM', () => {
    expect(minutesOf('00:00')).toBe(0);
    expect(minutesOf('09:30')).toBe(570);
    expect(minutesOf('23:59')).toBe(1439);
  });
  it('rejects anything that is not a 24h time', () => {
    ['24:00', '9:30', '09:60', 'nine', '', null, undefined].forEach((v) => expect(minutesOf(v)).toBeNull());
  });
});

describe('normalizeHours', () => {
  it('returns null when there is nothing usable', () => {
    expect(normalizeHours(null)).toBeNull();
    expect(normalizeHours('09:00-18:00')).toBeNull();
    expect(normalizeHours({})).toBeNull();
  });

  it('closes any day with a missing or malformed time rather than inventing one', () => {
    const h = normalizeHours({ mon: { open: '09:00' }, tue: { open: '9am', close: '6pm' }, wed: { open: '08:00', close: '17:00' } });
    expect(h.mon).toEqual({ closed: true });
    expect(h.tue).toEqual({ closed: true });
    expect(h.wed).toEqual({ closed: false, open: '08:00', close: '17:00' });
  });

  it('always returns all seven days', () => {
    const h = normalizeHours({ sat: { open: '10:00', close: '14:00' } });
    expect(Object.keys(h).sort()).toEqual(DAYS.map((d) => d.k).sort());
  });

  it('treats an all-closed week as no hours (nothing to show a shopper)', () => {
    expect(normalizeHours({ mon: { closed: true }, sun: { closed: true } })).toBeNull();
    expect(hasHours(defaultHours())).toBe(true);
  });
});

describe('dayWindow / todayWindow', () => {
  it('formats an open day and a closed one', () => {
    expect(dayWindow(defaultHours(), 'mon')).toBe('09:00 – 18:00');
    expect(dayWindow(defaultHours(), 'sun')).toBe('Closed');
  });
  it('reads the right row for the current weekday', () => {
    expect(todayWindow(defaultHours(), MON(11))).toBe('09:00 – 18:00');
    expect(todayWindow(defaultHours(), SUN(11))).toBe('Closed');
  });
});

describe('storeOpenState — inside normal hours', () => {
  it('says nothing at all when no hours are set', () => {
    expect(storeOpenState(null, MON(11))).toBeNull();
    expect(storeOpenState({}, MON(11))).toBeNull();
  });

  it('is open between open and close', () => {
    const s = storeOpenState(defaultHours(), MON(11));
    expect(s.open).toBe(true);
    expect(s.closesAt).toBe('18:00');
    expect(s.label).toBe('Open now · closes 18:00');
  });

  it('opens exactly on the minute and shuts exactly on the minute', () => {
    expect(storeOpenState(defaultHours(), MON(9, 0)).open).toBe(true);
    expect(storeOpenState(defaultHours(), MON(17, 59)).open).toBe(true);
    expect(storeOpenState(defaultHours(), MON(18, 0)).open).toBe(false);
  });
});

describe('storeOpenState — when closed, what a shopper is told next', () => {
  it('points at today when the store has not opened yet', () => {
    expect(storeOpenState(defaultHours(), MON(7)).label).toBe('Closed · opens 09:00');
  });

  it('says "tomorrow" after closing time', () => {
    expect(storeOpenState(defaultHours(), MON(19)).label).toBe('Closed · opens 09:00 tomorrow');
  });

  it('names the weekday when the next opening is further out (Sat evening → Mon)', () => {
    expect(storeOpenState(defaultHours(), SAT(20)).label).toBe('Closed · opens 09:00 Mon');
  });

  it('skips closed days entirely (Sunday → Monday)', () => {
    const s = storeOpenState(defaultHours(), SUN(12));
    expect(s.open).toBe(false);
    expect(s.opensDay).toBe('mon');
    expect(s.label).toBe('Closed · opens 09:00 tomorrow');
  });

  it('wraps a whole week for a store that only opens one day', () => {
    const satOnly = week({ mon: { closed: true }, tue: { closed: true }, wed: { closed: true }, thu: { closed: true }, fri: { closed: true }, sat: { closed: false, open: '10:00', close: '16:00' }, sun: { closed: true } });
    // Saturday, after close — the only opening is the same day next week.
    expect(storeOpenState(satOnly, SAT(18)).label).toBe('Closed · opens 10:00 Sat');
  });
});

describe('storeOpenState — windows that run past midnight', () => {
  const lateNight = week({ fri: { closed: false, open: '18:00', close: '02:00' }, sat: { closed: false, open: '18:00', close: '02:00' } });

  it('stays open after midnight on yesterday\'s row', () => {
    const s = storeOpenState(lateNight, SAT(1, 30)); // 01:30 Saturday = Friday's window
    expect(s.open).toBe(true);
    expect(s.closesAt).toBe('02:00');
  });

  it('shuts at the overnight close time', () => {
    expect(storeOpenState(lateNight, SAT(2, 0)).open).toBe(false);
    expect(storeOpenState(lateNight, SAT(2, 0)).label).toBe('Closed · opens 18:00');
  });

  it('is open late in the evening before midnight', () => {
    expect(storeOpenState(lateNight, SAT(23, 45)).open).toBe(true);
  });

  it('does not treat an ordinary daytime store as overnight', () => {
    expect(storeOpenState(defaultHours(), MON(2)).open).toBe(false);
  });
});
