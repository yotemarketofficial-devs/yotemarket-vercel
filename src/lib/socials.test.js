import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SOCIAL_LINKS, COMPANY_PROFILES, ORG_SAME_AS, FOUNDERS, WHATSAPP_URL, founderSameAs } from './socials.js';

/* The identity YoteMarket claims lives in two files that cannot import each other:
 * lib/socials.js (the app) and the JSON-LD in index.html (what crawlers and AI answer
 * engines read). They were already duplicated once and drifted.
 *
 * Why it matters beyond tidiness: search engines and answer engines decide "is this the
 * same company/person?" by reconciling the profiles a page claims via `sameAs` against
 * the profiles that link back. A url that is stale in one file and current in the other
 * doesn't merely go unused — it splits one entity into two weaker ones. So the two files
 * are asserted equal here rather than trusted to stay that way. */

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const graph = JSON.parse(
  html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],
)['@graph'];
const org = graph.find((n) => String(n['@id']).endsWith('#organization'));

describe('the social links themselves', () => {
  it('are absolute https urls', () => {
    for (const { label, url } of SOCIAL_LINKS) {
      expect(url, label).toMatch(/^https:\/\//);
    }
  });

  it('list each network exactly once', () => {
    const labels = SOCIAL_LINKS.map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('the organisation entity in index.html', () => {
  it('claims exactly the profiles socials.js lists — no more, no fewer', () => {
    expect([...org.sameAs].sort()).toEqual([...ORG_SAME_AS].sort());
  });

  it('does not put WhatsApp in sameAs — it is a way to contact us, not a profile of us', () => {
    expect(org.sameAs).not.toContain(WHATSAPP_URL);
    expect(ORG_SAME_AS).not.toContain(WHATSAPP_URL);
  });

  it('publishes WhatsApp as a contactPoint instead, so the number is still machine-readable', () => {
    const phones = (org.contactPoint || []).map((c) => c.telephone);
    expect(phones.some((p) => WHATSAPP_URL.includes(String(p).replace('+', '')))).toBe(true);
  });
});

describe('the company directory profiles', () => {
  it('are absolute https urls, listed once each', () => {
    const labels = COMPANY_PROFILES.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const { label, url } of COMPANY_PROFILES) expect(url, label).toMatch(/^https:\/\//);
  });

  it('are claimed in the organisation sameAs, like the social profiles', () => {
    for (const { label, url } of COMPANY_PROFILES) expect(ORG_SAME_AS, label).toContain(url);
  });

  it('are linked from the About page, so a crawler can follow them', () => {
    // sameAs is a claim; the outbound link is what a crawler follows. An off-site profile
    // cannot go in sitemap.xml (same-host rule), so this page is how it gets discovered.
    const about = readFileSync(new URL('../pages/About.jsx', import.meta.url), 'utf8');
    expect(about).toContain('COMPANY_PROFILES');
  });

  it('never appear in the sitemap — it may only advertise our own host', () => {
    const gen = readFileSync(new URL('../../scripts/generate-sitemap.mjs', import.meta.url), 'utf8');
    for (const { label, url } of COMPANY_PROFILES) expect(gen, label).not.toContain(url);
  });
});

describe('the founder entities in index.html', () => {
  it('covers every founder socials.js knows about', () => {
    const ids = org.founder.map((f) => String(f['@id']).split('#')[1]);
    expect(ids.sort()).toEqual(FOUNDERS.map((f) => f.id).sort());
  });

  it('claims exactly the profiles socials.js lists for each founder', () => {
    for (const f of org.founder) {
      const id = String(f['@id']).split('#')[1];
      expect([...(f.sameAs || [])].sort(), id).toEqual([...founderSameAs(id)].sort());
    }
  });

  it('ties each founder back to the organisation, so the two entities are linked', () => {
    for (const f of org.founder) {
      expect(f.worksFor['@id'], f.name).toBe(org['@id']);
      expect(f.jobTitle, f.name).toBeTruthy();
      expect(f.description, f.name).toBeTruthy();
    }
  });

  it('gives every founder profile url to the About page as well, via the shared list', () => {
    // About.jsx renders these with rel="me"; a profile claimed in JSON-LD but absent
    // from the page (or vice versa) is the exact mismatch that splits an entity.
    const about = readFileSync(new URL('../pages/About.jsx', import.meta.url), 'utf8');
    expect(about).toContain("from '../lib/socials.js'");
    for (const f of FOUNDERS) expect(about, f.id).toContain(f.id);
  });

  it('renders ALL of a founder\'s profiles, not just the first', () => {
    // The page used to hard-code `links[0]`, so adding a second profile to a founder
    // claimed it in sameAs while the page still linked only the LinkedIn one.
    const about = readFileSync(new URL('../pages/About.jsx', import.meta.url), 'utf8');
    expect(about).not.toMatch(/links\[\d+\]/);
    expect(FOUNDERS.some((f) => f.links.length > 1)).toBe(true);
  });
});
