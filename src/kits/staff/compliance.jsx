/* compliance.jsx — Staff portal: the company's paperwork, and every employee's.
   CONFIDENTIAL · Legal, Finance and People.

   NOT the same subject as the delivery hold. That switch decides whether we may carry a
   parcel today and lives in functions/compliance.js. This screen is the register of what
   the COMPANY must hold to trade and employ people, and what must be on file for each
   member of staff.

   WHAT IT IS FOR: the failure here is drift, not fraud. A permit expires, a police
   clearance ages out, a work permit lapses, and nothing announces it. So every row goes
   amber before its date and red after, on its own, and an owner gets told.

   EVERY DATE AND STATUS COMES FROM THE SERVER (statutory.js). Nothing here recomputes an
   expiry — a screen that did its own date arithmetic would eventually disagree with the
   scheduled reminder about when something lapses, and then neither could be trusted.

   Three tabs, because they are three different jobs: the company register (Legal renews
   things), the workforce list (People chase documents), and the filing calendar (Finance
   remits what a payroll run created). */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, Stat, DataTable, EmptyState, Modal, Seg, kes } from './ui.jsx';
import {
  fetchCompanyCompliance, setCompanyObligation, fetchComplianceOverview,
  fetchStatutoryFilings, fetchStaff, useStaffClaims,
} from './service.js';
import { EmployeeRecord } from './employee.jsx';

const { useState, useEffect, useCallback, useMemo } = React;

/* Status vocabulary is the server's; this only chooses how it looks. Pill's tones are
   ok|amber|blue|red — Stat's are different (pri|green|amber|blue|red), and mixing them
   renders an unstyled pill or throws on Stat. */
const STATUS_TONE = { valid: 'ok', expiring: 'amber', expired: 'red', missing: 'red' };
const STATUS_LABEL = { valid: 'In order', expiring: 'Expiring', expired: 'Expired', missing: 'Not on file' };
const FILING_TONE = { upcoming: 'blue', due_soon: 'amber', overdue: 'red' };

