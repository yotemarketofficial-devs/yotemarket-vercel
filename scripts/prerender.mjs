/* Prerender a real HTML page for every live store and product.
 *
 * WHY: this is a client-rendered SPA. The routes /product/:pid and /store/:sid exist and
 * the sitemap advertises them, but a crawler that fetches one gets the boot splash — no
 * product name, no price, no image. So a shopper searching for something we actually sell
 * finds nothing of ours, and an AI answer has nothing to cite. Advertising a URL that
 * renders empty is worse than not advertising it.
 *
 * WHAT: after `vite build`, take the built index.html and write a copy per item with the
 * real title, description, canonical, social card, Product/Store JSON-LD and a <noscript>
 * body. The JS bundle is untouched, so a real visitor still gets the full SPA — the file
 * is just a better first paint for whoever (or whatever) fetches the URL.
 *
 * WHY IT WORKS ON VERCEL: vercel.json runs `{ "handle": "filesystem" }` BEFORE the SPA
 * catch-all, so dist/product/<id>.html is served at /product/<id> and only unmatched
 * paths fall through to index.html.
 *
 * Runs as `postbuild`. NEVER fails the build: if Firestore can't be reached the SPA
 * still ships exactly as before.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SITE, fetchListable, str, num, productImage, storeImage, ksh } from './lib/catalog.mjs';
// The same titles/descriptions RouteSeo sets after hydration, baked into the served HTML.
import { PAGES } from '../src/lib/seo-pages.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
// JSON-LD sits inside <script>, so the only real hazard is closing the tag early.
const jsonLd = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

/** Swap the head tags + noscript body of the built index.html for this page's own. */
function render(tpl, { title, description, url, image, schema, body, ogType = 'website' }) {
  let h = tpl;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  const meta = (attr, key, val) => {
    const re = new RegExp(`<meta ${attr}="${key}"[^>]*>`);
    const tag = `<meta ${attr}="${key}" content="${esc(val)}" />`;
    h = re.test(h) ? h.replace(re, tag) : h.replace('</head>', `  ${tag}\n  </head>`);
  };
  meta('name', 'description', description);
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:url', url);
  meta('property', 'og:type', ogType);
  meta('name', 'twitter:title', title);
  meta('name', 'twitter:description', description);
  if (image) { meta('property', 'og:image', image); meta('name', 'twitter:image', image); }
  h = h.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(url)}" />`);
  // Keep the site-wide Organization/WebSite graph AND add this page's entity.
  if (schema) h = h.replace('</head>', `  <script type="application/ld+json">${jsonLd(schema)}</script>\n  </head>`);
  h = h.replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>${body}</noscript>`);
  return h;
}

function write(rel, html) {
  const file = join(DIST, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

async function main() {
  const tplPath = join(DIST, 'index.html');
  if (!existsSync(tplPath)) { console.warn('[prerender] no dist/index.html — skipped'); return; }
  const tpl = readFileSync(tplPath, 'utf8');

  let cat;
  try {
    cat = await fetchListable();
  } catch (err) {
    console.warn(`[prerender] could not read the catalogue (${err.message}) — SPA ships unchanged.`);
    return;
  }

  const storeName = (id) => str(cat.storeById.get(id)?.fields.name) || 'a YoteMarket store';

  for (const s of cat.stores) {
    const f = s.fields;
    const name = str(f.name) || 'Store';
    const url = `${SITE}/store/${encodeURIComponent(s.id)}`;
    const img = storeImage(f);
    const where = [str(f.area), str(f.town)].filter(Boolean).join(', ');
    const desc = clip(str(f.tagline) || `Shop ${name} on YoteMarket${where ? ` — ${where}` : ''}. Chat with the seller, pay with M-Pesa and collect at your nearest pickup point.`, 155);
    const mine = cat.products.filter((p) => (str(p.fields.storeId) || str(p.fields.store)) === s.id);
    write(`store/${s.id}.html`, render(tpl, {
      title: clip(`${name} — shop online on YoteMarket`, 65),
      description: desc, url, image: img,
      schema: {
        '@context': 'https://schema.org', '@type': 'Store', '@id': `${url}#store`,
        name, url, ...(img ? { image: img } : {}), description: desc,
        ...(where ? { address: { '@type': 'PostalAddress', addressLocality: str(f.area) || str(f.town), addressCountry: 'KE' } } : {}),
        parentOrganization: { '@id': `${SITE}/#organization` },
        currenciesAccepted: 'KES', paymentAccepted: 'M-Pesa',
      },
      body: `<h1>${esc(name)}</h1><p>${esc(desc)}</p>` +
        (where ? `<p>${esc(where)}, Kenya</p>` : '') +
        (mine.length ? `<h2>Products from ${esc(name)}</h2><ul>` + mine.slice(0, 60).map((p) =>
          `<li><a href="/product/${encodeURIComponent(p.id)}">${esc(str(p.fields.name))}</a> — ${esc(ksh(num(p.fields.price)))}</li>`).join('') + '</ul>' : '') +
        `<p><a href="/storefront">Browse all stores on YoteMarket</a></p>`,
    }));
  }

  for (const p of cat.products) {
    const f = p.fields;
    const name = str(f.name) || 'Product';
    const sid = str(f.storeId) || str(f.store);
    const seller = storeName(sid);
    const url = `${SITE}/product/${encodeURIComponent(p.id)}`;
    const img = productImage(f);
    const price = num(f.price);
    const stock = f.stock?.integerValue != null ? Number(f.stock.integerValue) : null;
    const inStock = f.inStock?.booleanValue !== false && (stock == null || stock > 0);
    const desc = clip(str(f.desc) || `${name} from ${seller} on YoteMarket${price != null ? ` — ${ksh(price)}` : ''}. Pay with M-Pesa and collect at your nearest pickup point.`, 155);
    write(`product/${p.id}.html`, render(tpl, {
      title: clip(`${name}${price != null ? ` — ${ksh(price)}` : ''} | ${seller}`, 65),
      description: desc, url, image: img, ogType: 'product',
      schema: {
        '@context': 'https://schema.org', '@type': 'Product', '@id': `${url}#product`,
        name, ...(img ? { image: [img] } : {}), description: desc,
        ...(str(f.sku) ? { sku: str(f.sku) } : {}),
        ...(str(f.brand) ? { brand: { '@type': 'Brand', name: str(f.brand) } } : {}),
        ...(str(f.weightKg) || num(f.weightKg) ? { weight: { '@type': 'QuantitativeValue', value: num(f.weightKg), unitCode: 'KGM' } } : {}),
        ...(price != null ? {
          offers: {
            '@type': 'Offer', url, price: String(price), priceCurrency: 'KES',
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: seller, ...(sid ? { '@id': `${SITE}/store/${encodeURIComponent(sid)}#store` } : {}) },
            areaServed: { '@type': 'Country', name: 'Kenya' },
          },
        } : {}),
      },
      body: `<h1>${esc(name)}</h1>` +
        (price != null ? `<p><strong>${esc(ksh(price))}</strong> — ${inStock ? 'in stock' : 'out of stock'}</p>` : '') +
        `<p>${esc(desc)}</p>` +
        (sid ? `<p>Sold by <a href="/store/${encodeURIComponent(sid)}">${esc(seller)}</a> on YoteMarket.</p>` : '') +
        `<p><a href="/storefront">Shop more on YoteMarket</a> · <a href="/about">About YoteMarket</a></p>`,
    }));
  }

  // ── YoteFeed ────────────────────────────────────────────────────────────────
  // Clips had no URL at all until now, so nothing in the feed could be crawled,
  // shared or ranked — the whole video catalogue was invisible. Each live clip gets
  // a real page with VideoObject markup and a <video> element a crawler can see.
  for (const c of cat.feed) {
    const f = c.fields;
    const prod = f.product?.mapValue?.fields || {};
    const sid = str(f.storeId);
    const seller = str(f.storeName) || storeName(sid);
    const url = `${SITE}/feed/${encodeURIComponent(c.id)}`;
    const video = str(f.videoUrl);
    // Merchant captions carry marketing asterisks/emoji and line breaks — flatten
    // before using them as a title.
    const caption = str(f.caption).replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim();
    const thumb = str(f.posterUrl) || productImage(prod) || str(f.storeLogo) ||
      storeImage(cat.storeById.get(sid)?.fields || {});
    const pname = str(prod.name);
    const pprice = num(prod.price);
    const pid = str(prod.id) || str(f.productId);
    const title = clip(caption || `${seller} on YoteFeed`, 65);
    const desc = clip(caption || `A short video from ${seller} on YoteMarket — watch it and buy what is in it.`, 155);
    const uploaded = f.createdAt?.timestampValue || c.updateTime || null;
    write(`feed/${c.id}.html`, render(tpl, {
      title, description: desc, url, image: thumb, ogType: 'video.other',
      schema: {
        '@context': 'https://schema.org', '@type': 'VideoObject', '@id': `${url}#video`,
        name: title, description: desc, contentUrl: video, url,
        ...(thumb ? { thumbnailUrl: [thumb] } : {}),
        ...(uploaded ? { uploadDate: uploaded } : {}),
        isFamilyFriendly: true,
        publisher: { '@id': `${SITE}/#organization` },
        ...(sid ? { creator: { '@type': 'Organization', name: seller, '@id': `${SITE}/store/${encodeURIComponent(sid)}#store` } } : {}),
        ...(pname ? {
          about: {
            '@type': 'Product', name: pname,
            ...(pid ? { '@id': `${SITE}/product/${encodeURIComponent(pid)}#product` } : {}),
            ...(pprice != null ? { offers: { '@type': 'Offer', price: String(pprice), priceCurrency: 'KES', ...(pid ? { url: `${SITE}/product/${encodeURIComponent(pid)}` } : {}) } } : {}),
          },
        } : {}),
      },
      body: `<h1>${esc(title)}</h1>` +
        `<video controls preload="none" src="${esc(video)}"${thumb ? ` poster="${esc(thumb)}"` : ''}></video>` +
        `<p>${esc(desc)}</p>` +
        (sid ? `<p>Posted by <a href="/store/${encodeURIComponent(sid)}">${esc(seller)}</a> on YoteMarket.</p>` : '') +
        (pname && pid ? `<p>In this video: <a href="/product/${encodeURIComponent(pid)}">${esc(pname)}</a>${pprice != null ? ` — ${esc(ksh(pprice))}` : ''}</p>` : '') +
        `<p><a href="/feed">More shoppable video on YoteFeed</a> · <a href="/storefront">Shop YoteMarket</a></p>`,
    }));
  }

  // ── Static pages ────────────────────────────────────────────────────────────
  // Without these every marketing URL served index.html — same homepage <title> and,
  // worse, a canonical pointing at the homepage. That tells Google these pages ARE
  // the homepage while the sitemap asks for them to be indexed; the canonical wins.
  // Titles come from the SAME map RouteSeo uses, so served and rendered HTML agree.
  for (const [path, page] of Object.entries(PAGES)) {
    if (path === '/') continue; // dist/index.html already is the homepage
    write(`${path.replace(/^\//, '')}.html`, render(tpl, {
      title: page.title, description: page.description, url: `${SITE}${path}`,
      body: `<h1>${esc(page.title)}</h1><p>${esc(page.description)}</p>` +
        `<p><a href="/">YoteMarket</a> · <a href="/storefront">Shop</a> · <a href="/feed">YoteFeed</a> · <a href="/help">Help</a></p>`,
    }));
  }

  console.log(`[prerender] ${cat.stores.length} stores + ${cat.products.length} products + ${cat.feed.length} feed clips + ${Object.keys(PAGES).length - 1} static → dist/*.html`);
}

main().catch((e) => console.warn(`[prerender] skipped (${e.message})`));
