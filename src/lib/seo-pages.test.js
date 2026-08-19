import { describe, it, expect } from 'vitest';
import { PAGES, GATED, robotsFor, isKnownRoute, normalisePath, SITE } from './seo-pages.mjs';

/* These assertions guard two opposite failures, both of which cost real traffic:
 *
 *  - noindex on a page we want ranked — the page silently disappears from Google
 *    and nothing in the UI ever shows it, and
 *  - index on a path that matches no route — that renders <NotFound/> at HTTP 200,
 *    which Google reports as a soft 404.
 *
 * The route list here is deliberately written out by hand rather than derived from
 * PAGES: a test that imports the same data it checks would pass even if a route
 * were dropped. */

const PUBLIC_PAGES = [
  '/', '/storefront', '/feed', '/about', '/pricing', '/mobile', '/rider',
  '/marketers', '/careers', '/help', '/contact', '/terms', '/privacy', '/delete-account',
];

describe('robotsFor', () => {
  it('indexes every public marketing page', () => {
    for (const p of PUBLIC_PAGES) expect(robotsFor(p), p).toBe('index, follow');
  });

  it('indexes catalogue and feed pages, which carry an id', () => {
    expect(robotsFor('/store/2c8np79trTvWNz62augN')).toBe('index, follow');
    expect(robotsFor('/product/0bo4JGAetW8ahGHeBhB0')).toBe('index, follow');
    expect(robotsFor('/feed/84fpp4Ku4UeaR6nWT3jD')).toBe('index, follow');
  });

  it('keeps the signed-in app areas out of the index', () => {
    for (const g of GATED) expect(robotsFor(g), g).toBe('noindex, nofollow');
    expect(robotsFor('/dashboard/products')).toBe('noindex, nofollow');
    expect(robotsFor('/staff/support')).toBe('noindex, nofollow');
  });

  it('noindexes paths that match no route — those are the soft 404s', () => {
    expect(robotsFor('/nope')).toBe('noindex, nofollow');
    expect(robotsFor('/about/team')).toBe('noindex, nofollow');
    expect(robotsFor('/product')).toBe('noindex, nofollow');
    expect(robotsFor('/store/')).toBe('noindex, nofollow');
    expect(robotsFor('/feed/abc/extra')).toBe('noindex, nofollow');
  });

  it('does not confuse the public /marketers page with the gated /marketers/app', () => {
    expect(robotsFor('/marketers')).toBe('index, follow');
    expect(robotsFor('/marketers/app')).toBe('noindex, nofollow');
  });

  it('treats a trailing slash as the same page, so it cannot flip to noindex', () => {
    expect(robotsFor('/about/')).toBe('index, follow');
    expect(normalisePath('/about/')).toBe('/about');
    expect(normalisePath('/')).toBe('/');
  });
});

describe('the page map', () => {
  it('covers every public marketing route', () => {
    for (const p of PUBLIC_PAGES) expect(isKnownRoute(p), p).toBe(true);
  });

  it('gives every page a title and a description', () => {
    for (const [path, page] of Object.entries(PAGES)) {
      expect(page.title, path).toBeTruthy();
      expect(page.description, path).toBeTruthy();
    }
  });

  it('canonicalises to www — the apex 308-redirects, so a canonical there is wasted', () => {
    expect(SITE).toBe('https://www.yotemarket.co.ke');
    expect(SITE.endsWith('/')).toBe(false);
  });
});
