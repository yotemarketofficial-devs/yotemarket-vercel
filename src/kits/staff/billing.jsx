/* billing.jsx — Subscriptions & billing. CONFIDENTIAL · internal staff only.
 *
 * Platform revenue is subscriptions and nothing else — merchants keep order value via
 * escrow & release — so this screen is the whole revenue picture, and three things about
 * the old version made it unfit for that:
 *
 * 1. IT SHOWED A STATUS THAT HAD STOPPED BEING TRUE. `subscriptions/{uid}.status` is
 *    rewritten to "expired" by a sweep that runs once a day at 08:00. Printing that field
 *    means printing an answer up to a day out of date, while the merchant's features have
 *    already been switched off at the renewal instant by the entitlement gate. Every row
 *    now derives its state from the renewal timestamp the way the gate does (see
 *    lib/subscription-state.js) and says so when the stored label disagrees.
 *
 * 2. THERE WAS NO WAY IN. A merchant's billing history could not be reached from the
 *    screen that lists their billing — a row was a dead end, so answering "what has this
 *    one actually paid" meant leaving for the Accounts console and searching by hand.
 *    Rows open a drawer that reads the account and the store record together.
 *
 * 3. IT DID NOT SAY WHAT LAPSING COSTS. "Overdue" is only meaningful next to what stops,
 *    and that list is not prose here — it is read out of lib/entitlements.js, the same
 *    matrix the dashboard gates on, so it cannot drift from what actually happens.
 *
 * WHAT THIS SCREEN STILL CANNOT DO, and does not pretend to: `staffListSubscriptions`
 * sends a pre-formatted date string rather than a timestamp, so derivation is only
 * possible where a timestamp exists — the drawer (which reads `staffUserDetail` /
 * `staffMerchantDetail`, both of which do send one). Rows without one are marked as the
 * server's word rather than dressed up as live. See docs/staff-portal-backend.md.
 */
import React from 'react';
import { Card, SectionHead, Seg, Btn, Pill, Stat, Bar, Icon, kes, DataTable, Modal, EmptyState, BackendError, exportCsv } from './ui.jsx';
import { staffListPayoutChanges, staffResolvePayoutChange } from '../../lib/firebase.js';
import { useStaffResource, fetchSubscriptions, fetchUserDetail, fetchMerchantDetail, addStaffNote } from './service.js';
import { billingState, billingTotals, renewalPhrase, stateOrder, DUE_SOON_DAYS } from '../../lib/subscription-state.js';
import { FEATURES, TIER_NAMES } from '../../lib/entitlements.js';
import { SUBSCRIPTIONS, WALLET } from './data.js';

const { useState, useEffect, useCallback, useMemo } = React;

