// merchantAccess.js — "does this signed-in shopper also run a store?"
// Reads the same two docs the dashboard gate reads (MerchantGate.jsx): merchants/{uid}
// for owners, store_staff/{uid} for employees. Both are owner-readable per
// firestore.rules, so the storefront can offer a direct way into the store without a
// callable round-trip. Live listeners, so the link appears the moment a shopper
// finishes store signup in another tab.
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

const NONE = { isMerchant: false, role: null, storeId: null, storeName: '', href: '/dashboard' };

/** Where this role actually works: cashiers live in the POS terminal (the dashboard
 *  gate bounces them there anyway), owners and managers in the store dashboard. */
const hrefFor = (role) => (role === 'cashier' ? '/pos' : '/dashboard');

/**
 * Live merchant access for a signed-in user.
 * -> { isMerchant, role:'owner'|'manager'|'cashier'|null, storeId, storeName, href }
 * Shoppers with no store (and demo mode, where there's nothing to read) get isMerchant:false.
 */
export function useMerchantAccess(user) {
  const uid = user && !user.isGuest ? user.uid : null;
  const [owner, setOwner] = useState(null);   // merchants/{uid}
  const [staff, setStaff] = useState(null);   // store_staff/{uid}

  useEffect(() => {
    if (!firebaseEnabled || !db || !uid) { setOwner(null); setStaff(null); return undefined; }
    const u1 = onSnapshot(doc(db, 'merchants', uid), (s) => setOwner(s.exists() ? s.data() : null), () => setOwner(null));
    const u2 = onSnapshot(doc(db, 'store_staff', uid), (s) => setStaff(s.exists() ? s.data() : null), () => setStaff(null));
    return () => { u1(); u2(); };
  }, [uid]);

  if (owner && owner.storeId) {
    return { isMerchant: true, role: 'owner', storeId: owner.storeId, storeName: owner.name || '', href: hrefFor('owner') };
  }
  if (staff && staff.storeId && (staff.status || 'active') === 'active') {
    const role = staff.role === 'manager' ? 'manager' : 'cashier';
    return { isMerchant: true, role, storeId: staff.storeId, storeName: '', href: hrefFor(role) };
  }
  return NONE;
}
