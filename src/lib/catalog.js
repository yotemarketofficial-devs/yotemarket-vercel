// Catalog + order data access. Reads the world-readable Firestore collections
// (categories / stores / products) and the signed-in user's orders. Live-only:
// the storefront shows real Firestore data (empty states where there's none);
// no demo catalog fallback in production.
import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

const toArray = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

// The live Firestore catalog (shared with the Flutter apps) stores Material Symbol icon
// names + `storeId`/`catId`/`inStock` fields. The storefront UI speaks FontAwesome +
// `store`/`cat`, so normalise here so real data renders identically to the demo.
const MAT_FA = {
  grid_view: 'fa-border-all', smartphone: 'fa-mobile-screen-button', devices: 'fa-mobile-screen',
  laptop: 'fa-laptop', headphones: 'fa-headphones', speaker: 'fa-volume-high', bolt: 'fa-bolt',
  checkroom: 'fa-shirt', style: 'fa-shirt', apparel: 'fa-shirt', diamond: 'fa-gem',
  basket: 'fa-basket-shopping', shopping_basket: 'fa-basket-shopping', local_grocery_store: 'fa-basket-shopping',
  eco: 'fa-leaf', grass: 'fa-seedling', restaurant: 'fa-utensils', mug: 'fa-mug-hot', coffee: 'fa-mug-hot',
  table: 'fa-table', chair: 'fa-couch', weekend: 'fa-couch', bed: 'fa-bed', home: 'fa-house',
  spa: 'fa-spa', face: 'fa-wand-magic-sparkles', child_care: 'fa-shapes', toys: 'fa-shapes', stroller: 'fa-baby-carriage',
  store: 'fa-store', storefront: 'fa-store', shoe: 'fa-shoe-prints', jar: 'fa-jar', umbrella: 'fa-umbrella',
};
const faIcon = (name, fallback = 'fa-tag') => {
  if (!name) return fallback;
  const n = String(name);
  return n.startsWith('fa-') ? n : (MAT_FA[n] || fallback);
};

// Normalise a store/place location into { lat, lng }, tolerant of the shapes the
// catalog can carry: a plain { lat, lng }, a Firestore GeoPoint ({ latitude,
// longitude } / { _latitude, _longitude }), or top-level lat/lng fields. Returns
// undefined when there are no valid finite coordinates (so PlaceMap shows its
// placeholder instead of an empty map).
const normLoc = (v) => {
  if (!v || typeof v !== 'object') return undefined;
  const lat = Number(v.lat ?? v.latitude ?? v._latitude);
  const lng = Number(v.lng ?? v.lon ?? v.longitude ?? v._longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
};

const normProduct = (d) => ({
  id: d.id,
  name: d.name,
  price: Number(d.price) || 0,
  was: d.was != null ? Number(d.was) : undefined,
  negotiable: d.negotiable === true, // merchant marked "price negotiable" → shopper tag (default fixed)
  store: d.storeId || d.store,
  cat: d.catId || d.cat,
  sub: d.sub || d.subcat || d.subcategory || undefined, // subcategory tag → precise sub-filter
  rating: d.rating != null ? Number(d.rating) : undefined,
  reviews: d.reviews,
  desc: d.desc,
  // Availability vs. count are two different things, and they used to share one
  // name here (`stock` was a boolean). Now: `stock` is the COUNT — a number, or
  // null when the merchant doesn't track this item — and `inStock` is the
  // boolean the UI gates on. Deriving inStock from the count matters: the old
  // line read `d.stock !== false`, so a real count of 0 was `0 !== false` →
  // true → "In stock" on a sold-out product. Anything untracked sells freely,
  // exactly as it did before counts existed.
  stock: typeof d.stock === 'number' && Number.isFinite(d.stock) ? d.stock : null,
  inStock: d.inStock !== false && !(typeof d.stock === 'number' && d.stock <= 0),
  icon: faIcon(d.icon, 'fa-box'),
  img: d.img || d.imageUrl || d.photo || undefined,
  images: Array.isArray(d.images) ? d.images.filter(Boolean) : (d.img ? [d.img] : []),  // gallery (first = cover)
  createdAt: d.createdAt || null,   // Firestore Timestamp — powers "Latest products"
});
const normStore = (d) => ({
  id: d.id,
  name: d.name,
  ownerId: d.ownerId || null, // merchant uid — lets a shopper open a live chat thread
  suspended: !!d.suspended,   // staff-suspended stores are hidden from the storefront
  featured: !!d.featured,     // staff-picked flagship → storefront "Featured stores" circles
  topBrand: !!(d.topBrand || d.enterprise), // enterprise-subscription business → storefront "Top brands" rail (premium placement, set server-side on activation)
  cat: d.catId || d.cat || null, // category id (from signup) — powers category browse/filter
  sub: d.sub || d.subcat || d.subcategory || undefined, // optional store specialty subcategory
  area: d.area,
  address: d.address || undefined,                          // shown under the store map
  delivery: d.delivery || null,                             // delivery rules → checkout fee/free-over/offer
  autoDispatch: d.delivery ? d.delivery.autoDispatch !== false : true,
  location: normLoc(d.location || d.geo || d.coords ||      // { lat, lng } for StoreMap
    (d.lat != null || d.lng != null ? { lat: d.lat, lng: d.lng } : null)),
  rating: d.rating != null ? Number(d.rating) : undefined,
  reviews: d.reviews,
  products: d.products,
  followers: d.followers,
  responds: d.responds,
  since: d.since,
  createdAt: d.createdAt || null,   // Firestore Timestamp — powers the "New stores" rail
  isHub: !!d.isHub,
  verified: !!d.verified,
  tagline: d.tagline,
  socials: d.socials || null,  // { instagram, facebook, tiktok, x, youtube, whatsapp, website } — owner-set links
  hours: d.hours || null,      // opening hours by weekday → "Open now"/"Closed" (lib/hours.js)
  phone: d.phone || undefined,
  tint: d.tint || '#4f46e5',
  icon: faIcon(d.icon, 'fa-store'),
  img: d.img || d.imageUrl || undefined,   // cover photo (banner)
  logo: d.logo || undefined,               // store logo (avatar)
});
const normCat = (d) => ({
  id: d.id,
  label: d.label,
  tint: d.tint || '#7c3aed',
  icon: faIcon(d.icon, 'fa-tag'),
  order: d.order != null ? Number(d.order) : 99,
});

/** Fetch the public catalog once, normalised to the storefront UI shape. Live-only:
 *  returns the real data (even if empty). Returns null only on a hard fetch error. */
export async function fetchCatalog() {
  if (!firebaseEnabled || !db) return null;
  try {
    const [cats, stores, prods] = await Promise.all([
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'stores')),
      getDocs(collection(db, 'products')),
    ]);
    // Staff-suspended stores (and their products) are hidden from shoppers.
    const storeList = toArray(stores).map(normStore).filter((s) => !s.suspended);
    const liveIds = new Set(storeList.map((s) => s.id));
    const products = toArray(prods).map(normProduct).filter((p) => !p.store || liveIds.has(p.store));
    const categories = toArray(cats).map(normCat).sort((a, b) => a.order - b.order);
    return { categories, stores: storeList, products }; // live-only (may be empty)
  } catch (err) {
    console.warn('[catalog] fetch failed', err);
    return null;
  }
}

