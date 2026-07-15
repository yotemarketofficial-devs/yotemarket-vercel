/* merchant.jsx — live merchant context for the dashboard.
   Streams the signed-in merchant's account + store + subscription and loads
   their products/orders, exposing SHOP/SUBSCRIPTION-shaped views with graceful
   fallback to the bundled demo data (so demo mode / no-backend is unchanged). */
import React from 'react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../lib/useAuth.jsx';
import { db, firebaseEnabled } from '../../lib/firebase.js';
import { tierRank, tierName, canRank } from '../../lib/entitlements.js';
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
  const [staff, setStaff] = useState(null);        // store_staff/{uid} when the user is an employee
  const [sub, setSub] = useState(null);
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState(null);
  const [orders, setOrders] = useState(null);

  // merchant account + subscription + store-team membership (all live)
  useEffect(() => {
    if (!firebaseEnabled || !db || !uid) return undefined;
    const u1 = onSnapshot(doc(db, 'merchants', uid), (s) => setMerchant(s.exists() ? s.data() : null), () => {});
    const u2 = onSnapshot(doc(db, 'subscriptions', uid), (s) => setSub(s.exists() ? s.data() : null), () => {});
    const u3 = onSnapshot(doc(db, 'store_staff', uid), (s) => setStaff(s.exists() && (s.data().status || 'active') === 'active' ? s.data() : null), () => setStaff(null));
    return () => { u1(); u2(); u3(); };
  }, [uid]);

  // Owner (has a merchants doc) OR employee (store_staff) — resolve the store + role.
  const storeId = merchant?.storeId || staff?.storeId || null;
  const role = merchant?.storeId ? 'owner' : (staff ? (staff.role === 'manager' ? 'manager' : 'cashier') : null);
  useEffect(() => {
    if (!firebaseEnabled || !db || !storeId) { setStore(null); setProducts(null); setOrders(null); return undefined; }
    const u = onSnapshot(doc(db, 'stores', storeId), (s) => setStore(s.exists() ? { id: s.id, ...s.data() } : null), () => {});
    const up = onSnapshot(query(collection(db, 'products'), where('storeId', '==', storeId)),
      (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setProducts([]));
    const uo = onSnapshot(query(collection(db, 'orders'), where('storeId', '==', storeId)),
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setOrders([]));
    return () => { u(); up(); uo(); };
  }, [storeId]);

  // "live" = a real backend is configured. Demo/mock data is used ONLY when there
  // is no backend at all; with Firebase on, the dashboard is live-data-only (real
  // figures, empty states while loading — never fake products/orders).
  const live = Boolean(firebaseEnabled);

  const value = useMemo(() => ({ live, uid, displayName, merchant, staff, role, storeId, sub, store, products, orders }), [live, uid, displayName, merchant, staff, role, storeId, sub, store, products, orders]);
  return <MerchantCtx.Provider value={value}>{children}</MerchantCtx.Provider>;
}

export function useMerchant() {
  return useContext(MerchantCtx) || { live: false };
}

/**
 * Feature entitlements for the signed-in merchant → { rank, tier, plan, can }.
 * Entitlements are a property of the STORE's plan, but the subscription doc is
 * keyed by the OWNER's uid — an employee's own uid has no sub, so we don't gate
 * employees here (their role-nav already limits them; treat them as entitled).
 * Demo/no-backend mode is fully unlocked (it's a showcase). Server-side
 * enforcement + store-tier denormalization for true multi-seat is the follow-up.
 */
export function useEntitlements() {
  const { live, sub, store, role } = useMerchant();
  if (!live) return { live: false, plan: null, rank: 3, tier: 'Pro', can: () => true };
  // Authoritative: the server (onSubscriptionTierChange) denormalizes the store's
  // tier onto stores/{id}.planTier — works for owner AND employees. Fall back to
  // the owner's own subscription only before denormalization has run (fresh
  // deploy / pre-backfill); employees pass through in that window.
  let rank;
  if (store && typeof store.planTier === 'number') rank = store.planTier;
  else rank = role === 'owner' ? tierRank(sub) : 3;
  return {
    live: true,
    plan: (store && store.planName) || (sub && sub.plan) || null,
    rank,
    tier: tierName(rank),
    can: (f) => canRank(rank, f),
  };
}

/** SHOP-shaped store/owner identity (live or demo fallback). */
export function useShop() {
  const { live, store, merchant, displayName } = useMerchant();
  if (!live) return SHOP; // demo mode only (no backend)
  const s = store || {};
  const name = s.name || merchant?.name || 'My store';
  const owner = displayName || merchant?.name || name;
  return {
    name,
    owner,
    first: (owner || name).split(/\s+/)[0],
    role: 'Merchant',
    shopId: s.id || '',
    area: s.area || '',
    tagline: s.tagline || '',
    socials: s.socials || null,
    followers: s.followers || 0,
    location: s.location || null,
    address: s.address || '',
    plan: '',
    photo: null,
    logo: s.logo || null, // store logo (denormalised on the store doc) for POS/branding
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
      icon: faIcon(p.icon), tint: '#7c3aed', sku: p.sku || null,
      // raw fields carried through for the edit modal:
      catId: p.catId || null, sub: p.sub || '', desc: p.desc || '',
      was: p.was != null ? Number(p.was) : null, inStock: p.inStock !== false,
      img: p.img || null, images: Array.isArray(p.images) ? p.images.filter(Boolean) : (p.img ? [p.img] : []),
    }));
    const orderRows = os.map((o) => ({
      id: o.id, orderNo: o.orderNo || null, buyer: o.buyerName || 'Customer', avatar: 'avatar-1.png',
      items: Array.isArray(o.items) ? `${o.items.length} item${o.items.length !== 1 ? 's' : ''}` : '—',
      total: Number(o.total) || 0, status: o.status === 'delivered' ? 'active' : (o.status === 'cancelled' ? 'inactive' : 'pending'),
      rawStatus: o.status, // real custody status for the handover column
      fulfillment: o.fulfillment || 'hub',
      awaitingDecision: !!o.awaitingDecision && o.paid === true, // held for merchant delivery decision
      paid: o.paid === true,
      date: o.placed || (o.createdAt ? fmtTs(o.createdAt) : ''), hub: o.fulfillment === 'store_pickup' ? 'Store pickup' : (o.hub || '—'),
      raw: o,
    }));

    return { live: true, kpis, week, products: prodRows, orders: orderRows };
  }, [live, merchant, products, orders]);
}
