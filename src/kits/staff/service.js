/* service.js — Staff console data layer. CONFIDENTIAL · internal staff only.
   Staff have no broad Firestore read access (rules are user-scoped), so every
   read/action goes through an Admin-SDK Cloud Function gated by the caller's
   `admin`/`moderator` custom claim. Each call degrades to the bundled demo data
   when the backend is unavailable or the function isn't deployed yet, so the
   console always renders. */
import { useEffect, useState, useCallback, useRef, useContext, createContext } from 'react';
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
 * Resolves the signed-in user's staff access:
 * { user, loading, isStaff, isAdmin, tier, departments, role, profile, refresh }.
 *
 * Custom claims only carry the coarse admin/moderator bit, and DEPARTMENTS live on
 * `staff/{uid}` which no client can read (rules deny it). So the claim gets us in
 * the door instantly, then `staffMe` fills in exactly the access the server will
 * enforce — the console must never offer a workspace the backend would refuse.
 * Until it answers we assume the narrowest access, so nothing flashes into view
 * and then disappears.
 */
export function useStaffClaims() {
  const [state, setState] = useState({
    user: null, loading: firebaseEnabled, isStaff: false, role: null,
    tier: null, departments: [], isAdmin: false, profile: null, resolved: false,
  });

  const evaluate = useCallback(async (force = false) => {
    const u = auth?.currentUser || null;
    if (!u) { setState({ user: null, loading: false, isStaff: false, role: null, tier: null, departments: [], isAdmin: false, profile: null, resolved: true }); return; }
    try {
      const token = await u.getIdTokenResult(force);
      const c = token.claims || {};
      const owner = u.emailVerified && OWNER_EMAILS.includes(String(u.email || '').toLowerCase());
      const isStaff = c.admin === true || c.moderator === true || owner;
      const claimAdmin = c.admin === true || owner;
      setState((s) => ({ ...s, user: u, loading: false, isStaff,
        role: claimAdmin ? 'admin' : (c.moderator === true ? 'moderator' : null),
        isAdmin: claimAdmin, tier: claimAdmin ? 'admin' : s.tier, resolved: false }));
      if (!isStaff) { setState((s) => ({ ...s, departments: [], tier: null, resolved: true })); return; }

      try {
        const me = await call('staffMe')();
        setState((s) => ({ ...s, isAdmin: !!me.isAdmin, tier: me.tier || (me.isAdmin ? 'admin' : 'agent'),
          departments: Array.isArray(me.departments) ? me.departments : [],
          role: me.isAdmin ? 'admin' : 'moderator', profile: me, resolved: true }));
      } catch {
        // staffMe not deployed / unreachable — fall back to the claim so an admin
        // is never locked out of their own console by a backend blip.
        setState((s) => ({ ...s, tier: claimAdmin ? 'admin' : 'lead',
          departments: claimAdmin ? ALL_DEPTS : LEGACY_DEPTS, resolved: true }));
      }
    } catch {
      setState({ user: u, loading: false, isStaff: false, role: null, tier: null, departments: [], isAdmin: false, profile: null, resolved: true });
    }
  }, []);

  useEffect(() => {
    if (!firebaseEnabled || !auth) { setState({ user: null, loading: false, isStaff: false, role: null, tier: null, departments: [], isAdmin: false, profile: null, resolved: true }); return undefined; }
    const unsub = auth.onAuthStateChanged(() => evaluate(false));
    return () => unsub();
  }, [evaluate]);

  return { ...state, refresh: () => evaluate(true) };
}

