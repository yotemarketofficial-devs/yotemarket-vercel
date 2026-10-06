/* A wrong wa.me number opens WhatsApp on a stranger, or on a "not on WhatsApp" page,
 * so the rule is: resolve what is certain and return null for everything else. */
import { describe, it, expect } from 'vitest';
import { msisdn, whatsappLink, telLink } from './phone.js';

describe('msisdn — Kenyan numbers however they were typed', () => {
  it.each([
    ['0720 730 861', '254720730861'],
    ['0720730861', '254720730861'],
    ['+254 720 730 861', '254720730861'],
    ['254720730861', '254720730861'],
    ['720730861', '254720730861'],
    ['0110 123 456', '254110123456'],   // the 01… Safaricom range
    ['(0720) 730-861', '254720730861'],
  ])('%s → %s', (raw, want) => expect(msisdn(raw)).toBe(want));
});

describe('msisdn — refuses to guess', () => {
  it('rejects landlines, short and long digit runs', () => {
    expect(msisdn('020 123 4567')).toBeNull();   // Nairobi landline, not mobile
    expect(msisdn('07207308')).toBeNull();
    expect(msisdn('07207308611')).toBeNull();
  });

  it('accepts a foreign number only with its + prefix', () => {
    expect(msisdn('+44 7700 900123')).toBe('447700900123');
    expect(msisdn('44 7700 900123')).toBeNull();
  });

  it('handles empty input', () => {
    expect(msisdn('')).toBeNull();
    expect(msisdn(null)).toBeNull();
    expect(msisdn(undefined)).toBeNull();
  });
});

describe('links', () => {
  it('builds wa.me from the resolved number', () => {
    expect(whatsappLink('0720 730 861')).toBe('https://wa.me/254720730861');
    expect(whatsappLink('not a number')).toBeNull();
  });

  it('builds tel: as written, minus spacing', () => {
    expect(telLink('0720 730 861')).toBe('tel:0720730861');
    expect(telLink('+254 720 730 861')).toBe('tel:+254720730861');
    expect(telLink('')).toBeNull();
  });
});
