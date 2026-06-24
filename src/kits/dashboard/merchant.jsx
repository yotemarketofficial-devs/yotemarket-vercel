/* merchant.jsx — live merchant context for the dashboard.
   Streams the signed-in merchant's account + store + subscription and loads
   their products/orders, exposing SHOP/SUBSCRIPTION-shaped views with graceful
   fallback to the bundled demo data (so demo mode / no-backend is unchanged). */
import React from 'react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../lib/useAuth.jsx';
import { db, firebaseEnabled } from '../../lib/firebase.js';
import { SHOP, SUBSCRIPTION, KPIS, WEEK, PROD_ROWS, ORDER_ROWS, ksh } from './data.js';
const { createContext, useContext, useEffect, useState, useMemo } = React;

const MerchantCtx = createContext(null);

const faIcon = (name, fallback = 'fa-box') => {
  if (!name) return fallback;
  const n = String(name);
  if (n.startsWith('fa-')) return n;
  const MAP = { smartphone: 'fa-mobile-screen-button', devices: 'fa-mobile-screen', checkroom: 'fa-shirt', eco: 'fa-leaf', chair: 'fa-couch', spa: 'fa-spa', toys: 'fa-shapes', store: 'fa-store' };
  return MAP[n] || fallback;
};
const initialsOf = (s) => (s || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const fmtTs = (ts) => { try { return new Date((ts.seconds || ts._seconds) * 1000).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

export function MerchantProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const displayName = user?.displayName || '';
  const [merchant, setMerchant] = useState(null);
  const [sub, setSub] = useState(null);
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState(null);
  const [orders, setOrders] = useState(null);

  // merchant account + subscription (live)
  useEffect(() => {
    if (!firebaseEnabled || !db || !uid) return undefined;
    const u1 = onSnapshot(doc(db, 'merchants', uid), (s) => setMerchant(s.exists() ? s.data() : null), () => {});
    const u2 = onSnapshot(doc(db, 'subscriptions', uid), (s) => setSub(s.exists() ? s.data() : null), () => {});
    return () => { u1(); u2(); };
  }, [uid]);

  // store doc (live) + the store's products/orders (one-shot)
  const storeId = merchant?.storeId;
  useEffect(() => {
    if (!firebaseEnabled || !db || !storeId) { setStore(null); setProducts(null); setOrders(null); return undefined; }
    const u = onSnapshot(doc(db, 'stores', storeId), (s) => setStore(s.exists() ? { id: s.id, ...s.data() } : null), () => {});
    getDocs(query(collection(db, 'products'), where('storeId', '==', storeId)))
      .then((snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setProducts([]));
    getDocs(query(collection(db, 'orders'), where('storeId', '==', storeId)))
      .then((snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setOrders([]));
    return () => u();
  }, [storeId]);

  const live = Boolean(firebaseEnabled && merchant && store);

  const value = useMemo(() => ({ live, uid, displayName, merchant, sub, store, products, orders }), [live, uid, displayName, merchant, sub, store, products, orders]);
  return <MerchantCtx.Provider value={value}>{children}</MerchantCtx.Provider>;
}

export function useMerchant() {
  return useContext(MerchantCtx) || { live: false };
}

/** SHOP-shaped store/owner identity (live or demo fallback). */
export function useShop() {
  const { live, store, merchant, displayName } = useMerchant();
  if (!live || !store) return SHOP;
  const name = store.name || merchant?.name || 'My store';
  const owner = displayName || merchant?.name || name;
  return {
    name,
    owner,
    first: (owner || name).split(/\s+/)[0],
    role: 'Merchant',
    shopId: store.id,
    area: store.area || '',
    plan: '',
    photo: null,
    initials: initialsOf(owner || name),
  };
}

/** Sidebar subscription card view (live or demo fallback). */
export function useSubCard() {
  const { live, sub } = useMerchant();
  if (!live) return { ...SUBSCRIPTION, kind: 'delivery', range: '', next: SUBSCRIPTION.next, active: true };
  if (sub && sub.status === 'active') {
    return { plan: sub.plan, kind: sub.kind || 'delivery', range: sub.range || '', price: sub.price || 0, deliveriesUsed: sub.deliveriesUsed || 0, deliveriesCap: sub.deliveriesCap || 0, next: sub.renewsAt ? fmtTs(sub.renewsAt) : '—', active: true };
  }
  return { plan: 'No active plan', kind: 'delivery', range: '', price: 0, deliveriesUsed: 0, deliveriesCap: 0, next: '—', active: false };
}

/** Overview data: KPI cards, weekly buckets, product + order tables. */
export function useStoreOverview() {
  const { live, merchant, products, orders } = useMerchant();
  return useMemo(() => {
    if (!live) return { live: false, kpis: KPIS, week: WEEK, products: PROD_ROWS, orders: ORDER_ROWS };

    const os = orders || [];
    const completed = os.filter((o) => o.status === 'delivered').length;
    const pending = os.length - completed;
    const earned = (merchant?.balanceAvailable || 0) + (merchant?.balancePending || 0) + (merchant?.balanceProcessing || 0) + (merchant?.balanceWithdrawn || 0);
    const kpis = [
      { label: 'Total orders', value: String(os.length), icon: 'fa-bag-shopping', tone: '#3b82f6' },
      { label: 'Pending', value: String(pending), icon: 'fa-clock', tone: '#f59e0b' },
      { label: 'Completed', value: String(completed), icon: 'fa-circle-check', tone: '#10b981' },
      { label: 'Revenue', value: ksh(earned), icon: 'fa-coins', tone: '#7c3aed' },
    ];

    // weekday buckets (Mon→Sun) from order createdAt
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    os.forEach((o) => { const ms = (o.createdAt?.seconds || o.createdAt?._seconds); if (ms) counts[new Date(ms * 1000).getDay()] += 1; });
    const week = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ l: days[d], v: counts[d] }));

    const prodRows = (products || []).map((p) => ({
      id: p.id, name: p.name || 'Unnamed', cat: p.catId || '—', price: Number(p.price) || 0,
      stock: p.inStock === false ? 0 : (typeof p.stock === 'number' ? p.stock : 1),
      sales: p.sales || 0, status: p.inStock === false ? 'inactive' : 'active',
      icon: faIcon(p.icon), tint: '#7c3aed',
    }));
    const orderRows = os.map((o) => ({
      id: o.id, buyer: o.buyerName || 'Customer', avatar: 'avatar-1.png',
      items: Array.isArray(o.items) ? `${o.items.length} item${o.items.length !== 1 ? 's' : ''}` : '—',
      total: Number(o.total) || 0, status: o.status === 'delivered' ? 'active' : 'pending',
      date: o.placed || (o.createdAt ? fmtTs(o.createdAt) : ''), hub: o.hub || '—',
    }));

    return { live: true, kpis, week, products: prodRows, orders: orderRows };
  }, [live, merchant, products, orders]);
}