// Mirrors STAFF_DEPTS / LEGACY_MOD_DEPTS in functions/index.js — keep in sync.
export const ALL_DEPTS = ['marketplace', 'logistics', 'safety', 'support', 'growth', 'comms', 'finance', 'people', 'legal', 'intelligence'];
export const LEGACY_DEPTS = ['marketplace', 'logistics', 'safety', 'support', 'growth', 'comms'];
export const DEPT_LABEL = {
  marketplace:'Marketplace', logistics:'Logistics', safety:'Trust & Safety', support:'Support',
  growth:'Growth', comms:'Comms', finance:'Finance', people:'People', legal:'Legal', intelligence:'Intelligence',
};
export const TIER_LABEL = { admin:'Administrator', lead:'Department lead', agent:'Agent' };

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

/* ── Manual refresh ───────────────────────────────────────────────────────────
   Staff reads are callable-based, so a screen only updates on its own poll timer.
   That's fine for a table you're watching, but useless the moment you've just
   done something elsewhere (paid a merchant, released a run) and want to SEE it
   now. The shell's refresh button bumps this counter; every useStaffResource on
   screen re-fetches immediately, and screens that manage their own loads can
   subscribe with useRefreshSignal(). */
const RefreshCtx = createContext({ tick: 0, refresh: () => {}, busy: false });
export const useRefresh = () => useContext(RefreshCtx);
export { RefreshCtx };

/** Run `fn` whenever the operator hits refresh (not on first mount). */
export function useRefreshSignal(fn) {
  const { tick } = useRefresh();
  const ref = useRef(fn);
  ref.current = fn;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    ref.current && ref.current();
  }, [tick]);
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
  const { tick } = useRefresh();

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
  }, [...deps, reloadKey, tick]);

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
/**
 * Staff ID -> the email to sign in with. PUBLIC and unauthenticated by necessity: a
 * person signing in has no session yet. Throttled server-side per ID.
 *
 * Sign-in still runs through Firebase's signInWithEmailAndPassword afterwards, so the
 * password never reaches our backend — the badge only saves typing an address.
 */
export async function resolveStaffLogin(staffId) {
  const d = await call('resolveStaffLogin')({ staffId });
  if (!d || !d.email) throw new Error('No active staff member has that ID.');
  return d;
}

// ── The employee record ──────────────────────────────────────────────────────
// Everything about one person on one page, for an admin, a People lead, or the lead of
// the department they work in. The server decides who may look and WHAT they get back —
// pay and statutory numbers are withheld from a department lead, complaints about the
// caller are never returned at all, and an anonymous complainant is not sent. None of
// that is enforced here; this layer only carries it.

export async function fetchEmployeeRecord(uid) {
  const d = await call('staffEmployeeRecord')({ uid });
  if (!d || !d.record) throw new Error('staffEmployeeRecord: unexpected shape');
  return d;
}

export async function setEmployeeDetails(args) {
  return call('staffSetEmployeeDetails')(args);
}

export async function saveEmployeeReview(args) {
  return call('staffSaveEmployeeReview')(args);
}

export async function fileComplaint(args) {
  return call('staffFileComplaint')(args);
}

export async function resolveComplaint(id, status, resolution) {
  return call('staffResolveComplaint')({ id, status, resolution });
}

/**
 * A person's display name and job title. Settable by themselves or a People lead.
 * This is what actually PUTS a name on the record — everything else only propagated one.
 */
export async function setStaffProfile({ uid, name, title }) {
  return call('staffSetProfile')({ uid, name, title });
}
/**
 * An employee's statutory identifiers: KRA PIN, NSSF and SHIF numbers.
 * Settable by the person themselves or a People lead — the employee is the source of
 * truth for their own numbers, People need to fill gaps before a filing deadline.
 * Omit `uid` to set your own.
 */
export async function setStatutoryIds({ uid, kraPin, nssfNo, shifNo }) {
  return call('staffSetStatutoryIds')({ uid, kraPin, nssfNo, shifNo });
}

// ── Departmental work boards ─────────────────────────────────────────────────
// One board per department so a team can see who is on what. The backend scopes every
// read to the caller's own departments, so there is nothing to filter here.