const fmtDay = (ms) => (ms ? new Date(ms).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtTime = (ms) => (ms ? new Date(ms).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '');

/* ── Payout-change approvals ──────────────────────────────────────────────────
   A merchant changing where their money lands needs a person to agree. It lives on this
   screen because it is money leaving, and this is the money screen. */
export const payoutLabelStaff = (p) => {
  if (!p) return 'Not set';
  const t = p.type || (p.method === 'b2b' ? 'paybill' : 'phone');
  if (t === 'phone') return `M-Pesa ${p.phone}`;
  if (t === 'pochi') return `Pochi ${p.phone}`;
  if (t === 'till') return `Till ${p.till}`;
  if (t === 'paybill') return `Paybill ${p.paybill} · Acc ${p.account}`;
  return 'Set';
};

export function PayoutChangeReview() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await staffListPayoutChanges(); setRows(r.requests || []); } catch (e) { /* backend off */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const resolve = async (id, approve) => {
    try { await staffResolvePayoutChange({ id, approve }); setMsg({ ok: true, text: approve ? 'Payout change approved.' : 'Request rejected.' }); load(); }
    catch (e) { setMsg({ ok: false, text: e.message || 'Failed.' }); }
  };
  if (!loading && rows.length === 0) return null;
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3"><h3 className="font-bold t1">Payout-change requests</h3>{rows.length > 0 && <Pill tone="amber">{rows.length} pending</Pill>}</div>
      {msg && <div className="px-5 pb-2 text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}
      <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-4" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="flex-1 min-w-0">
              <div className="font-semibold t1 text-sm truncate">{r.storeName || r.merchantId}</div>
              <div className="text-xs t3 mt-0.5">{payoutLabelStaff(r.current)} <Icon name="arrow-right" className="mx-1" /> <span className="t1 font-semibold">{payoutLabelStaff(r.requested)}</span></div>
            </div>
            <Btn kind="soft" size="sm" onClick={() => resolve(r.id, false)}>Reject</Btn>
            <Btn kind="primary" size="sm" onClick={() => resolve(r.id, true)}>Approve</Btn>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── What lapsing actually costs ──────────────────────────────────────────────
   The answer to "do services really stop when a plan goes overdue". Not written out by
   hand — the ladder is read from the entitlement matrix, so this card is wrong only if the
   gate is wrong, and the two cannot drift apart. */
function EnforcementCard() {
  const byTier = useMemo(() => {
    const m = {};
    Object.values(FEATURES).forEach((f) => { (m[f.minTier] = m[f.minTier] || []).push(f.label); });
    return m;
  }, []);
  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-bold t1"><Icon name="lock" className="mr-2 t3" />What stops when a plan lapses</h3>
      <p className="text-sm t3">
        A subscription is checked by its <b className="t2">renewal date</b>, not by the status word stored on
        it. The moment the date passes, the merchant's capability rank drops to 0 and everything above
        it locks — for the owner and for every staff seat on that store — without waiting for the
        overnight sweep that relabels the document. The same matrix is enforced twice: in the browser
        for what renders, and in the callables for what can actually be done.
      </p>
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        {[1, 2, 3, 4].map((tier, i) => (
          <div key={tier} className="flex gap-3 px-4 py-2.5 text-sm" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <span className="font-semibold t1" style={{ width: 92 }}>{TIER_NAMES[tier]}</span>
            <span className="t2 flex-1">{(byTier[tier] || []).join(' · ')}</span>
          </div>
        ))}
      </div>
      <p className="text-xs t3">
        <Icon name="circle-info" /> The storefront itself stays up — a lapsed plan loses the paid
        features above, not the shop. Staff-granted placement (Featured, Top brand) is left alone on a
        downgrade so a tier change never silently undoes a placement decision somebody made on purpose;
        remove those from the merchant console if a lapse should cost them.
      </p>
    </Card>
  );
}

/* ── One merchant's billing record ────────────────────────────────────────────
   Two reads, because the two callables know different halves: the account read resolves
   who they are and which store is theirs, and the store read carries the priced plan —
   kind, band, delivery allotment — plus the settlement history. */
function BillingDrawer({ row, onClose }) {
  const uid = row.uid || row.id;
  const [d, setD] = useState(null);
  const [m, setM] = useState(null);
  const [err, setErr] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const acct = await fetchUserDetail(uid);
      setD(acct);
      const storeId = acct && acct.store && acct.store.storeId;
      if (storeId) {
        // Best-effort: the priced plan and the settlement history are a bonus on top of the
        // account read, so a failure here must not blank the drawer that already loaded.
        fetchMerchantDetail(storeId).then(setM).catch(() => {});
      }
    } catch (e) { setErr(e.message || 'Could not load this account.'); }
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const addNote = async () => {
    const t = note.trim(); if (!t) return;
    setBusy(true);
    try { await addStaffNote('user', uid, t); setNote(''); load(); }
    catch (e) { setErr(e.message || 'Could not save that note.'); }
    finally { setBusy(false); }
  };

  // The store record's subscription is the priced one; the account's is the fallback.
  const sub = (m && m.subscription) || (d && d.subscription) || null;
  const st = billingState(sub ? { ...sub, amount: sub.price || row.amount } : row);
  const cap = sub && Number(sub.deliveriesCap) || 0;
  const used = sub && Number(sub.deliveriesUsed) || 0;
  const settlements = (m && m.settlements) || [];
  const locked = Object.values(FEATURES).filter((f) => st.rank < f.minTier);

  return (
    <Modal
      title={row.shop || (d && d.profile && d.profile.name) || 'Merchant'}
      subtitle={(d && d.profile && d.profile.email) || uid}
      icon="file-invoice-dollar"
      onClose={onClose}
      maxWidth={780}
    >
      {!d && !err && <div className="py-10 text-center t3"><Icon name="spinner" className="mr-2" />Loading billing record…</div>}
      {err && <EmptyState icon="triangle-exclamation" tone="red" title="Couldn't load this record" sub={err} />}
      {d && (
        <div className="space-y-5">
          {/* The verdict first, and the disagreement with the stored status named out loud —
              a staff member acting on this needs to know the document says something else. */}
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone={st.tone}>{st.label}</Pill>
            <span className="text-sm t2 font-semibold">{sub && sub.plan ? sub.plan : 'No plan'}</span>
            {sub && sub.kind && <span className="text-xs t3">· {sub.kind}</span>}
            {sub && sub.range && <span className="text-xs t3">· band {sub.range}</span>}
            {renewalPhrase(st) && <span className="text-xs t3">· {renewalPhrase(st)}</span>}
          </div>
          {st.stale && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
              <Icon name="triangle-exclamation" className="mr-2" />
              The subscription document still reads <b>active</b>, but its renewal date passed
              {st.days !== null ? ` ${Math.abs(st.days)} day${Math.abs(st.days) === 1 ? '' : 's'} ago` : ''}.
              The overnight sweep relabels it at 08:00; the merchant's paid features stopped at the
              renewal instant regardless, because the gate reads the date.
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <BTile label="Plan price" value={sub && sub.price ? kes(sub.price) : (row.amount ? kes(row.amount) : '—')} sub="per month" tone="pri" />
            <BTile label="Renews" value={st.renewsAt ? fmtDay(st.renewsAt) : '—'} sub={renewalPhrase(st) || 'no date on record'} tone={st.overdue ? 'red' : 'blue'} />
            <BTile label="Capability" value={st.tierName} sub={`rank ${st.rank} of 4`} tone={st.rank ? 'green' : 'red'} />
            <BTile label="Store balance" value={kes((d.store && d.store.balanceAvailable) || 0)} sub="their money, not ours" tone="amber" />
          </div>

          {/* The delivery allotment is the obligation the plan creates, so it belongs in the
              billing record rather than only in ops. */}
          {cap > 0 && (
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs font-semibold t3 uppercase tracking-wide">Deliveries this cycle</span>
                <span className="text-sm font-bold t1 num">{used} / {cap}</span>
              </div>
              <Bar pct={(used / cap) * 100} color={used > cap ? 'var(--red)' : 'var(--pri)'} />
            </div>
          )}

          {/* Does service actually cease? Here is the answer for THIS merchant, right now. */}
          <div>
            <div className="font-bold t1 text-sm mb-2">Features {st.rank ? 'unlocked' : 'locked'} right now</div>
            <div className="flex flex-wrap gap-1.5">
              {st.rank > 0 && st.unlocks.map((l) => <Pill key={l} tone="ok">{l}</Pill>)}
              {locked.map((f) => <Pill key={f.label} tone={st.rank ? 'blue' : 'red'}>{f.label}</Pill>)}
            </div>
            <div className="text-xs t3 mt-2">
              {st.rank > 0
                ? 'Green is what this plan pays for; blue is what an upgrade would add.'
                : 'Every one of these is refused for this merchant — by the browser and by the callables — for as long as the plan is not live.'}
            </div>
          </div>

          {/* Money that has moved. Settlements are payouts TO the merchant; what they have
              paid US is not in any callable yet, and saying so beats an empty panel that
              reads as "never paid". */}
          <div>
            <div className="font-bold t1 text-sm mb-2">Settlement history <span className="t3 font-normal">· payouts to this merchant</span></div>
            {settlements.length ? (
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                {settlements.slice(0, 10).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 text-sm" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <span className="t3 text-xs" style={{ width: 92 }}>{fmtDay(s.at)}</span>
                    <Pill tone={s.status === 'paid' ? 'ok' : 'amber'}>{s.status || 'pending'}</Pill>
                    <span className="num font-semibold t1 flex-1" style={{ textAlign: 'right' }}>{kes(s.amount)}</span>
                    {s.receipt && <span className="num t3 text-xs hidden sm:block">{s.receipt}</span>}
                  </div>
                ))}
              </div>
            ) : <div className="text-xs t3">{m ? 'No settlements recorded.' : 'Loading the store record…'}</div>}
            <div className="text-xs t3 mt-2">
              <Icon name="circle-info" /> Subscription payments received FROM this merchant are not
              exposed by any staff callable yet — see docs/staff-portal-backend.md. Until they are,
              M-Pesa is the record for what they paid.
            </div>
          </div>

          {/* The STORE's orders, from the store record. The account read also returns a
              `recentOrders`, but those are orders this person BOUGHT as a shopper — on a
              merchant's billing record that would read as their shop's trade and be wrong
              by the whole width of the platform. */}
          {m && m.recentOrders && m.recentOrders.length > 0 && (
            <div>
              <div className="font-bold t1 text-sm mb-2">Recent store orders <span className="t3 font-normal">· {(m.stats && m.stats.paidOrders) || 0} paid of {(m.stats && m.stats.orders) || 0}</span></div>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                {m.recentOrders.slice(0, 6).map((o, i) => (
                  <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 text-sm" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <span className="num t3 text-xs" style={{ width: 76 }}>{o.orderNo || ('#' + String(o.id).slice(-6))}</span>
                    <Pill tone={o.status === 'delivered' ? 'ok' : 'amber'}>{o.status}</Pill>
                    <span className="num font-semibold t1 flex-1" style={{ textAlign: 'right' }}>{kes(o.total)}</span>
                    <span className="t3 text-xs hidden sm:block" style={{ width: 92, textAlign: 'right' }}>{fmtDay(o.at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="font-bold t1 text-sm mb-2">Internal notes <span className="t3 font-normal">· staff only</span></div>
            <div className="flex items-center gap-2 mb-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note about this account…" className="ym-input flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }} />
              <Btn kind="primary" size="sm" icon={busy ? 'spinner' : 'plus'} onClick={addNote} disabled={busy || !note.trim()}>Add</Btn>
            </div>
            {d.notes && d.notes.length ? (
              <div className="space-y-2">
                {d.notes.map((n) => (
                  <div key={n.id} className="text-sm rounded-lg p-2.5" style={{ background: 'var(--surface2)' }}>
                    <div className="t1">{n.text}</div>
                    <div className="text-[11px] t3 mt-1">{n.author} · {n.at ? `${fmtDay(n.at)} ${fmtTime(n.at)}` : ''}</div>
                  </div>
                ))}
              </div>
            ) : <div className="text-xs t3">No notes yet.</div>}
          </div>
        </div>
      )}
    </Modal>
  );
}

const BTile = ({ label, value, sub, tone = 'pri' }) => {
  const tones = { pri: 'var(--pri)', green: 'var(--green)', amber: 'var(--amber)', blue: 'var(--blue)', red: 'var(--red)' };
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--surface2)' }}>
      <div className="text-xs t3">{label}</div>
      <div className="font-bold num mt-0.5" style={{ color: tones[tone] || 'var(--t1)' }}>{value}</div>
      {sub && <div className="text-[11px] t3 mt-0.5">{sub}</div>}
    </div>
  );
};

/* ── The screen ───────────────────────────────────────────────────────────── */
const STATE_FILTERS = ['all', 'lapsed', 'due', 'active', 'cancelled'];
const STATE_LABEL = { all: 'All', lapsed: 'Lapsed', due: 'Due soon', active: 'Active', cancelled: 'Cancelled' };

export function Billing() {
  const { data, live, error, demo, reload } = useStaffResource(fetchSubscriptions, { subscriptions: SUBSCRIPTIONS, wallet: WALLET });
  // Money figures MUST never fall back to demo — an invented float is the most dangerous
  // number in the console. Missing → em-dash, not a plausible amount.
  const wallet = data.wallet || {};
  const money = (v) => (v == null || v === '' ? '—' : v);

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);
  // When the rows were last applied. The screen polls every 20s, and on a screen whose
  // whole problem was staleness, "how old is this" is not a detail.
  const [readAt, setReadAt] = useState(() => Date.now());
  useEffect(() => { setReadAt(Date.now()); }, [data]);

  // Derived once per read, so the table, the totals and the drawer all agree.
  const rows = useMemo(
    () => (data.subscriptions || []).map((s) => ({ ...s, state: billingState(s) })),
    [data.subscriptions],
  );
  const totals = useMemo(() => billingTotals(rows), [rows]);
  // True for today's payload: no renewal timestamps, so nothing here is derived.
  const undated = rows.length > 0 && rows.every((r) => r.state.dated);

  const ql = q.trim().toLowerCase();
  const shown = rows
    .filter((r) => filter === 'all' || r.state.key === filter)
    .filter((r) => !ql || `${r.shop || ''} ${r.plan || ''} ${r.id || ''}`.toLowerCase().includes(ql));

  const columns = [
    { key: 'shop', header: 'Shop', sort: true, csvValue: (s) => s.shop,
      render: (s) => (<div className="min-w-0"><div className="font-semibold t1 truncate">{s.shop}</div><div className="text-xs t3">{s.state.tierName}</div></div>) },
    { key: 'plan', header: 'Plan', sort: true, csvValue: (s) => s.plan, render: (s) => <span className="t2">{s.plan}</span> },
    { key: 'band', header: 'Band', csvValue: (s) => s.band, render: (s) => <span className="t3">{s.band}</span> },
    { key: 'amount', header: 'Amount', align: 'right', sort: true, csvValue: (s) => s.amount,
      render: (s) => <span className="num t1">{kes(s.amount)}<span className="text-xs t3">/mo</span></span> },
    { key: 'next', header: 'Renews', sortValue: (s) => (s.state.days == null ? Number.MAX_SAFE_INTEGER : s.state.days),
      csvValue: (s) => (s.state.renewsAt ? fmtDay(s.state.renewsAt) : s.next),
      render: (s) => (
        <span className="num" style={{ color: s.state.overdue ? 'var(--red)' : 'var(--t2)' }}>
          {s.state.renewsAt ? fmtDay(s.state.renewsAt) : s.next}
          {renewalPhrase(s.state) && <span className="block text-xs t3">{renewalPhrase(s.state)}</span>}
        </span>) },
    { key: 'status', header: 'Status', sortValue: (s) => stateOrder(s.state.key), csvValue: (s) => s.state.label,
      render: (s) => (
        <span className="flex items-center gap-1.5">
          <Pill tone={s.state.tone}>{s.state.label}</Pill>
          {s.state.stale && <Icon name="triangle-exclamation" className="text-xs" style={{ color: 'var(--amber)' }} title="The stored status has not caught up with the renewal date" />}
        </span>) },
    { key: 'go', header: '', csv: false, align: 'right',
      render: () => <Icon name="arrow-right" className="t3" /> },
  ];

  // The download is not the table: it can carry the derived tier and the disagreement flag,
  // which are the two things somebody exporting this is most likely to be chasing.
  const exportColumns = [
    ...columns.filter((c) => c.key !== 'go'),
    { key: 'tier', header: 'Capability', csvValue: (s) => s.state.tierName },
    { key: 'stale', header: 'Server label stale', csvValue: (s) => (s.state.stale ? 'yes' : '') },
  ];

  return (<div className="fadeup space-y-6">
    <SectionHead icon="wallet" title="Subscriptions & billing"
      sub={demo ? 'Sample billing — no backend configured' : (live ? 'Platform float, M-Pesa settlement, and merchant billing oversight' : 'Loading live billing…')}
      action={
        <div className="flex items-center gap-2">
          <span className="text-xs t3 hidden sm:block">read {fmtTime(readAt)}</span>
          <Btn kind="soft" size="sm" icon="rotate" onClick={reload}>Refresh</Btn>
        </div>
      } />
    <BackendError error={error} onRetry={reload} />
    <PayoutChangeReview />

    {/* Ours. Recurring revenue, and the part of it that is about to stop. */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="MRR on live plans" value={kes(totals.mrr)} sub={`${totals.active + totals.due} paying merchant${totals.active + totals.due === 1 ? '' : 's'}`} icon="repeat" tone="pri" />
      <Stat label="At risk" value={kes(totals.atRisk)} sub={`${totals.due} due soon · ${totals.lapsed} lapsed`} icon="triangle-exclamation" tone={totals.lapsed ? 'red' : 'amber'} />
      <Stat label="Lapsed plans" value={totals.lapsed} sub={totals.stale ? `${totals.stale} not yet relabelled by the sweep` : 'Features locked'} icon="lock" tone="red" />
      <Stat label="Cancelled" value={totals.cancelled} sub="Ended on purpose" icon="circle-minus" tone="blue" />
    </div>

    {/* Theirs, and the float we hold. Separate row so nothing here reads as revenue. */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Platform float" value={money(wallet.float)} icon="vault" tone="pri" />
      <Stat label="M-Pesa settled today" value={money(wallet.mpesaToday)} icon="mobile-alt" tone="green" />
      <Stat label="Pending payouts" value={money(wallet.pendingPayouts)} icon="hourglass-half" tone="amber" />
      <Stat label="Badge insurance fund" value={money(wallet.badgeFund)} icon="shield-halved" tone="blue" />
    </div>

    {undated && (
      <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-3" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
        <Icon name="circle-info" className="mt-0.5" />
        <div>
          <b>These statuses are the server's word, not a live check.</b> `staffListSubscriptions` sends a
          formatted date rather than a renewal timestamp, so a plan that lapsed since the 08:00 sweep still
          reads as active here. Open a row to see the derived state — the drawer reads a callable that does
          send the timestamp. The one-field backend change is in docs/staff-portal-backend.md.
        </div>
      </div>
    )}

    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 flex-wrap p-5 pb-3">
        <h3 className="font-bold t1">Merchant subscriptions</h3>
        <Seg value={filter} onChange={setFilter} options={STATE_FILTERS} fmt={(o) => `${STATE_LABEL[o]}${o === 'all' ? '' : ` ${totals[o] || 0}`}`} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shop or plan…" className="ym-input ml-auto" style={{ maxWidth: 240 }} />
        <Btn kind="soft" size="sm" icon="file-arrow-down" disabled={!shown.length}
          onClick={() => exportCsv(`subscriptions-${new Date().toISOString().slice(0, 10)}`, exportColumns, shown)}>Export</Btn>
      </div>
      <DataTable minWidth={720} rows={shown} pageSize={25} onRowClick={(r) => setOpen(r)}
        initialSort={{ key: 'status', dir: 'asc' }}
        empty={<EmptyState icon="wallet" title={q || filter !== 'all' ? 'No subscriptions match this filter.' : 'No subscriptions yet.'} />}
        columns={columns} />
      <div className="px-5 py-3 text-xs t3" style={{ borderTop: '1px solid var(--line)' }}>
        Sorted worst-first. Open a row for the full billing record — plan, renewal, delivery allotment,
        what is locked, settlements and notes. Plans due inside {DUE_SOON_DAYS} days are the same ones the
        backend has already reminded by push.
      </div>
    </Card>

    <EnforcementCard />

    {open && <BillingDrawer row={open} onClose={() => setOpen(null)} />}
  </div>);
}

// The console routes this screen under the key `wallet`; the old name is kept as an alias
// so the route table and any deep link keep working.
export const Wallet = Billing;
export default Billing;