const fmtDate = (s) => (s ? new Date(`${s}T00:00:00Z`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** "in 12 days" / "18 days ago" — a bare date makes the reader do the subtraction. */
function whenLabel(daysLeft) {
  if (daysLeft == null) return '';
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago`;
  if (daysLeft === 0) return 'today';
  return `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
}

const thisMonth = () => new Date().toISOString().slice(0, 7);

/* ── Editing one company obligation ───────────────────────────────────────── */
function ObligationModal({ item, staffOptions, onClose, onSaved }) {
  const [held, setHeld] = useState(!!item.held);
  const [reference, setReference] = useState(item.reference || '');
  const [expiresOn, setExpiresOn] = useState(item.expiresOn || '');
  const [ownerUid, setOwnerUid] = useState(item.ownerUid || '');
  const [renewalCost, setRenewalCost] = useState(item.renewalCost || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const expires = item.cadence !== 'once';

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await setCompanyObligation({
        key: item.key, held, reference, ownerUid,
        // Only sent for things that actually expire — posting an expiry against a
        // certificate of incorporation would invent a deadline that does not exist.
        ...(expires ? { expiresOn } : {}),
        renewalCost: Number(renewalCost) || 0,
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message || 'Could not save that.');
    } finally { setBusy(false); }
  };

  const field = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg)', color: 'var(--t1)' };

  return (
    <Modal
      title={item.label}
      subtitle={`${item.authority} · ${item.basis}`}
      icon="file-shield"
      onClose={onClose}
      maxWidth={520}
      footer={
        <>
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn icon="check" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Btn>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="t3 text-xs">{item.note}</div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={held} onChange={(e) => setHeld(e.target.checked)} />
          <span>We hold this</span>
        </label>

        <div>
          <div className="text-xs t3 mb-1">Reference / certificate number</div>
          <input style={field} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. PVT-ABC123" />
        </div>

        {expires && (
          <div>
            <div className="text-xs t3 mb-1">Expires on</div>
            <input style={field} type="date" value={expiresOn || ''} onChange={(e) => setExpiresOn(e.target.value)} />
            {/* Said out loud, because leaving it blank is the quiet failure this whole
                register exists to prevent: it reads as "not on file", not as "fine". */}
            <div className="text-xs t3 mt-1">
              Held with no expiry date recorded counts as not on file — the register cannot warn you about a date it does not have.
            </div>
          </div>
        )}

        <div>
          <div className="text-xs t3 mb-1">Who renews it</div>
          <select style={field} value={ownerUid} onChange={(e) => setOwnerUid(e.target.value)}>
            <option value="">Nobody assigned</option>
            {staffOptions.map((s) => <option key={s.uid} value={s.uid}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <div className="text-xs t3 mb-1">Renewal cost (KSh, optional)</div>
          <input style={field} type="number" min="0" value={renewalCost} onChange={(e) => setRenewalCost(e.target.value)} />
        </div>

        {err && <div className="text-sm" style={{ color: 'var(--red)' }}><Icon name="circle-exclamation" /> {err}</div>}
      </div>
    </Modal>
  );
}

/* ── The company register ─────────────────────────────────────────────────── */
function CompanyRegister({ staffOptions }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchCompanyCompliance()); setErr(null); }
    catch (e) { setErr(e.message || 'Could not load the register.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Card className="p-6 t3 text-sm">Loading the register…</Card>;
  if (err) return <Card className="p-6 text-sm" style={{ color: 'var(--red)' }}><Icon name="circle-exclamation" /> {err}</Card>;

  const c = data.compliance;
  // Blocking first, then by urgency: trading without a licence is a different order of
  // problem from a late annual return, and the list should say so before it is read.
  const order = { missing: 0, expired: 1, expiring: 2, valid: 3 };
  const rows = [...c.obligations].sort((a, b) =>
    Number(b.blocking) - Number(a.blocking) ||
    (order[a.status] ?? 9) - (order[b.status] ?? 9) ||
    a.label.localeCompare(b.label));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Obligations" value={c.obligations.length} icon="list-check" tone="blue" />
        <Stat label="Outstanding" value={c.outstanding} icon="triangle-exclamation"
          tone={c.outstanding ? 'red' : 'green'} sub={`${c.blockingOutstanding} block trading`} />
        <Stat label="Next deadline" value={c.next ? c.next.label : 'None'} icon="calendar-day"
          tone={c.next && c.next.daysLeft <= 30 ? 'amber' : 'pri'}
          sub={c.next ? `${fmtDate(c.next.expiresOn)} · ${whenLabel(c.next.daysLeft)}` : 'Nothing dated'} />
        <Stat label="Catalogue reviewed" value={c.reviewed} icon="scale-balanced" tone="pri" sub="Statutes last checked" />
      </div>

      {c.blockingOutstanding > 0 && (
        <Card className="p-4" style={{ borderLeft: '3px solid var(--red)' }}>
          <div className="font-bold t1 text-sm"><Icon name="triangle-exclamation" /> {c.blockingOutstanding} licence{c.blockingOutstanding === 1 ? '' : 's'} we trade on {c.blockingOutstanding === 1 ? 'is' : 'are'} not in order</div>
          <div className="text-xs t3 mt-1">
            These are the ones where trading without them is the offence, rather than an administrative lapse.
          </div>
        </Card>
      )}

      <Card className="p-5">
        <SectionHead icon="building-columns" title="Company register"
          sub="What we must hold to trade and to employ people" />
        <DataTable
          minWidth={760}
          columns={[
            { key: 'label', header: 'Obligation', render: (r) => (
              <div>
                <div className="font-semibold t1 flex items-center gap-2">
                  {r.label}
                  {r.blocking && <Pill tone="red">Blocks trading</Pill>}
                </div>
                <div className="text-xs t3">{r.authority}</div>
              </div>
            ) },
            { key: 'reference', header: 'Reference', render: (r) => <span className="num text-xs t2">{r.reference || '—'}</span> },
            { key: 'expiresOn', header: 'Expires', render: (r) => (
              r.expiresOn
                ? <div><div className="text-xs t2">{fmtDate(r.expiresOn)}</div><div className="text-xs t3">{whenLabel(r.daysLeft)}</div></div>
                : <span className="text-xs t3">{r.cadence === 'once' ? 'No expiry' : '—'}</span>
            ) },
            { key: 'ownerName', header: 'Owner', render: (r) => <span className="text-xs t2">{r.ownerName || <span className="t3">Nobody</span>}</span> },
            { key: 'status', header: 'Status', render: (r) => <Pill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Pill> },
            ...(data.canEdit ? [{ key: 'act', header: '', render: (r) => (
              <Btn kind="ghost" size="sm" icon="pen" onClick={() => setEditing(r)}>Edit</Btn>
            ) }] : []),
          ]}
          rows={rows}
          keyField="key"
          empty={<EmptyState icon="file-shield" title="Nothing recorded yet." />}
        />
        <div className="text-xs t3 mt-3">
          {/* The same caution the module carries. A register that looks authoritative and
              has not been checked by a lawyer is worse than one that admits it. */}
          <Icon name="circle-info" /> This catalogue encodes the ordinary Kenyan position as read by an engineer.
          It has not been reviewed by counsel — check anything you are about to rely on.
        </div>
      </Card>

      {editing && (
        <ObligationModal
          item={editing}
          staffOptions={staffOptions}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* ── The workforce ────────────────────────────────────────────────────────── */
function Workforce({ onOpenPerson }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('attention');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchComplianceOverview()); setErr(null); }
    catch (e) { setErr(e.message || 'Could not load the workforce.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.rows;
    return data.rows.filter((r) => r.status !== 'valid');
  }, [data, filter]);

  if (loading) return <Card className="p-6 t3 text-sm">Loading the workforce…</Card>;
  if (err) return <Card className="p-6 text-sm" style={{ color: 'var(--red)' }}><Icon name="circle-exclamation" /> {err}</Card>;

  const s = data.summary;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active staff" value={s.headcount} icon="users" tone="blue" />
        <Stat label="Files in order" value={s.clear} icon="circle-check" tone="green" />
        <Stat label="Expiring" value={s.expiring} icon="hourglass-half" tone={s.expiring ? 'amber' : 'pri'} />
        <Stat label="Missing or expired" value={s.atRisk} icon="triangle-exclamation" tone={s.atRisk ? 'red' : 'green'} />
      </div>

      <Card className="p-5">
        <SectionHead icon="folder-open" title="Employee document files"
          sub="What each person must have on file, and what is outstanding"
          action={<Seg value={filter} onChange={setFilter}
            options={['attention', 'all']} fmt={(o) => (o === 'attention' ? 'Needs attention' : 'Everyone')} />} />
        <DataTable
          minWidth={720}
          columns={[
            { key: 'name', header: 'Employee', render: (r) => (
              <div>
                <div className="font-semibold t1">{r.name}</div>
                <div className="text-xs t3">{r.title || r.department || '—'}</div>
              </div>
            ) },
            { key: 'outstanding', header: 'Outstanding', render: (r) => (
              r.outstanding
                ? <span className="text-xs" style={{ color: 'var(--red)' }}>{r.outstanding} required document{r.outstanding === 1 ? '' : 's'}</span>
                : <span className="text-xs t3">None</span>
            ) },
            { key: 'expiring', header: 'Expiring soon', render: (r) => (
              r.expiring.length
                ? <div className="text-xs t2">{r.expiring.map((x) => `${x.label} (${whenLabel(x.daysLeft)})`).join(', ')}</div>
                : <span className="text-xs t3">—</span>
            ) },
            { key: 'status', header: 'Status', render: (r) => <Pill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Pill> },
            { key: 'act', header: '', render: (r) => (
              <Btn kind="ghost" size="sm" icon="arrow-right" onClick={() => onOpenPerson && onOpenPerson(r.uid)}>Open</Btn>
            ) },
          ]}
          rows={rows}
          keyField="uid"
          pageSize={25}
          empty={<EmptyState icon="circle-check" title={filter === 'attention' ? 'Every file is in order.' : 'Nobody on staff yet.'} />}
        />
      </Card>
    </div>
  );
}

/* ── Statutory filings ────────────────────────────────────────────────────── */
function Filings() {
  const [period, setPeriod] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchStatutoryFilings(period)); setErr(null); }
    catch (e) { setErr(e.message || 'Could not load filings.'); setData(null); }
    finally { setLoading(false); }
  }, [period]);
  useEffect(() => { load(); }, [load]);

  const field = { padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg)', color: 'var(--t1)' };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHead icon="calendar-check" title="Statutory filings"
          sub="What a payroll month owes, to whom, and by when"
          action={<input style={field} type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />} />

        {loading && <div className="t3 text-sm">Loading…</div>}
        {err && <div className="text-sm" style={{ color: 'var(--red)' }}><Icon name="circle-exclamation" /> {err}</div>}

        {data && !data.hasRun && (
          /* Zeroes would be a lie here. "No approved payroll run" and "nothing to remit"
             are different statements, and only one of them means you can do nothing. */
          <Card className="p-4 mb-4" style={{ borderLeft: '3px solid var(--amber)' }}>
            <div className="text-sm t1"><Icon name="circle-info" /> No approved payroll run for this month.</div>
            <div className="text-xs t3 mt-1">
              The deadlines below are still real; the amounts are unknown until a run is approved.
            </div>
          </Card>
        )}

        {data && (
          <DataTable
            minWidth={640}
            columns={[
              { key: 'label', header: 'Filing', render: (r) => (
                <div>
                  <div className="font-semibold t1">{r.label}</div>
                  <div className="text-xs t3">{r.authority}</div>
                </div>
              ) },
              { key: 'amount', header: 'Amount', render: (r) => (
                data.hasRun ? <span className="num t2">{kes(r.amount)}</span> : <span className="text-xs t3">Unknown</span>
              ) },
              { key: 'dueOn', header: 'Due', render: (r) => (
                <div><div className="text-xs t2">{fmtDate(r.dueOn)}</div><div className="text-xs t3">{whenLabel(r.daysLeft)}</div></div>
              ) },
              { key: 'status', header: '', render: (r) => (
                <Pill tone={FILING_TONE[r.status]}>{r.status === 'overdue' ? 'Overdue' : r.status === 'due_soon' ? 'Due soon' : 'Upcoming'}</Pill>
              ) },
            ]}
            rows={data.filings}
            keyField="key"
            empty={<EmptyState icon="calendar" title="Pick a month." />}
          />
        )}

        <div className="text-xs t3 mt-3">
          <Icon name="circle-info" /> PAYE, NSSF and SHIF fall on the 9th of the following month.
          The Affordable Housing Levy runs on nine <em>working</em> days, so it usually lands later —
          the dates above are computed separately rather than assumed to coincide.
        </div>
      </Card>
    </div>
  );
}