export async function fetchTasks(department) {
  const d = await call('staffListTasks')(department ? { department } : {});
  if (!d || !Array.isArray(d.tasks)) throw new Error('staffListTasks: unexpected shape');
  return d;
}

export async function saveTask(task) {
  return call('staffSaveTask')(task);
}

export async function setTaskStatus(id, status) {
  return call('staffSetTaskStatus')({ id, status });
}

export async function deleteTask(id) {
  return call('staffDeleteTask')({ id });
}

// ── Payroll ──────────────────────────────────────────────────────────────────
// A run is computed from staff_contracts + staff_shifts, carries real Kenyan statutory
// deductions, and posts its cost to finance. It does NOT move money — salaries are paid
// through the bank. No demo fallback on any of these: inventing payroll figures would be
// worse than an empty screen, because they look exactly like real ones.

export async function previewPayroll(period) {
  const d = await call('staffPayrollPreview')({ period });
  if (!d || !Array.isArray(d.lines)) throw new Error('staffPayrollPreview: unexpected shape');
  return d;
}

export async function createPayrollRun(period) {
  return call('staffCreatePayrollRun')({ period });
}

export async function fetchPayrollRuns() {
  const d = await call('staffListPayrollRuns')();
  if (!d || !Array.isArray(d.runs)) throw new Error('staffListPayrollRuns: unexpected shape');
  return d;
}

export async function fetchPayrollRun(id) {
  const d = await call('staffPayrollRun')({ id });
  if (!d || !d.run) throw new Error('staffPayrollRun: unexpected shape');
  return d;
}

export async function approvePayrollRun(id) {
  return call('staffApprovePayrollRun')({ id });
}

export async function voidPayrollRun(id, reason) {
  return call('staffVoidPayrollRun')({ id, reason });
}

export async function fetchMyPayslips() {
  const d = await call('staffMyPayslips')();
  return Array.isArray(d?.payslips) ? d.payslips : [];
}

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

// ── Logistics engine ─────────────────────────────────────────────────────────
// The engine's own state, not a flattened view of it: runs at every stage
// (forming → open → accepted → completed), hub load, fleet availability by band
// and the exception queue. `staffListRuns` above is the older, lossy read kept
// only so an un-deployed backend still renders something.
/** Full ops snapshot → { summary, runs, hubs, fleet, exceptions }. */
export async function fetchLogistics(args = {}) {
  const d = await call('staffLogistics')(args);
  if (!d || !Array.isArray(d.runs)) throw new Error('staffLogistics: unexpected shape');
  return d;
}
/** One run: orders with their chain-of-custody legs, stop sequence, payout maths. */
export async function fetchRunDetail(runId) {
  return call('staffRunDetail')({ runId });
}
/** Ops recovery on a stuck run. action: 'release' (back to the board) | 'cancel'. */
export async function resolveRun(runId, action, reason = '') {
  return call('staffResolveRun')({ runId, action, ...(reason ? { reason } : {}) });
}
/** Rider roster — who can claim work right now, and what blocks the rest. */
export async function fetchRiderRoster() {
  const d = await call('staffRiderRoster')();
  if (!d || !Array.isArray(d.riders)) throw new Error('staffRiderRoster: unexpected shape');
  return d;
}
/** Suspend or reinstate a rider. status: 'active' | 'suspended'. */
export async function setRiderStatus(uid, status, reason = '') {
  return call('staffSetRiderStatus')({ uid, status, ...(reason ? { reason } : {}) });
}

// ── Staff → people communications ────────────────────────────────────────────
/** Open a thread WITH someone (merchant/shopper/rider/marketer). They get it in
 *  Help Center → My requests and can reply; we answer it in Support. */
export async function messageUser(args) {
  return call('staffMessageUser')(args);
}
/** Announce to a whole audience. Pass { dryRun:true } for the recipient count
 *  only, or { testOnly:true } to send it to yourself first. */
