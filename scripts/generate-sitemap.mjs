/* Generate public/sitemap.xml — the marketing pages PLUS every live store and
 * product.
 *
 * Why this has to exist: the storefront navigates with <button onClick>, not
 * <a href>, so a crawler can't discover a product by following links. The routes
 * /store/:sid and /product/:pid are real and reachable, but orphaned. The sitemap
 * is what makes the catalogue findable at all.
 *
 * How it reads the catalogue: `stores` and `products` are world-readable
 * (firestore.rules: `allow read: if true`), so the Firestore REST API with the
 * public web API key is enough — no admin credentials in the Vercel build.
 *
 * Runs as `prebuild`, so every deploy ships a current sitemap. It NEVER fails the
 * build: if Firestore can't be reached (offline, CI, a bad key) it writes the
 * marketing pages and warns, because a slightly stale sitemap is much better than
 * a broken deploy.
 */
import { writeFileSync } from 'node:fs';
// Shared with prerender.mjs so both advertise the SAME set of pages.
import { SITE, fetchListable, str, num, productImage, storeImage, ksh } from './lib/catalog.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID || 'yotemarket-app';
// Public web config — already ships in every client bundle (see lib/firebase.js).
const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDXt0Rpw_Cll8RQ_BO0riSKb8q7oZWvgYY';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sitemap.xml');
const today = new Date().toISOString().slice(0, 10);

// Static pages, highest priority first. Keep in step with App.jsx routes and the
// PAGES map in components/RouteSeo.jsx.
const STATIC = [
  ['/', 'daily', '1.0'],
  ['/storefront', 'daily', '0.9'],
  ['/feed', 'daily', '0.8'],
  ['/pricing', 'monthly', '0.8'],
  ['/about', 'monthly', '0.7'],
  ['/mobile', 'monthly', '0.7'],
  ['/apk', 'weekly', '0.7'],
  ['/rider', 'monthly', '0.7'],
  ['/marketers', 'monthly', '0.7'],
  ['/careers', 'weekly', '0.6'],
  ['/help', 'monthly', '0.6'],
  ['/contact', 'monthly', '0.5'],
  ['/terms', 'yearly', '0.3'],
  ['/privacy', 'yearly', '0.3'],
];

// XML-escape text + attribute content. Critical for image URLs: Firebase Storage
// links carry `?alt=media&token=…`, and a raw `&` is invalid XML that breaks the
// whole sitemap. Also covers < > " ' in names/captions.
const xmlEsc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');


