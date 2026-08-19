/* RouteSeo — per-page title, description and canonical.
 *
 * This is a single-page app: index.html is served for every URL, so without this
 * every page shipped the homepage's <title>, description AND — worst of all — a
 * canonical of "https://yotemarket.com/". A canonical pointing at the homepage
 * tells Google that /about, /pricing, /careers and the rest ARE the homepage, so
 * they get folded away and never rank, while sitemap.xml is busy asking Google to
 * index them. The two were fighting each other; the canonical was winning.
 *
 * Googlebot runs JS, so setting these on navigation works. Note the honest limit:
 * crawlers that DON'T run JS (WhatsApp, Facebook, X link previews) only ever see
 * index.html, so shared links show the homepage card. Fixing that properly needs
 * prerendering/SSR — see the platform audit.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
// Shared with scripts/prerender.mjs so the crawled HTML and the hydrated page agree.
import { SITE, DEFAULT, PAGES, robotsFor } from '../lib/seo-pages.mjs';


/** Set (or create) a <meta> tag. */
function meta(key, content, attr = 'name') {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Point the canonical at THIS url — not blanket-at the homepage. */
function canonical(url) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

export default function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Trailing slashes would otherwise canonicalise to a different URL than the
    // sitemap lists, which is the same duplicate problem in a smaller hat.
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
    // Catalogue pages (/store/:sid, /product/:pid, /feed/:vid) are real URLs but their
    // titles live in Firestore, not in this map. Give them a self-canonical and a sane
    // generic title; the screen itself refines the title once the item loads.
    // (A per-item <title> in the crawled HTML needs prerender/SSR — see [[seo]].)
    const page = PAGES[path]
      || (/^\/feed\//.test(path)
        ? { title: 'Shoppable video on YoteFeed — YoteMarket', description: PAGES['/feed'].description }
        : /^\/(store|product)\//.test(path)
          ? { title: 'Shop Kenyan stores online — YoteMarket', description: PAGES['/storefront'].description }
          : DEFAULT);
    const url = SITE + (path === '/' ? '/' : path);

    document.title = page.title;
    meta('description', page.description);
    canonical(url);

    meta('og:title', page.title, 'property');
    meta('og:description', page.description, 'property');
    meta('og:url', url, 'property');
    meta('twitter:title', page.title);
    meta('twitter:description', page.description);

    // Gated areas and any unmatched path (which renders <NotFound/> at HTTP 200 —
    // a soft 404) are kept out of the index. See robotsFor().
    meta('robots', robotsFor(path));
  }, [pathname]);

  return null;
}
