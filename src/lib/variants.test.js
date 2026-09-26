import { describe, it, expect } from 'vitest';
import {
  lineKey, hasVariants, findVariant, variantSoldOut, defaultVariant, variantLabel,
  needsVariant, inkOn, normVariants,
} from './variants.js';

const buds = {
  id: 'buds',
  variants: [
    { id: 'navy', name: 'Navy', hex: '#1f2a44', stock: 0 },
    { id: 'white', name: 'White', hex: '#f7f7f5', stock: 3 },
  ],
};
const basket = { id: 'basket', variantLabel: 'Size', variants: [{ id: 'small', name: 'Small' }, { id: 'large', name: 'Large' }] };
const tote = { id: 'tote' };

describe('lineKey', () => {
  it('keeps a plain product on its bare id, so old saved carts restore', () => {
    expect(lineKey('tote', null)).toBe('tote');
    expect(lineKey('tote', undefined)).toBe('tote');
    expect(lineKey('tote', '')).toBe('tote');
  });
  it('makes two colours of one product two lines', () => {
    expect(lineKey('buds', 'navy')).toBe('buds~navy');
    expect(lineKey('buds', 'navy')).not.toBe(lineKey('buds', 'white'));
  });
});

describe('finding and choosing a variant', () => {
  it('finds by id, and treats a removed variant as unchosen', () => {
    expect(findVariant(buds, 'white').name).toBe('White');
    expect(findVariant(buds, 'gone')).toBeNull();
    expect(findVariant(tote, 'navy')).toBeNull();
  });
  it('opens on the first value that can be bought', () => {
    expect(defaultVariant(buds).id).toBe('white'); // navy is sold out
    expect(defaultVariant(basket).id).toBe('small');
    expect(defaultVariant(tote)).toBeNull();
  });
  it('only calls a counted-and-empty variant sold out', () => {
    expect(variantSoldOut({ stock: 0 })).toBe(true);
    expect(variantSoldOut({ stock: 2 })).toBe(false);
    expect(variantSoldOut({ stock: null })).toBe(false);
  });
  it('names the axis: the merchant label, else Colour for swatches, else Option', () => {
    expect(variantLabel(basket)).toBe('Size');
    expect(variantLabel(buds)).toBe('Colour');
    expect(variantLabel({ variants: [{ id: 'a', name: '128 GB' }] })).toBe('Option');
  });
});

describe('needsVariant — what the server would refuse', () => {
  it('flags a line of a variant product with no (or a removed) choice', () => {
    expect(needsVariant(buds, { pid: 'buds' })).toBe(true);
    expect(needsVariant(buds, { pid: 'buds', variantId: 'gone' })).toBe(true);
    expect(needsVariant(buds, { pid: 'buds', variantId: 'navy' })).toBe(false);
  });
  it('never flags a plain product', () => {
    expect(hasVariants(tote)).toBe(false);
    expect(needsVariant(tote, { pid: 'tote' })).toBe(false);
  });
});

describe('normVariants', () => {
  it('keeps id+name values, normalises hex, drops junk', () => {
    const v = normVariants([
      { id: 'a', name: 'Red', hex: 'D32F2F', stock: 4, image: 'https://x/y.jpg' },
      { id: 'b', name: 'Plain', hex: 'not-a-colour' },
      { name: 'No id' },
      null,
    ]);
    expect(v).toEqual([
      { id: 'a', name: 'Red', hex: '#d32f2f', image: 'https://x/y.jpg', stock: 4 },
      { id: 'b', name: 'Plain', hex: null, image: null, stock: null },
    ]);
    expect(normVariants(undefined)).toEqual([]);
  });
});

describe('inkOn', () => {
  it('puts dark ink on light swatches and white on dark ones', () => {
    expect(inkOn('#f7f7f5')).toBe('#111827');
    expect(inkOn('#1f2a44')).toBe('#fff');
  });
});
