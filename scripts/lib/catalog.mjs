/* Shared read-only view of the live catalogue for build-time scripts.
 *
 * `stores` and `products` are world-readable (firestore.rules: `allow read: if true`),
 * so the Firestore REST API with the public web key is enough — no admin credentials in
 * the Vercel build. Extracted so generate-sitemap and prerender read the catalogue and
 * apply the "is this listable?" rule through ONE implementation: a page that the sitemap
 * advertises but the prerender skips (or vice versa) is a crawl error either way.
 */
export const SITE = 'https://yotemarket.co.ke';
const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID || 'yotemarket-app';
const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDXt0Rpw_Cll8RQ_BO0riSKb8q7oZWvgYY';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/** Page through a public Firestore collection. Returns [{ id, fields, updateTime }]. */
export async function fetchCollection(name) {
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
  } while (pageToken && out.length < 45000);
  return out;
}

// Firestore REST returns typed values ({ stringValue }, { arrayValue }, …).
export const str = (f) => (f && f.stringValue) || '';
export const num = (f) => (f && (f.integerValue != null ? Number(f.integerValue)
  : f.doubleValue != null ? Number(f.doubleValue) : null));
export const bool = (f) => !!(f && f.booleanValue);
export const productImage = (fields) => str(fields.img) || str(fields.imageUrl) || str(fields.photo) ||
  ((fields.images?.arrayValue?.values || []).map((v) => v.stringValue).find(Boolean) || '');
export const storeImage = (fields) => str(fields.logo) || str(fields.img) || str(fields.imageUrl) || '';
export const ksh = (n) => (n != null ? `KSh ${Number(n).toLocaleString('en-KE')}` : '');

/** The catalogue as it should be exposed to crawlers: live stores, and the products
 *  belonging to them. A suspended store is off the storefront, and a product whose store
 *  is suspended or missing renders an empty page — neither should be advertised. */
export async function fetchListable() {
  const [stores, products] = await Promise.all([fetchCollection('stores'), fetchCollection('products')]);
  const live = stores.filter((s) => s.fields.suspended?.booleanValue !== true);
  const byId = new Map(live.map((s) => [s.id, s]));
  const listable = products.filter((p) => {
    const sid = str(p.fields.storeId) || str(p.fields.store);
    return sid && byId.has(sid);
  });
  return { stores: live, products: listable, storeById: byId, totalProducts: products.length };
}