/* ── Screen ───────────────────────────────────────────────────────────────── */
/**
 * The register. `only` narrows it to a single tab so a department can be given the part
 * of compliance that is ITS job, inside ITS own workspace — Finance the filings, People
 * the employee documents — instead of everyone being sent to a shared screen. Called with
 * no `only`, it shows every tab the caller is entitled to.
 *
 * `only` NARROWS AND NEVER GRANTS. It is intersected with what the caller may see, so
 * pointing a section at a tab cannot hand somebody a tab their department does not own,
 * and the callables behind each tab enforce the same rule again regardless.
 */
export function Compliance({ only = null }) {
  const { isAdmin, departments = [] } = useStaffClaims();
  const has = (d) => isAdmin || departments.includes(d);

  // The full record for one person, opened from a Workforce row. Mounted here rather
  // than navigated to, the same way the Directory does it — you arrive at an employee
  // by looking for them, and coming back should return you to the list you left.
  const [openUid, setOpenUid] = useState(null);

  // Only for the "who renews this" picker. A failure here must not take the register
  // down with it: an unassignable owner is a smaller problem than a blank screen.
  const [staffOptions, setStaffOptions] = useState([]);
  useEffect(() => {
    let live = true;
    fetchStaff()
      .then((list) => { if (live) setStaffOptions((list || []).map((e) => ({ uid: e.uid, name: e.name || e.email || e.uid }))); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  // Tabs mirror the SERVER gates. Hiding one is presentation only — the callables behind
  // each enforce the same rule, so a hidden tab is genuinely unreachable, not just unseen.
  const TAB_LABEL = { company: 'Company', workforce: 'Workforce', filings: 'Filings' };
  const allowed = [
    ...(has('legal') || has('finance') || has('people') ? ['company'] : []),
    ...(has('people') ? ['workforce'] : []),
    ...(has('finance') || has('legal') ? ['filings'] : []),
  ];
  // Intersected, not substituted: `only` can hide a tab, never reveal one.
  const tabs = only ? allowed.filter((t) => t === only) : allowed;
  const [tab, setTab] = useState(tabs.length ? tabs[0] : null);

  if (!tabs.length) {
    return (
      <Card className="p-6">
        <EmptyState icon="lock" title="Compliance is limited to Legal, Finance and People."
          sub="Ask an admin if you should have access." />
      </Card>
    );
  }

  const active = tabs.includes(tab) ? tab : tabs[0];

  if (openUid) return <EmployeeRecord uid={openUid} onBack={() => setOpenUid(null)} />;

  const TITLE = { company: 'Compliance register', workforce: 'Employee documents', filings: 'Statutory filings' };
  const SUB = {
    company: "Licences and registrations the company must hold to trade",
    workforce: "What must be on file for each member of staff",
    filings: "What a payroll month owes, to whom, and by when",
  };

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="file-shield"
        title={only ? TITLE[active] : 'Compliance'}
        sub={only ? SUB[active] : "The company's own paperwork, and every employee's"}
        action={tabs.length > 1 ? <Seg value={active} onChange={setTab} options={tabs} fmt={(o) => TAB_LABEL[o]} /> : null} />

      {active === 'company' && <CompanyRegister staffOptions={staffOptions} />}
      {active === 'workforce' && <Workforce onOpenPerson={setOpenUid} />}
      {active === 'filings' && <Filings />}
    </div>
  );
}

/* Named entry points, so a workspace can carry the slice of compliance that belongs to
   that department rather than pointing everyone at one shared screen. */
export const StatutoryFilings = () => <Compliance only="filings" />;
export const EmployeeDocuments = () => <Compliance only="workforce" />;

export default Compliance;