export async function sendBroadcast(args) {
  return call('staffBroadcast')(args);
}
/** Broadcast history, newest first. */
export async function fetchBroadcasts() {
  const d = await call('staffListBroadcasts')();
  if (!d || !Array.isArray(d.broadcasts)) throw new Error('staffListBroadcasts: unexpected shape');
  return d.broadcasts;
}
/** Every way we can legitimately reach one person, with each number's provenance. */
export async function fetchContactCard(uid) {
  return call('staffContactCard')({ uid });
}
/** The account directory, used as the recipient picker for outreach. */
export async function fetchUsers() {
  const d = await call('staffListUsers')();
  if (!d || !Array.isArray(d.users)) throw new Error('staffListUsers: unexpected shape');
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
/** Maintenance: repair products saved with an inverted discount (was < price).
 *  Returns { ok, count, fixed:[{id,name,price,was}] }. */
export async function fixInvertedPrices() {
  return call('staffFixInvertedPrices')({});
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

// ── Staff management & time clock ────────────────────────────────────────────
/** Who am I, as the server sees it → { staff, tier, departments, isAdmin, ... }. */
export async function fetchMe() { return call('staffMe')(); }
/** Every employee with tier, departments and whether they're on shift now. */
export async function fetchStaff() {
  const d = await call('listStaff')();
  if (!d || !Array.isArray(d.employees)) throw new Error('listStaff: unexpected shape');
  return d.employees;
}
/** Grant or change console access. role: 'admin'|'lead'|'agent'|'none', departments: string[]. */
export async function setStaffAccess({ email, role, departments }) {
  return call('staffSetRole')({ email, role, departments });
}
/** Onboard a new employee (HR record + console access). */
export async function onboardStaff(args) { return call('onboardEmployee')(args); }
/** Offboard — revokes portal access immediately. */
export async function offboardStaff(uid) { return call('offboardEmployee')({ uid }); }

/** Start my shift. Idempotent — returns the open one if already clocked in. */
export async function clockIn() { return call('staffClockIn')(); }
/** End my shift. { note? } → { ok, minutes }. */
export async function clockOut(note) { return call('staffClockOut')(note ? { note } : {}); }
/** My own clock: open shift, recent history, today/this-week totals. */
export async function fetchMyShifts() { return call('staffMyShifts')(); }
/** Team attendance (People dept) → { shifts, onShift, byPerson }. */
export async function fetchAttendance(days = 14) { return call('staffAttendance')({ days }); }
/** People lead: close a shift somebody left open. */
export async function closeShift(shiftId, minutes) {
  return call('staffCloseShift')({ shiftId, ...(minutes ? { minutes } : {}) });
}

// ── Employment contracts ─────────────────────────────────────────────────────
/** Every contract (People dept). { uid? } scopes to one person. */
export async function fetchContracts(uid) {
  const d = await call('staffListContracts')(uid ? { uid } : {});
  if (!d || !Array.isArray(d.contracts)) throw new Error('staffListContracts: unexpected shape');
  return d;
}
/** My own contract(s) — everyone may read their own terms. */
export async function fetchMyContract() { return call('staffMyContract')(); }
/** Issue (omit id) or amend a contract. Issuing supersedes the current active one. */
export async function saveContract(args) { return call('staffSaveContract')(args); }
/** Acknowledge your own contract by typing your name. */
export async function signContract(id, name) { return call('staffSignContract')({ id, name }); }
/** End a contract early, with a reason. */
export async function terminateContract(id, reason, lastDay) {
  return call('staffTerminateContract')({ id, reason, ...(lastDay ? { lastDay } : {}) });
}
export const CONTRACT_TYPE_LABEL = {
  permanent:'Permanent', fixed_term:'Fixed term', probation:'Probation',
  contractor:'Contractor', intern:'Intern', casual:'Casual',
};
export const PAY_PERIOD_LABEL = { monthly:'/month', daily:'/day', hourly:'/hour', per_run:'/run' };
