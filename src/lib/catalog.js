// Catalog + order data access. Reads the world-readable Firestore collections
// (categories / stores / products) and the signed-in user's orders. All helpers
// no-op gracefully when the backend is absent so kits keep their bundled demo data.
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

const toArray = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

// The live Firestore catalog (shared with the Flutter apps) stores Material Symbol icon
// names + `storeId`/`catId`/`inStock` fields. The storefront UI speaks FontAwesome +
// `store`/`cat`/`stock`, so normalise here so real data renders identically to the demo.
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

const normProduct = (d) => ({
  id: d.id,
  name: d.name,
  price: Number(d.price) || 0,
  was: d.was != null ? Number(d.was) : undefined,
  store: d.storeId || d.store,
  cat: d.catId || d.cat,
  rating: d.rating != null ? Number(d.rating) : undefined,
  reviews: d.reviews,
  desc: d.desc,
  stock: d.inStock !== false && d.stock !== false,
  icon: faIcon(d.icon, 'fa-box'),
  img: d.img || d.imageUrl || d.photo || undefined,
});
const normStore = (d) => ({
  id: d.id,
  name: d.name,
  area: d.area,
  rating: d.rating != null ? Number(d.rating) : undefined,
  reviews: d.reviews,
  products: d.products,
  followers: d.followers,
  responds: d.responds,
  since: d.since,
  isHub: !!d.isHub,
  verified: !!d.verified,
  tagline: d.tagline,
  tint: d.tint || '#4f46e5',
  icon: faIcon(d.icon, 'fa-store'),
  img: d.img || d.imageUrl || undefined,
});
const normCat = (d) => ({
  id: d.id,
  label: d.label,
  tint: d.tint || '#7c3aed',
  icon: faIcon(d.icon, 'fa-tag'),
  order: d.order != null ? Number(d.order) : 99,
});

/** Fetch the public catalog once, normalised to the storefront UI shape.
 *  Returns null when unavailable/empty (→ kit keeps its bundled demo data). */
export async function fetchCatalog() {
  if (!firebaseEnabled || !db) return null;
  try {
    const [cats, stores, prods] = await Promise.all([
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'stores')),
      getDocs(collection(db, 'products')),
    ]);
    const products = toArray(prods).map(normProduct);
    const storeList = toArray(stores).map(normStore);
    const categories = toArray(cats).map(normCat).sort((a, b) => a.order - b.order);
    if (!products.length && !storeList.length) return null; // empty backend → demo
    return { categories, stores: storeList, products };
  } catch (err) {
    console.warn('[catalog] fetch failed — using demo data.', err);
    return null;
  }
}

/**
 * Fetch the catalog on mount and hand it to a kit-supplied `apply(data)` that swaps
 * the kit's live-binding demo arrays for real data. Returns a version counter the
 * caller can use to force a re-render once real data has landed.
 */
export function useCatalogSync(apply) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    fetchCatalog().then((data) => {
      if (active && data) {
        apply(data);
        setVersion((v) => v + 1);
      }
    });
    return () => {
      active = false;
    };
  }, [apply]);
  return version;
}

/** Live-subscribe to a buyer's orders. Returns an unsubscribe fn (no-op in demo mode). */
export function subscribeUserOrders(uid, cb) {
  if (!firebaseEnabled || !db || !uid || uid === 'guest') return () => {};
  try {
    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', uid),
      orderBy('updatedAt', 'desc'),
    );
    return onSnapshot(
      q,
      (snap) => cb(toArray(snap)),
      (err) => console.warn('[orders] subscription error', err),
    );
  } catch (err) {
    console.warn('[orders] subscribe failed', err);
    return () => {};
  }
}
