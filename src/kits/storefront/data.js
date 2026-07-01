/* data.js — Storefront content. LIVE-ONLY: the catalog is served from Firestore
   (categories / stores / products) via applyCatalog(); there is no demo mall.
   Category chips remain canonical from categories.js so the chip row matches the
   "All categories" mega-menu. */

import { CATEGORY_CHIPS } from './categories.js';

// Category chips come from the single taxonomy source (categories.js).
export let YM_CATEGORIES = CATEGORY_CHIPS;

// Live-only: populated at runtime from Firestore by applyCatalog(). Empty until then.
export let YM_STORES = [];
export let YM_PRODUCTS = [];
export let YM_ORDERS = [];
export let YM_USER = { name:'', first:'', email:'', phone:'', hub:'', initials:'' };
export let YM_POINTS = { balance:0, lifetime:0, tier:'', next:'', toNext:0, earnRate:100 };
export let YM_WALLET = { balance:0, tx:[] };
export let YM_ADDRESSES = [];

export function ymPrice(n){ return 'Ksh ' + Number(n || 0).toLocaleString('en-KE'); }
export function ymProduct(id){ return YM_PRODUCTS.find((p) => p.id === id); }
export function ymStore(id){ return YM_STORES.find((s) => s.id === id); }
export function ymCat(id){ return YM_CATEGORIES.find((c) => c.id === id); }

/* Swap demo arrays for real Firestore data. ESM live bindings mean any component
   that re-renders after this runs will read the real catalog. */
export function applyCatalog({ stores, products } = {}){
  // The category taxonomy is owned by categories.js (canonical CATEGORY_TREE);
  // only swap live stores + products so the chips/mega-menu stay aligned. Live-only:
  // apply whatever Firestore returns (even empty) — never fall back to demo.
  if (Array.isArray(stores)) YM_STORES = stores;
  if (Array.isArray(products)) YM_PRODUCTS = products;
}
export function applyUser(u){ if (u) YM_USER = { ...YM_USER, ...u }; }
export function applyOrders(orders){ if (Array.isArray(orders) && orders.length) YM_ORDERS = orders; }