// One <url>, optionally carrying a Google image-sitemap entry so product photos and
// store logos are discoverable in Google Images (SEO "more info" per URL).
const url = (loc, changefreq, priority, lastmod = today, image = null, video = null) => {
  const imgXml = image && image.loc && /^https?:\/\//.test(image.loc)
    ? `\n    <image:image>\n      <image:loc>${xmlEsc(image.loc)}</image:loc>` +
      (image.title ? `\n      <image:title>${xmlEsc(image.title)}</image:title>` : '') +
      (image.caption ? `\n      <image:caption>${xmlEsc(image.caption)}</image:caption>` : '') +
      `\n    </image:image>`
    : '';
  // Google needs thumbnail_loc + title + description + a content/player loc on a video
  // entry and drops the whole entry if any is missing — so only emit one when we really
  // have a thumbnail and a playable file.
  const vidXml = video && video.thumb && video.content && /^https?:\/\//.test(video.thumb)
    ? `\n    <video:video>\n      <video:thumbnail_loc>${xmlEsc(video.thumb)}</video:thumbnail_loc>` +
      `\n      <video:title>${xmlEsc(video.title)}</video:title>` +
      `\n      <video:description>${xmlEsc(video.description)}</video:description>` +
      `\n      <video:content_loc>${xmlEsc(video.content)}</video:content_loc>` +
      (video.publication ? `\n      <video:publication_date>${xmlEsc(video.publication)}</video:publication_date>` : '') +
      `\n      <video:family_friendly>yes</video:family_friendly>\n      <video:live>no</video:live>` +
      `\n    </video:video>`
    : '';
  return `  <url>\n    <loc>${SITE}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
    `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>${imgXml}${vidXml}\n  </url>`;
};

const day = (iso) => (iso ? String(iso).slice(0, 10) : today);

// IndexNow — ping participating search engines (Bing, Yandex, Seznam, …) with the current
// URL set so new/changed stores & products get crawled without waiting for a sitemap
// re-fetch. The KEY proves ownership: it's served at /<key>.txt from public/. Only fires
// on a real Vercel deploy (not local builds) and never fails the build.
const INDEXNOW_KEY = '5247e78c88105f5049d9886cbf4e68f0';
async function submitIndexNow(locs) {
  if (!process.env.VERCEL || !locs.length) return;
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {'Content-Type': 'application/json; charset=utf-8'},
      body: JSON.stringify({
        host: SITE.replace(/^https?:\/\//, ''),
        key: INDEXNOW_KEY,
        keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
        urlList: locs.slice(0, 10000), // IndexNow caps one submission at 10k URLs
      }),
    });
    console.log(`[indexnow] submitted ${Math.min(locs.length, 10000)} urls → HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[indexnow] submit skipped (${err.message})`);
  }
}

async function main() {
  const urls = STATIC.map(([loc, f, p]) => url(loc, f, p));
  const locs = STATIC.map(([loc]) => `${SITE}${loc}`); // plain URLs, for IndexNow
  let note = 'marketing pages only';

  try {
    // ONE listable rule, shared with prerender.mjs — a URL the sitemap advertises but
    // the prerender skips (or vice versa) is a crawl error either way.
    const { stores: live, products: listable, feed, storeById, totalProducts, totalFeed } = await fetchListable();
    for (const s of live) {
      urls.push(url(`/store/${encodeURIComponent(s.id)}`, 'weekly', '0.8', day(s.updateTime),
          { loc: storeImage(s.fields), title: str(s.fields.name), caption: str(s.fields.tagline) || str(s.fields.area) }));
      locs.push(`${SITE}/store/${encodeURIComponent(s.id)}`);
    }

    for (const p of listable) {
      const price = num(p.fields.price);
      urls.push(url(`/product/${encodeURIComponent(p.id)}`, 'weekly', '0.7', day(p.updateTime),
          { loc: productImage(p.fields), title: str(p.fields.name), caption: [str(p.fields.name), ksh(price)].filter(Boolean).join(' · ') }));
      locs.push(`${SITE}/product/${encodeURIComponent(p.id)}`);
    }

    // YoteFeed clips. Each is a real page (/feed/:vid) carrying a video entry, so a clip
    // is eligible for Google video results instead of being invisible — the feed had no
    // URL at all before, so nothing in it could be crawled, shared or ranked.
    for (const c of feed) {
      const f = c.fields;
      const caption = str(f.caption);
      const seller = str(f.storeName) || 'a YoteMarket store';
      // Captions are merchant-written marketing copy (asterisks, emoji, line breaks).
      // A video title shows in search results, so flatten it and cut on a word boundary
      // rather than mid-word at exactly 100 chars.
      const flat = (caption || '').replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim();
      const title = (flat ? (flat.length > 100 ? `${flat.slice(0, 99).replace(/\s+\S*$/, '')}…` : flat)
        : `${seller} on YoteFeed`);
      // No clip carries a poster frame today (nothing generates one on upload), so fall
      // back to the tagged product's photo — it's what the clip is actually selling —
      // then the store's logo. Google drops a video entry that has no thumbnail at all.
      const thumb = str(f.posterUrl) || productImage(f.product?.mapValue?.fields || {}) ||
        str(f.storeLogo) || storeImage(storeById.get(str(f.storeId))?.fields || {});
      const desc = (caption || `A short video from ${seller} on YoteMarket — watch it and buy what is in it.`).slice(0, 2048);
      urls.push(url(`/feed/${encodeURIComponent(c.id)}`, 'weekly', '0.6', day(c.updateTime),
          thumb ? { loc: thumb, title, caption: desc } : null,
          { thumb, content: str(f.videoUrl), title, description: desc, publication: c.updateTime || null }));
      locs.push(`${SITE}/feed/${encodeURIComponent(c.id)}`);
    }

    note = `${live.length} stores + ${listable.length} products + ${feed.length} feed clips`;
    if (totalProducts !== listable.length) note += ` (skipped ${totalProducts - listable.length} on suspended/unknown stores)`;
    if (totalFeed !== feed.length) note += ` (skipped ${totalFeed - feed.length} non-live clips)`;
  } catch (err) {
    // Never break a deploy over a sitemap.
    console.warn(`[sitemap] could not read the catalogue (${err.message}) — writing static pages only.`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urls.join('\n')}\n</urlset>\n`;
  writeFileSync(OUT, xml);
  console.log(`[sitemap] ${urls.length} urls → public/sitemap.xml (${note})`);
  await submitIndexNow(locs);
}

main();
