/* service.js — Staff console data layer. CONFIDENTIAL · internal staff only.
   Staff have no broad Firestore read access (rules are user-scoped), so every
   read/action goes through an Admin-SDK Cloud Function gated by the caller's
   `admin`/`moderator` custom claim. Each call degrades to the bundled demo data
   when the backend is unavailable or the function isn't deployed yet, so the
   console always renders. */
import { useEffect, useState, useCallback, useRef } from 'react';
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
// Founding owners get admin by verified email so the first admin needs no
// claim bootstrap (mirrors the server-side OWNER_EMAILS in functions/index.js).
const OWNER_EMAILS = ['007arnogichuche@gmail.com', 'yotemarketofficial@gmail.com'];

/**
 * Resolves the signed-in user's staff access. Returns
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
      const owner = u.emailVerified && OWNER_EMAILS.includes(String(u.email || '').toLowerCase());
      const isStaff = c.admin === true || c.moderator === true || owner;
      const role = (c.admin === true || owner) ? 'admin' : (c.moderator === true ? 'moderator' : null);
      setState({ user: u, loading: false, isStaff, role });
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

/** Same shape, no values — [] / {} / 0 / ''. Lets a failed load render each screen's
 *  real empty state instead of inventing numbers. */
function emptyLike(v) {
  if (Array.isArray(v)) return [];
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = emptyLike(x);
    return out;
  }
  if (typeof v === 'number') return 0;
  if (typeof v === 'string') return '';
  return v;
}

