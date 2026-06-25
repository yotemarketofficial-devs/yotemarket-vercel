/* service.js — Staff console data layer. CONFIDENTIAL · internal staff only.
   Staff have no broad Firestore read access (rules are user-scoped), so every
   read/action goes through an Admin-SDK Cloud Function gated by the caller's
   `admin`/`moderator` custom claim. Each call degrades to the bundled demo data
   when the backend is unavailable or the function isn't deployed yet, so the
   console always renders. */
import { useEffect, useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions, firebaseEnabled } from '../../lib/firebase.js';
import { SCOUTS, PAYOUT_REQUESTS, APPLICANTS } from './data.js';

function call(name) {
  return async (data) => {
    if (!functions) throw new Error('Backend not configured');
    const res = await httpsCallable(functions, name)(data);
    return res.data;
  };
}

// ── Staff identity (Firebase custom claims: admin | moderator) ────────────────
/**
 * Resolves the signed-in user's staff claims. Returns
 * { user, loading, isStaff, role, refresh }.
 */
export function useStaffClaims() {
  const [state, setState] = useState({ user: null, loading: firebaseEnabled, isStaff: false, role: null });

  const evaluate = useCallback(async (force = false) => {
    const u = auth?.currentUser || null;
    if (!u) { setState({ user: null, loading: false, isStaff: false, role: null }); return; }
    try {
      const token = await u.getIdTokenResult(force);
      const c = token.claims || {};
      const isStaff = c.admin === true || c.moderator === true;
      setState({ user: u, loading: false, isStaff, role: c.admin ? 'admin' : (c.moderator ? 'moderator' : null) });
    } catch {
      setState({ user: u, loading: false, isStaff: false, role: null });
    }
  }, []);

  useEffect(() => {
    if (!firebaseEnabled || !auth) { setState({ user: null, loading: false, isStaff: false, role: null }); return undefined; }
    const unsub = auth.onAuthStateChanged(() => evaluate(false));
    return () => unsub();
  }, [evaluate]);

  return { ...state, refresh: () => evaluate(true) };
}

// ── Generic loader hook: fetch via `loader`, fall back to `fallback` ──────────
export function useStaffResource(loader, fallback, deps = []) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.resolve()
      .then(loader)
      .then((d) => { if (active && d != null) { setData(d); setLive(true); } })
      .catch(() => { if (active) setLive(false); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  return { data, loading, live, reload: () => setReloadKey((k) => k + 1) };
}

// ── Reads ─────────────────────────────────────────────────────────────────────
// These throw on backend failure (function not deployed / not staff / offline);
// useStaffResource then keeps the demo fallback and reports live=false. A real
// success with an empty list is a valid live result.
export async function fetchOverview() {
  const d = await call('staffOverview')();
  if (!d || !d.kpis) throw new Error('staffOverview: unexpected shape');
  return d;
}

export async function fetchMerchants(status = 'all') {
  const d = await call('staffListMerchants')({ status });
  if (!Array.isArray(d?.merchants)) throw new Error('staffListMerchants: unexpected shape');
  return d.merchants;
}

export async function fetchSubscriptions() {
  const d = await call('staffListSubscriptions')();
  if (!d || !Array.isArray(d.subscriptions)) throw new Error('staffListSubscriptions: unexpected shape');
  return d;
}

export async function fetchRuns() {
  const d = await call('staffListRuns')();
  if (!d || !Array.isArray(d.runs)) throw new Error('staffListRuns: unexpected shape');
  return d;
}

export async function fetchReports() {
  const d = await call('staffListReports')();
  return Array.isArray(d?.reports) ? d.reports : [];
}

export async function fetchTranscript(convId) {
  return call('getConversationTranscript')({ convId });
}

// ── Actions (staff-gated Cloud Functions) ────────────────────────────────────
/** action: 'verify' | 'unverify' | 'suspend' | 'reinstate' */
export async function setMerchantStatus(storeId, action) {
  return call('staffSetMerchantStatus')({ storeId, action });
}

/** status: 'active' | 'blocked' (existing deployed callable). */
export async function moderateConversation(convId, status, reason = '') {
  return call('setConversationStatus')({ convId, status, reason });
}

export async function resolveReport(reportId, action) {
  return call('staffResolveReport')({ reportId, action });
}

// Demo passthroughs (no backend domain yet) — kept here so screens import one place.
export const demo = { SCOUTS, PAYOUT_REQUESTS, APPLICANTS };
