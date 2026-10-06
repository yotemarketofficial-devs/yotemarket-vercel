/* toMillis is the sort key for every date column in the staff tables, so the cases are the
 * shapes dates actually arrive in — and the ordering they have to produce. */
import { describe, it, expect } from 'vitest';
import { toMillis, fmtDay } from './dates.js';

const T = Date.UTC(2026, 9, 6, 13, 0, 0); // Tue 6 Oct 2026 13:00 UTC

describe('toMillis — every shape a date arrives in', () => {
  it('reads the RFC-1123 string Firebase Auth puts in user metadata', () => {
    expect(toMillis('Tue, 06 Oct 2026 13:00:00 GMT')).toBe(T);
  });

  it('reads ISO strings, with and without a time', () => {
    expect(toMillis('2026-10-06T13:00:00.000Z')).toBe(T);
    expect(toMillis('2026-10-06')).toBe(Date.UTC(2026, 9, 6));
  });

  it('passes epoch ms through, and reads digit strings as ms or seconds', () => {
    expect(toMillis(T)).toBe(T);
    expect(toMillis(String(T))).toBe(T);
    expect(toMillis(String(T / 1000))).toBe(T);
  });

  it('reads Firestore Timestamps, live and serialized through a callable', () => {
    expect(toMillis({ toMillis: () => T })).toBe(T);
    expect(toMillis({ seconds: T / 1000, nanoseconds: 0 })).toBe(T);
    expect(toMillis({ _seconds: T / 1000, _nanoseconds: 500e6 })).toBe(T + 500);
  });

  it('reads a Date', () => {
    expect(toMillis(new Date(T))).toBe(T);
  });

  it('returns null for missing or unreadable dates, so they sort last', () => {
    for (const v of [null, undefined, '', '   ', 0, -5, NaN, 'not a date', {}, [], new Date('nope')]) {
      expect(toMillis(v), JSON.stringify(v)).toBeNull();
    }
  });
});

describe('toMillis — as a sort key', () => {
  it('orders Auth creation times chronologically, not by weekday name', () => {
    // As text these sort Fri < Mon < Sat < Sun < Thu < Tue < Wed — the reported bug.
    const joined = [
      'Wed, 01 Jan 2025 09:00:00 GMT',
      'Fri, 03 Oct 2026 09:00:00 GMT',
      'Mon, 05 Oct 2026 09:00:00 GMT',
      'Tue, 06 Oct 2026 13:00:00 GMT',
      'Sun, 30 Mar 2025 09:00:00 GMT',
    ];
    const byText = [...joined].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    expect(byText[0]).toBe('Fri, 03 Oct 2026 09:00:00 GMT'); // proves text order is wrong

    const newestFirst = [...joined].sort((a, b) => toMillis(b) - toMillis(a));
    expect(newestFirst).toEqual([
      'Tue, 06 Oct 2026 13:00:00 GMT',
      'Mon, 05 Oct 2026 09:00:00 GMT',
      'Fri, 03 Oct 2026 09:00:00 GMT',
      'Sun, 30 Mar 2025 09:00:00 GMT',
      'Wed, 01 Jan 2025 09:00:00 GMT',
    ]);
  });

  it('puts mixed shapes on one timeline', () => {
    const rows = [T + 2, 'Tue, 06 Oct 2026 13:00:00 GMT', { _seconds: T / 1000 - 60 }, '2026-10-06T13:00:00.001Z'];
    expect(rows.map(toMillis).sort((a, b) => a - b)).toEqual([T - 60000, T, T + 1, T + 2]);
  });
});

describe('fmtDay', () => {
  it('formats any readable date, and shows a dash rather than "Invalid Date"', () => {
    expect(fmtDay('Tue, 06 Oct 2026 13:00:00 GMT')).toMatch(/6 Oct 2026/);
    expect(fmtDay(T)).toMatch(/6 Oct 2026/);
    expect(fmtDay('garbage')).toBe('—');
    expect(fmtDay(null)).toBe('—');
  });
});