// ── Generic loader hook: fetch via `loader`, fall back to `fallback` ──────────
// Staff reads are callable-based (no onSnapshot possible), so "real-time" here is
// a silent background auto-refresh: it re-fetches on an interval while the tab is
// visible and the moment the window/tab regains focus. A JSON change-guard means
// a poll that finds no change causes no re-render — the table never flickers or
// loses sort/scroll while a staffer reads it. `loading` only flips on the initial
// load, a deps change, or a manual reload — never on a background poll.
//
// ⚠️ NEVER SHOW FAKE DATA IN A LIVE CONSOLE. `fallback` is DEMO data — it renders
// only when there is no backend at all (local/preview, firebaseEnabled=false).
// When a backend IS configured and the load fails, we blank to the same shape and
// expose `error`, so staff see an honest empty state + error rather than plausible
// invented figures they might act on. Background-poll failures are swallowed on
// purpose so a blip never wipes data a staffer is reading.
export function useStaffResource(loader, fallback, deps = [], { pollMs = 20000 } = {}) {
  const demoOk = !firebaseEnabled;
  const blank = useRef(demoOk ? fallback : emptyLike(fallback)).current;
  const [data, setData] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const lastJson = useRef(null);

  // Apply a fresh result, but only re-render when the payload actually changed.
  const apply = useCallback((d) => {
    if (d == null) return;
    let j; try { j = JSON.stringify(d); } catch { j = null; }
    if (j == null || j !== lastJson.current) { lastJson.current = j; setData(d); }
    setLive(true); setError(null);
  }, []);

  // Initial load / manual reload / deps change — shows the loading state.
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.resolve()
      .then(() => loaderRef.current())
      .then((d) => { if (active) apply(d); })
      .catch((e) => {
        if (!active) return;
        setLive(false);
        // Backend exists but the read failed → blank it. Better an honest empty
        // console than fabricated figures wearing a "sample" label.
        if (!demoOk) { lastJson.current = null; setData(blank); setError(e && e.message ? e.message : 'Could not reach the backend.'); }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  // Silent background refresh — poll while visible + refetch on focus/visibility
  // regain. Never toggles `loading`; the change-guard suppresses no-op renders.
  useEffect(() => {
    if (!pollMs) return undefined;
    let active = true;
    const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const refresh = () => {
      if (hidden()) return;
      Promise.resolve().then(() => loaderRef.current()).then((d) => { if (active) apply(d); }).catch(() => {});
    };
    const id = setInterval(refresh, pollMs);
    const onVis = () => { if (!hidden()) refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      active = false; clearInterval(id);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, pollMs, apply]);

  return { data, loading, live, error, demo: demoOk, reload: () => setReloadKey((k) => k + 1) };
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

/** Staff/hub: recompute optimized routes (nearest-neighbour + ETA/payout) for open
 *  runs, optionally scoped to a hub → { runs, updated }. */
export async function optimizeRuns(hubId) {
  return call('optimizeRuns')(hubId ? { hubId } : {});
}

export async function fetchReports() {
  const d = await call('staffListReports')();
  return Array.isArray(d?.reports) ? d.reports : [];
}

export async function fetchTranscript(convId) {
  return call('getConversationTranscript')({ convId });
}

// ── Actions (staff-gated Cloud Functions) ────────────────────────────────────
/** action: 'verify' | 'unverify' | 'suspend' | 'reinstate' | 'feature' | 'unfeature'
 *          | 'topbrand' | 'untopbrand' (manual Top-brand placement) */
export async function setMerchantStatus(storeId, action) {
  return call('staffSetMerchantStatus')({ storeId, action });
}
/** Maintenance: permanently delete every suspended store (incl. temporarily suspended).
 *  Returns { ok, count, purged:[{id,name}] }. */
export async function purgeSuspendedStores() {
  return call('staffPurgeSuspendedStores')({});
}

/** Full merchant/store dossier for the console detail view (profile, owner, stats,
 *  subscription, balance, recent products/orders/withdrawals, closure, notes). */
export async function fetchMerchantDetail(storeId) {
  return call('staffMerchantDetail')({ storeId });
}

/** Add an internal staff note to a merchant/user. entity: 'merchant' | 'user'. */
export async function addStaffNote(entity, entityId, text) {
  return call('staffAddNote')({ entity, entityId, text });
}

/** Full account dossier for the user-admin console (profile, roles, auth, store,
 *  subscription, wallet, order stats, tickets, notes). */
export async function fetchUserDetail(uid) {
  return call('staffUserDetail')({ uid });
}

/** Admin: disable / re-enable a user's sign-in (needs Auth-admin on the SA). */
export async function setUserDisabled(uid, disabled) {
  return call('staffSetUserDisabled')({ uid, disabled });
}

/** Admin: fix a wrong role — reset a user to a plain shopper (strips merchant/rider
 *  identity). Refused while they still run a live store. { ok, role }. */
export async function setUserRole(uid, role) {
  return call('staffSetUserRole')({ uid, role });
}

/** Staff: generate a password-reset link to send the customer → { email, link }. */
export async function sendPasswordReset(uid) {
  return call('staffSendPasswordReset')({ uid });
}

/** Admin: force sign-out (revoke all refresh tokens) on a user. */
export async function revokeUserSessions(uid) {
  return call('staffRevokeSessions')({ uid });
}

/** Enterprise unit-economics rate card (price per package + per km, per delivery
 *  sub-tier) and — when subTier+packages are supplied — a live monthly quote. */
export async function enterpriseQuote(args = {}) {
  const d = await call('staffEnterpriseQuote')(args);
  if (!d || !Array.isArray(d.rateCard)) throw new Error('staffEnterpriseQuote: unexpected shape');
  return d;
}

/** Activate/deactivate Enterprise for a store. When `subTier`+`packages` are given
 *  the server derives the monthly price from price-per-package-per-km; a raw `price`
 *  overrides. opts: { subTier, packages, discountPct, price, deliveriesCap, months, note } */
export async function setEnterprise(storeId, on, opts = {}) {
  return call('staffSetEnterprise')({ storeId, on, ...opts });
}

/** ADMIN one-off: delete the seeded non-Google test accounts + their footprint. */
export async function cleanupSeededTestAccounts() {
  return call('cleanupSeededTestAccounts')();
}

/** ADMIN: reverse sandbox test credits — `{}` purges platform-wide, `{email}` or
 *  `{uid}` targets one merchant. Idempotent. → { merchants, removed, amount, shortfall }.
 *  (The tool that MINTED test credits was removed — nothing may create money.) */
export async function staffRemoveTestCredits(args = {}) {
  return call('staffRemoveTestCredits')(args);
}

// ── Deletions (data protection / right to erasure) ────────────────────────────
// Only PERSONAL-data records are deletable. Financial + accountability records
// (orders, ledger, receipts, settlements, disputes, audit log) have no delete by
// design — erasing them would destroy the money trail. All admin-only + audited.
/** ADMIN: erase a job application (candidate PII). */
export async function deleteJobApplication(id) { return call('staffDeleteJobApplication')({ id }); }
/** ADMIN: erase a rider application (applicant PII). */
export async function deleteRiderApplication(id) { return call('staffDeleteRiderApplication')({ id }); }
/** ADMIN: erase a support ticket (may carry personal details). */
export async function deleteSupportTicket(id) { return call('staffDeleteSupportTicket')({ id }); }
/** ADMIN: delete a user account + their personal data. Guarded server-side against
 *  deleting yourself, active staff, store owners, funded wallets or open orders. */
export async function deleteUserAccount(uid) { return call('staffDeleteUser')({ uid }); }

/** status: 'active' | 'blocked' (existing deployed callable). */
export async function moderateConversation(convId, status, reason = '') {
  return call('setConversationStatus')({ convId, status, reason });
}

export async function resolveReport(reportId, action) {
  return call('staffResolveReport')({ reportId, action });
}

// ── Review moderation (verified-purchase reviews; fraud/abuse triage) ─────────
export async function fetchReviewReports() {
  const d = await call('staffListReviewReports')();
  return Array.isArray(d?.reports) ? d.reports : [];
}

/** Remove a fraudulent/abusive review and correct rating aggregates. */
export async function removeReview(reviewId, reason = 'removed by staff') {
  return call('staffRemoveReview')({ reviewId, reason });
}

/** Dismiss a report, keeping the review (judged legitimate). */
export async function dismissReviewReport(reportId) {
  return call('staffResolveReviewReport')({ reportId, action: 'dismissed' });
}

/** Admin-only: grant/revoke a staff role by email. role: 'admin'|'moderator'|'none'. */
export async function setStaffRole(email, role) {
  return call('staffSetRole')({ email, role });
}

// ── Marketer program (scouts) ─────────────────────────────────────────────────
export async function fetchMarketers() {
  const d = await call('staffListMarketers')();
  if (!d || !Array.isArray(d.applicants) || !Array.isArray(d.scouts)) {
    throw new Error('staffListMarketers: unexpected shape');
  }
  return d;
}
/** stage: 'New'|'Review'|'Shortlist'|'Interview'|'active'|'rejected' */
export async function setMarketerStage(uid, stage) {
  return call('staffSetMarketerStage')({ uid, stage });
}
/** Permanent-role track for an ALREADY-ACTIVE scout, judged on performance.
 *  hireStage: 'Scout'|'Review'|'Shortlist'|'Interview'|'Hired' */
export async function setMarketerHireStage(uid, hireStage) {
  return call('staffSetMarketerHireStage')({ uid, hireStage });
}
export async function fetchPayouts() {
  const d = await call('staffListPayouts')();
  if (!d || !Array.isArray(d.requests)) throw new Error('staffListPayouts: unexpected shape');
  return d.requests;
}
/** action: 'approve' | 'hold' */
export async function resolvePayout(id, action) {
  return call('staffResolvePayout')({ id, action });
}

// ── Merchant-follow social proofs (scout task verification) ───────────────────
/** Queue of submitted "merchant follows us" proofs awaiting staff verification. */
export async function fetchMerchantFollows() {
  const d = await call('staffListMerchantFollows')();
  return Array.isArray(d?.items) ? d.items : [];
}
/** Approve (credit the scout) or reject a follow proof, with an audit reason. */
export async function resolveMerchantFollow(id, approve, reason = '') {
  return call('staffResolveMerchantFollow')({ id, approve, reason });
}
/** Admin cutover: snapshot each active scout's earned floor before the switch
 *  to activation-based pay (raise-only, safe to re-run). */
export async function snapshotScoutFloors() {
  return call('staffSnapshotScoutFloors')();
}

// ── Store-closure requests (merchant asks to close → staff approve/reject) ─────
/** All store-closure requests (pending first in the UI). */
export async function fetchDeletionRequests() {
  const d = await call('staffListDeletionRequests')();
  return Array.isArray(d?.requests) ? d.requests : [];
}
/** Approve (closes the store + merchant account) or reject a closure request. */
export async function resolveDeletionRequest(id, approve, note = '') {
  return call('staffResolveDeletionRequest')({ id, approve, note });
}

// ── Audit log (who did what across the staff mutations) ───────────────────────
/** Recent staff actions, newest first. Throws until staffListAuditLog is deployed
 *  so the screen can show a "activates after next deploy" state. */
export async function fetchAuditLog(limit = 200) {
  const d = await call('staffListAuditLog')({ limit });
  if (!d || !Array.isArray(d.events)) throw new Error('staffListAuditLog: unexpected shape');
  return d.events;
}

// ── Customer support (help desk) ──────────────────────────────────────────────
/** All support tickets (optionally filtered by status) → { tickets, counts }. */
export async function fetchSupportTickets(status) {
  const d = await call('staffListSupportTickets')(status ? { status } : {});
  if (!d || !Array.isArray(d.tickets)) throw new Error('staffListSupportTickets: unexpected shape');
  return d;
}
/** Reply to / triage a ticket. { id, message?, status?, priority?, assignToMe? }. */
export async function replySupportTicket(args) {
  return call('staffReplySupportTicket')(args);
}

// ── Careers / recruitment ─────────────────────────────────────────────────────
/** Every job application from /careers, newest first → { applications, counts }. */
export async function fetchJobApplications() {
  const d = await call('staffListJobApplications')();
  if (!d || !Array.isArray(d.applications)) throw new Error('staffListJobApplications: unexpected shape');
  return d;
}
/** Move an application through the funnel. stage: new|review|shortlist|interview|offer|hired|rejected. */
export async function setJobApplicationStage(id, stage, note = '') {
  return call('staffSetJobApplicationStage')({ id, stage, ...(note ? { note } : {}) });
}
/** Every job opening incl. closed, newest first → { openings }. */
export async function fetchJobOpenings() {
  const d = await call('staffListJobOpenings')();
  if (!d || !Array.isArray(d.openings)) throw new Error('staffListJobOpenings: unexpected shape');
  return d;
}
/** Create (omit id) or update a job opening → { ok, id }. */
export async function saveJobOpening(opening) {
  return call('staffSaveJobOpening')(opening);
}
/** Permanently remove an opening → { ok }. */
export async function deleteJobOpening(id) {
  return call('staffDeleteJobOpening')({ id });
}

// ── Rider network ─────────────────────────────────────────────────────────────
/** Every rider application, newest first → { applications, counts }. */
export async function fetchRiderApplications() {
  const d = await call('staffListRiderApplications')();
  if (!d || !Array.isArray(d.applications)) throw new Error('staffListRiderApplications: unexpected shape');
  return d;
}
/** Move a rider application through vetting. stage: new|review|vetting|approved|rejected. */
export async function setRiderApplicationStage(id, stage, note = '') {
  return call('staffSetRiderApplicationStage')({ id, stage, ...(note ? { note } : {}) });
}

// ── Returns, refunds & disputes ───────────────────────────────────────────────
/** All return/refund disputes (optionally filtered) → { disputes, counts }. */
export async function fetchDisputes(status) {
  const d = await call('staffListDisputes')(status ? { status } : {});
  if (!d || !Array.isArray(d.disputes)) throw new Error('staffListDisputes: unexpected shape');
  return d;
}
/** Resolve a dispute. { id, resolution:'refund'|'partial'|'replace'|'decline', refundAmount?, note? }. */
export async function resolveDispute(args) {
  return call('staffResolveDispute')(args);
}

// Demo passthroughs (no backend domain yet) — kept here so screens import one place.
export const demo = { SCOUTS, PAYOUT_REQUESTS, APPLICANTS };
