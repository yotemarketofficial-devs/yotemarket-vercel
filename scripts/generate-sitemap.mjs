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
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE = 'https://yotemarket.co.ke';
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
  ['/pricing', 'monthly', '0.8'],
  ['/about', 'monthly', '0.7'],
  ['/mobile', 'monthly', '0.7'],
  ['/rider', 'monthly', '0.7'],
  ['/marketers', 'monthly', '0.7'],
  ['/careers', 'weekly', '0.6'],
  ['/help', 'monthly', '0.6'],
  ['/contact', 'monthly', '0.5'],
  ['/terms', 'yearly', '0.3'],
  ['/privacy', 'yearly', '0.3'],
];

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/** Page through a public Firestore collection. Returns [{ id, fields }]. */
async function fetchCollection(name) {
  const out = [];
  let pageToken = '';
  do {
    const url = `${BASE}/${name}?key=${API_KEY}&pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    const data = await res.json();
    for (const d of data.documents || []) {
      out.push({ id: d.name.split('/').pop(), fields: d.fields || {}, updateTime: d.updateTime });
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken && out.length < 45000); // sitemaps cap at 50k urls
  return out;
}

// XML-escape text + attribute content. Critical for image URLs: Firebase Storage
// links carry `?alt=media&token=…`, and a raw `&` is invalid XML that breaks the
// whole sitemap. Also covers < > " ' in names/captions.
const xmlEsc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// Firestore REST returns typed values ({ stringValue }, { arrayValue }, …).
const str = (f) => (f && f.stringValue) || '';
const num = (f) => (f && (f.integerValue != null ? Number(f.integerValue) : f.doubleValue != null ? Number(f.doubleValue) : null));
// A product's cover photo: explicit img, else the first of the gallery.
const productImage = (fields) => str(fields.img) || str(fields.imageUrl) || str(fields.photo) ||
    ((fields.images?.arrayValue?.values || []).map((v) => v.stringValue).find(Boolean) || '');
// A store's picture: logo first (it's the avatar shoppers recognise), else the banner.
const storeImage = (fields) => str(fields.logo) || str(fields.img) || str(fields.imageUrl) || '';

// One <url>, optionally carrying a Google image-sitemap entry so product photos and
// store logos are discoverable in Google Images (SEO "more info" per URL).
const url = (loc, changefreq, priority, lastmod = today, image = null) => {
  const imgXml = image && image.loc && /^https?:\/\//.test(image.loc)
    ? `\n    <image:image>\n      <image:loc>${xmlEsc(image.loc)}</image:loc>` +
      (image.title ? `\n      <image:title>${xmlEsc(image.title)}</image:title>` : '') +
      (image.caption ? `\n      <image:caption>${xmlEsc(image.caption)}</image:caption>` : '') +
      `\n    </image:image>`
    : '';
  return `  <url>\n    <loc>${SITE}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
    `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>${imgXml}\n  </url>`;
};

const day = (iso) => (iso ? String(iso).slice(0, 10) : today);
const ksh = (n) => (n != null ? `KSh ${Number(n).toLocaleString('en-KE')}` : '');

async function main() {
  const urls = STATIC.map(([loc, f, p]) => url(loc, f, p));
  let note = 'marketing pages only';

  try {
    const [stores, products] = await Promise.all([fetchCollection('stores'), fetchCollection('products')]);

    // A suspended store is off the storefront — don't ask Google to index it.
    const live = stores.filter((s) => s.fields.suspended?.booleanValue !== true);
    const liveIds = new Set(live.map((s) => s.id));
    for (const s of live) {
      urls.push(url(`/store/${encodeURIComponent(s.id)}`, 'weekly', '0.8', day(s.updateTime),
          { loc: storeImage(s.fields), title: str(s.fields.name), caption: str(s.fields.tagline) || str(s.fields.area) }));
    }

    // Skip products whose store is suspended or missing — those pages render empty.
    const listable = products.filter((p) => {
      const sid = p.fields.storeId?.stringValue || p.fields.store?.stringValue;
      return sid && liveIds.has(sid);
    });
    for (const p of listable) {
      const price = num(p.fields.price);
      urls.push(url(`/product/${encodeURIComponent(p.id)}`, 'weekly', '0.7', day(p.updateTime),
          { loc: productImage(p.fields), title: str(p.fields.name), caption: [str(p.fields.name), ksh(price)].filter(Boolean).join(' · ') }));
    }

    note = `${live.length} stores + ${listable.length} products`;
    if (products.length !== listable.length) note += ` (skipped ${products.length - listable.length} on suspended/unknown stores)`;
  } catch (err) {
    // Never break a deploy over a sitemap.
    console.warn(`[sitemap] could not read the catalogue (${err.message}) — writing static pages only.`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`;
  writeFileSync(OUT, xml);
  console.log(`[sitemap] ${urls.length} urls → public/sitemap.xml (${note})`);
}

main();