/**
 * LIVE-subscribe to the public catalog (categories/stores/products) and hand the
 * normalised shape to `cb(data)` on every change — so new/edited products, stores
 * and categories appear without a manual refresh. onSnapshot only re-reads CHANGED
 * docs after the first load, so this stays cheap at the current scale. Waits for all
 * three collections' first snapshot before the first emit (avoids a half-empty flash).
 * Returns an unsubscribe fn.
 */
export function subscribeCatalog(cb) {
  if (!firebaseEnabled || !db) { cb(null); return () => {}; }
  let cats = null; let stores = null; let prods = null;
  const emit = () => {
    if (cats === null || stores === null || prods === null) return; // wait for all three
    const storeList = stores.map(normStore).filter((s) => !s.suspended);
    const liveIds = new Set(storeList.map((s) => s.id));
    const products = prods.map(normProduct).filter((p) => !p.store || liveIds.has(p.store));
    const categories = cats.map(normCat).sort((a, b) => a.order - b.order);
    cb({ categories, stores: storeList, products });
  };
  const u1 = onSnapshot(collection(db, 'categories'), (s) => { cats = toArray(s); emit(); }, (e) => { console.warn('[catalog] categories', e); if (cats === null) cats = []; emit(); });
  const u2 = onSnapshot(collection(db, 'stores'), (s) => { stores = toArray(s); emit(); }, (e) => { console.warn('[catalog] stores', e); if (stores === null) stores = []; emit(); });
  const u3 = onSnapshot(collection(db, 'products'), (s) => { prods = toArray(s); emit(); }, (e) => { console.warn('[catalog] products', e); if (prods === null) prods = []; emit(); });
  return () => { u1(); u2(); u3(); };
}

/**
 * LIVE-sync the catalog into a kit-supplied `apply(data)` (swaps the kit's live-
 * binding arrays for real data) and bump a version counter so the caller re-renders
 * on every catalog change. `apply` is read through a ref so the subscription is set
 * up ONCE (a fresh `apply` each render won't churn the listeners).
 */
export function useCatalogSync(apply) {
  const [version, setVersion] = useState(0);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useEffect(() => subscribeCatalog((data) => {
    if (data) { applyRef.current(data); setVersion((v) => v + 1); }
  }), []);
  return version;
}

/** Live-subscribe to a buyer's orders. Returns an unsubscribe fn (no-op in demo mode).
 *  Equality-only query (no composite index needed) — sorted newest-first client-side. */
export function subscribeUserOrders(uid, cb) {
  if (!firebaseEnabled || !db || !uid || uid === 'guest') return () => {};
  try {
    const q = query(collection(db, 'orders'), where('buyerId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const rows = toArray(snap).sort((a, b) =>
          (b.updatedAt?.seconds || b.createdAt?.seconds || 0) - (a.updatedAt?.seconds || a.createdAt?.seconds || 0));
        cb(rows);
      },
      (err) => console.warn('[orders] subscription error', err),
    );
  } catch (err) {
    console.warn('[orders] subscribe failed', err);
    return () => {};
  }
}
