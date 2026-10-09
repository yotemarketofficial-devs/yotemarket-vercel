import { describe, expect, it } from 'vitest';
import { communityStats, countCounties, countyOf, liveStores } from './community-stats.js';

describe('countyOf', () => {
  it('takes the county field when it names a county', () => {
    expect(countyOf({ county: 'Kisii' })).toBe('Kisii');
    expect(countyOf({ county: "Murang'a" })).toBe("Murang'a");
    expect(countyOf({ county: 'muranga' })).toBe("Murang'a");
  });

  it('reads a county out of the area or town when the field is empty', () => {
    expect(countyOf({ county: null, area: 'Homabay town' })).toBe('Homa Bay');
    expect(countyOf({ area: 'Odeon Nairobi CBD' })).toBe('Nairobi');
    expect(countyOf({ area: 'Kiambu road' })).toBe('Kiambu');
    expect(countyOf({ area: '', town: 'Tana River' })).toBe('Tana River');
    expect(countyOf({ address: 'Ruiru, Kiambu' })).toBe('Kiambu');
  });

  it('only matches whole words, never part of a place name', () => {
    expect(countyOf({ area: 'Embulbul' })).toBeNull();
    expect(countyOf({ area: 'Merudi stage' })).toBeNull();
  });

  it('returns null when nothing names a county', () => {
    expect(countyOf({ area: 'Ruiru' })).toBeNull();
    expect(countyOf({})).toBeNull();
    expect(countyOf(null)).toBeNull();
  });

  it('prefers the county field over the area', () => {
    expect(countyOf({ county: 'Mombasa', area: 'Nairobi CBD' })).toBe('Mombasa');
  });
});

describe('countCounties', () => {
  it('counts each county once', () => {
    const stores = [
      { county: 'Nairobi' }, { area: 'Nairobi CBD' }, { county: 'Kiambu' },
      { area: 'Ruiru' }, { area: 'Homabay town' },
    ];
    expect(countCounties(stores)).toBe(3);
  });
  it('is 0 for no stores', () => {
    expect(countCounties([])).toBe(0);
    expect(countCounties(undefined)).toBe(0);
  });
});

describe('communityStats', () => {
  it('leaves suspended stores out of every figure', () => {
    const stores = [
      { id: 'a', county: 'Nairobi' },
      { id: 'b', county: 'Kisii', suspended: true },
      { id: 'c', county: 'Mombasa', suspended: false },
    ];
    expect(liveStores(stores).map((s) => s.id)).toEqual(['a', 'c']);
    expect(communityStats(stores, 39)).toEqual({ stores: 2, counties: 2, products: 39 });
  });
  it('reports no product figure until it has one', () => {
    expect(communityStats([], undefined)).toEqual({ stores: 0, counties: 0, products: null });
  });
});
